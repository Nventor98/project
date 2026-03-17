// JWT Auth Middleware

const { verifyAccessToken } = require("../services/authService");
const prisma = require("../config/db");

/**
 * Middleware to verify a JWT in the "Authorization: Bearer <token>" header.
 * Attaches the authenticated user to `req.user`.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    
    // Optional: Check if user actually still exists in DB
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, phone: true, name: true, accountNo: true, balance: true },
    });

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", expired: true });
    }
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { authenticate };
