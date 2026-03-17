// Auth Routes

const express = require("express");
const router = express.Router();
const prisma = require("../config/db");
const { validateLogin, validateRegister, validateRequestReset, validateResetPin } = require("../middleware/validate");
const { loginLimiter } = require("../middleware/rateLimiter");
const { hashPin, verifyPin, generateTokens, rotateRefreshToken, revokeRefreshToken } = require("../services/authService");

// Mock OTP store for demo purposes (In-memory)
const otpStore = new Map();

/**
 * POST /api/auth/register
 * Create a new user account.
 */
router.post("/register", validateRegister, async (req, res) => {
  try {
    const { name, phone, pin } = req.body;
    const normalizedPhone = phone.replace(/\D/g, "");

    const existing = await prisma.user.findUnique({ where: { phone: normalizedPhone } });
    if (existing) return res.status(400).json({ error: "Phone number already registered" });

    const pinHash = await hashPin(pin);
    
    // Generate a 10-digit account number (00 + random 8 digits)
    let accountNo;
    while (true) {
      accountNo = "00" + Math.floor(10000000 + Math.random() * 90000000);
      const collision = await prisma.user.findUnique({ where: { accountNo } });
      if (!collision) break;
    }

    const user = await prisma.user.create({
      data: {
        name,
        phone: normalizedPhone,
        pinHash,
        accountNo,
        balance: 5000.0, // Welcome bonus ₦5k
      },
    });

    const { accessToken, refreshToken } = await generateTokens(user.id);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        accountNo: user.accountNo,
        balance: user.balance,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/request-reset
 * Simulated OTP generation for forgotten PIN recovery.
 */
router.post("/request-reset", validateRequestReset, async (req, res) => {
  try {
    const { phone } = req.body;
    const normalizedPhone = phone.replace(/\D/g, "");

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: "0" + normalizedPhone.slice(-10) }
        ]
      }
    });

    if (!user) return res.status(404).json({ error: "Account not found" });

    // Generate simulated code
    const otp = "123456"; 
    otpStore.set(normalizedPhone, otp);

    // In a real app, send actual OTP via SMS here
    res.json({ message: "Verification code sent to your phone" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/reset-pin
 * Verify OTP and update user's security PIN.
 */
router.post("/reset-pin", validateResetPin, async (req, res) => {
  try {
    const { phone, otp, newPin } = req.body;
    const normalizedPhone = phone.replace(/\D/g, "");

    if (otpStore.get(normalizedPhone) !== otp) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    // Find user using flexible matching (same as login)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          { phone: "0" + normalizedPhone.slice(-10) }
        ]
      }
    });

    if (!user) return res.status(404).json({ error: "Account not found" });

    const pinHash = await hashPin(newPin);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash }
    });

    otpStore.delete(normalizedPhone);
    res.json({ message: "PIN updated successfully. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/login
 * Verify user's phone + PIN and issue auth tokens.
 */
router.post("/login", loginLimiter, validateLogin, async (req, res) => {
  try {
    const { phone, pin } = req.body;

    // Normalizing phone logic to match frontend's relaxed login handling
    const normalizedPhone = phone.replace(/\D/g, "");
    
    // Find exact or sliced last 10 digits
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          // A bit hacky but matches the frontend logic: "0" + c.slice(-10)
          { phone: "0" + normalizedPhone.slice(-10) }
        ]
      }
    });

    if (!user) {
      // Return ambiguous response for security
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPin = await verifyPin(pin, user.pinHash);
    if (!validPin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { accessToken, refreshToken } = await generateTokens(user.id);

    // Filter out pinHash from payload
    const userProfile = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      accountNo: user.accountNo,
      balance: user.balance
    };

    res.json({ accessToken, refreshToken, user: userProfile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/refresh
 * Allows frontend to exchange a valid refresh token for a new access token.
 */
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "Refresh token required" });
    }

    const tokens = await rotateRefreshToken(refreshToken);
    res.json(tokens);
  } catch (err) {
    if (err.message.includes("Invalid") || err.message.includes("expired")) {
      return res.status(401).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/logout
 * Revoke the passed refresh token.
 */
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
