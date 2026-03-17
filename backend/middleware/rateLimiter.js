// Rate Limiter Middleware

const rateLimit = require("express-rate-limit");

// Strictly limit login attempts to prevent PIN brute-forcing
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 login requests per `window`
  message: { error: "Too many login attempts, please try again after 5 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 API requests per `window`
  message: { error: "Too many requests from this IP, please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { loginLimiter, apiLimiter };
