// User Profile Routes

const express = require("express");
const router = express.Router();
const prisma = require("../config/db");
const { authenticate } = require("../middleware/auth");
const { validateChangePin } = require("../middleware/validate");
const { hashPin, verifyPin } = require("../services/authService");

router.use(authenticate);

/**
 * GET /api/users/me
 * Retrieves the current authenticated user profile, including balance.
 */
router.get("/me", async (req, res) => {
  // Return the user populated by the authenticate auth middleware
  res.json({ user: req.user });
});

/**
 * PUT /api/users/me/pin
 * Allow a logged-in user to change their PIN. Requires old PIN.
 */
router.put("/me/pin", validateChangePin, async (req, res) => {
  try {
    const { oldPin, newPin } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await verifyPin(oldPin, user.pinHash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect old PIN" });
    }

    const hashedPin = await hashPin(newPin);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { pinHash: hashedPin },
    });

    // Option: also revoke refresh tokens forcing re-login across devices.
    // For now simply confirm success.
    res.json({ success: true, message: "PIN updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
