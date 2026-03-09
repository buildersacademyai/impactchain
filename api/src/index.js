require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const helmet     = require("helmet");
const rateLimit  = require("express-rate-limit");

const passportRoutes = require("./routes/passport");
const disburseRoutes = require("./routes/disburse");
const oracleRoutes   = require("./routes/oracle");
const agencyRoutes   = require("./routes/agency");
const healthRoutes   = require("./routes/health");
const webhookRoutes  = require("./routes/webhook");
const adminRoutes    = require("./routes/admin");
const authRoutes     = require("./routes/auth");
const apiKeyRoutes   = require("./routes/apikeys");
const { adminMiddleware } = require("./middleware/admin");
const { errorHandler } = require("./middleware/errorHandler");
const { authMiddleware } = require("./middleware/auth");

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── SECURITY ────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "10kb" }));

// Rate limiting — 100 requests per 15 min per IP
app.use("/v1", rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Too many requests, please try again later." },
}));

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// Public routes
app.use("/health", healthRoutes);
app.use("/v1/auth", authRoutes);              // nonce + verify public; /me checks token internally

// Agency register is PUBLIC — no API key needed (this is how you get one)
const agencyRegisterHandler = require("./routes/agency").registerHandler;
app.post("/v1/agency/register", agencyRegisterHandler);

// Protected routes
app.use("/v1/passport",  authMiddleware, passportRoutes);
app.use("/v1/disburse",  authMiddleware, disburseRoutes);
app.use("/v1/oracle",    authMiddleware, oracleRoutes);
app.use("/v1/agency",    authMiddleware, agencyRoutes);
app.use("/v1/webhook",   authMiddleware, webhookRoutes);
app.use("/v1/apikeys",   authMiddleware, apiKeyRoutes);
app.use("/v1/admin",     authMiddleware, adminMiddleware, adminRoutes);

// ─── ERROR HANDLING ───────────────────────────────────────────────────────────
app.use(errorHandler);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found", path: req.path });
});

// ─── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 ImpactChain API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   Network:     ${process.env.CELO_RPC_URL?.includes("sepolia") ? "Celo Sepolia (testnet)" : "Celo Mainnet"}`);
  console.log(`   Health:      http://localhost:${PORT}/health\n`);
});

module.exports = app;