const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const mongoose = require("mongoose");
const config = require("./config");
const tenantJwt = require("./middleware/tenantJwt");
const authRoutes = require("./routes/auth");
const ledgerRoutes = require("./routes/ledger");
const redis = require("./config/redis");

const app = express();

const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  limit: config.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(limiter);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/ledger", tenantJwt, ledgerRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("[APP] Unhandled error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ledgerguard_main";

const server = app.listen(config.PORT, async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[DB] Connected to MongoDB: ${MONGO_URI}`);
  } catch (err) {
    console.error("[DB] MongoDB connection failed:", err.message);
    console.warn("[DB] Server running without main DB (auth disabled until connected)");
  }
  console.log(`[SERVER] Running on port ${config.PORT}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n[SHUTDOWN] ${signal} received, closing...`);
  server.close(async () => {
    await mongoose.disconnect().catch(() => {});
    redis.disconnect();
    console.log("[SHUTDOWN] Clean exit");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = app;
