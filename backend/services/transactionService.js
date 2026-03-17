// Transaction Service
// Handles atomic transaction creation and balance updates.

const prisma = require("../config/db");

/**
 * Process a transaction atomically:
 * 1. Validate sufficient balance for debits
 * 2. Create transaction record
 * 3. Update user balance
 * All in a Prisma interactive transaction for safety.
 *
 * @param {string} userId
 * @param {{ type, party, amount, note, status, channel }} data
 * @returns {Promise<{ transaction, newBalance }>}
 */
async function processTransaction(userId, data) {
  const { type, party, amount, note = "", status = "confirmed", channel = "online" } = data;

  if (!["credit", "debit"].includes(type)) {
    throw new Error("Invalid transaction type");
  }
  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Fetch user with current balance (locked for update via tx)
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    if (type === "debit" && status === "confirmed" && user.balance < amount) {
      throw new Error("Insufficient balance");
    }

    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().slice(0, 5);

    const transaction = await tx.transaction.create({
      data: {
        userId,
        type,
        party,
        amount,
        note,
        status,
        channel,
        date,
        time,
      },
    });

    // Only update balance for confirmed transactions
    if (status === "confirmed") {
      const newBalance =
        type === "credit" ? user.balance + amount : user.balance - amount;
      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });
      return { transaction, newBalance };
    }

    return { transaction, newBalance: user.balance };
  });

  return result;
}

/**
 * Bulk-sync pending transactions for a user.
 * Each pending tx is confirmed and balance adjusted.
 *
 * @param {string} userId
 * @param {string[]} transactionIds  Array of pending transaction IDs to confirm
 * @returns {Promise<number>} count of synced transactions
 */
async function syncPendingTransactions(userId, transactionIds) {
  let synced = 0;

  for (const id of transactionIds) {
    await prisma.$transaction(async (tx) => {
      const txnRecord = await tx.transaction.findFirst({
        where: { id, userId, status: "pending" },
      });
      if (!txnRecord) return;

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) return;

      if (txnRecord.type === "debit" && user.balance < txnRecord.amount) return;

      await tx.transaction.update({
        where: { id },
        data: { status: "confirmed" },
      });

      const newBalance =
        txnRecord.type === "credit"
          ? user.balance + txnRecord.amount
          : user.balance - txnRecord.amount;

      await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });

      synced++;
    });
  }

  return synced;
}

module.exports = { processTransaction, syncPendingTransactions };
