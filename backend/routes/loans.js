// Loan Routes

const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { validateLoanApplication } = require("../middleware/validate");
const { calculateScore, applyForLoan } = require("../services/loanService");

router.use(authenticate);

/**
 * GET /api/loans/score
 * Calculates and returns the user's credit score profile.
 */
router.get("/score", async (req, res) => {
  try {
    const profile = await calculateScore(req.user.id);
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/loans/apply
 * Submits a new loan application.
 */
router.post("/apply", validateLoanApplication, async (req, res) => {
  try {
    const { amount } = req.body;
    
    // Quick validation check vs max loan allowable
    const profile = await calculateScore(req.user.id);
    if (amount > profile.maxLoan) {
      return res.status(400).json({ error: `Amount exceeds maximum eligible limit of ${profile.maxLoan}` });
    }

    const application = await applyForLoan(req.user.id, amount);
    res.status(201).json(application);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
