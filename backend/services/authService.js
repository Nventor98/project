// Authentication Service
// Handles PIN hashing, JWT generation, and token verification.

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const prisma = require("../config/db");

const ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

/**
 * Hash a plaintext PIN using bcrypt.
 * @param {string} pin
 * @returns {Promise<string>} hashed PIN
 */
async function hashPin(pin) {
  return bcrypt.hash(pin, ROUNDS);
}

/**
 * Compare a plaintext PIN against a bcrypt hash.
 * @param {string} pin
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPin(pin, hash) {
  return bcrypt.compare(pin, hash);
}

/**
 * Generate an access token (short-lived) for a user.
 * @param {string} userId
 * @returns {string} signed JWT
 */
function generateAccessToken(userId) {
  return jwt.sign({ sub: userId, type: "access" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Generate a refresh token + persist it in the DB.
 * @param {string} userId
 * @returns {Promise<string>} the raw refresh token string
 */
async function generateRefreshToken(userId) {
  const token = uuidv4();
  const expiresAt = new Date();
  // parse "7d" → days
  const days = parseInt(JWT_REFRESH_EXPIRES_IN, 10) || 7;
  expiresAt.setDate(expiresAt.getDate() + days);

  await prisma.refreshToken.create({ data: { userId, token, expiresAt } });
  return token;
}

/**
 * Generate both tokens for a user.
 * @param {string} userId
 */
async function generateTokens(userId) {
  const accessToken = generateAccessToken(userId);
  const refreshToken = await generateRefreshToken(userId);
  return { accessToken, refreshToken };
}

/**
 * Verify an access JWT and return the payload.
 * @param {string} token
 */
function verifyAccessToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Rotate a refresh token: delete old, issue new.
 * Returns new tokens or throws if the old token is invalid/expired.
 * @param {string} oldToken
 */
async function rotateRefreshToken(oldToken) {
  const record = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
  });

  if (!record) throw new Error("Invalid refresh token");
  if (record.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: record.id } });
    throw new Error("Refresh token expired");
  }

  // Delete old token
  await prisma.refreshToken.delete({ where: { id: record.id } });

  // Issue new pair
  return generateTokens(record.userId);
}

/**
 * Revoke a specific refresh token (logout).
 * @param {string} token
 */
async function revokeRefreshToken(token) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

module.exports = {
  hashPin,
  verifyPin,
  generateTokens,
  verifyAccessToken,
  rotateRefreshToken,
  revokeRefreshToken,
};
