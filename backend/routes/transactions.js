// Transaction Routes

const express = require("express");
const router = express.Router();
const prisma = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { validateSendTransaction, validateSyncTransactions } = require("../middleware/validate");
const { processTransaction, syncPendingTransactions } = require("../services/transactionService");

router.use(authenticate);

/**
 * GET /api/transactions
 * Retrieve all transactions for the current user, ordered by newest first.
 */
router.get("/", async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json(transactions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/transactions
 * Create a new transfer/transaction.
 */
router.post("/", validateSendTransaction, async (req, res) => {
  try {
    const data = req.body;
    
    // We optionally take an ID given by frontend (useful for caching offline txns)
    // but Prisma mostly relies on DB generate uuid() if not provided.
    
    const { transaction, newBalance } = await processTransaction(req.user.id, data);
    res.status(201).json({ transaction, balance: newBalance });
  } catch (err) {
    console.error(err.message);
    if (err.message === "Insufficient balance") {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/transactions/sync
 * Bulk sync array of offline pending transaction IDs to confirm them.
 */
router.post("/sync", validateSyncTransactions, async (req, res) => {
  try {
    const { transactionIds } = req.body;

    const count = await syncPendingTransactions(req.user.id, transactionIds);
    
    // Fetch updated balance to return to client
    const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { balance: true }});
    
    res.json({ success: true, count, balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/transactions/:id/status
 * Update the status of a specific transaction manually (e.g. from pending to failed)
 */
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["confirmed", "pending", "failed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Must belong to user
    const txn = await prisma.transaction.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!txn) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (txn.status === "confirmed") {
      return res.status(400).json({ error: "Cannot modify confirmed transactions" });
    }

    const updated = await prisma.transaction.update({
      where: { id: txn.id },
      data: { status }
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
