// Security Middleware Setup

const helmet = require("helmet");
const cors = require("cors");
const express = require("express");

function setupSecurity(app) {
  // Set secure HTTP headers
  app.use(helmet());

  // Enable CORS for frontend
  app.use(
    cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    })
  );

  // Parse JSON bodies with a strict size limit to prevent payload bloat
  app.use(express.json({ limit: "10kb" }));
}

module.exports = { setupSecurity };
