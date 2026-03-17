// Server Entry Point
require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const { setupSecurity } = require("./middleware/security");
const { apiLimiter } = require("./middleware/rateLimiter");

const app = express();

// --- Middleware Setup ---
setupSecurity(app);

// Request validation error handling mapping (done in express json intercept)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({ error: "Bad JSON payload" });
  }
  next();
});

// Logging
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

// Global API rate limiting
app.use("/api", apiLimiter);

// --- Routes ---
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const transactionRoutes = require("./routes/transactions");
const loanRoutes = require("./routes/loans");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/loans", loanRoutes);

// Healthcheck
app.get("/api/health", (req, res) => res.json({ status: "up" }));

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// --- Start Server ---
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
