// Loan Service
// Calculates credit score from transaction history and computes loan eligibility.

const prisma = require("../config/db");

/**
 * Calculate a credit score (0–100) for a user based on their confirmed transactions.
 * Mirrors the frontend loanScore() algorithm for consistency.
 *
 * Algorithm:
 *  - 40% weight: transaction volume (confirmed tx count, capped at 10)
 *  - 60% weight: inflow/outflow ratio (capped at 2x ratio)
 *
 * @param {string} userId
 * @returns {Promise<{ score, tier, maxLoan, transactions }>}
 */
async function calculateScore(userId) {
  const transactions = await prisma.transaction.findMany({
    where: { userId, status: "confirmed" },
    orderBy: { createdAt: "desc" },
  });

  const inflow = transactions
    .filter((t) => t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);

  const outflow = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  const score = Math.round(
    Math.min(transactions.length / 10, 1) * 40 +
      (inflow > 0 ? Math.min(inflow / (outflow + 1), 2) / 2 * 60 : 0)
  );

  const tier =
    score >= 70 ? "Gold" : score >= 50 ? "Silver" : score >= 30 ? "Bronze" : "Starter";

  const maxLoan =
    score >= 70 ? 50000 : score >= 50 ? 25000 : score >= 30 ? 10000 : 5000;

  return { score, tier, maxLoan, transactionCount: transactions.length };
}

/**
 * Record a loan application.
 * @param {string} userId
 * @param {number} amount
 * @returns {Promise<LoanApplication>}
 */
async function applyForLoan(userId, amount) {
  const { score, tier } = await calculateScore(userId);

  return prisma.loanApplication.create({
    data: {
      userId,
      amount,
      score,
      tier,
      status: score >= 30 ? "pending" : "rejected",
    },
  });
}

module.exports = { calculateScore, applyForLoan };
