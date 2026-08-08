const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
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
    const uri = MONGO_URI.includes("retryWrites") ? MONGO_URI : MONGO_URI + (MONGO_URI.includes("?") ? "&" : "?") + "retryWrites=false";
    await mongoose.connect(uri);
    console.log(`[DB] Connected to MongoDB: ${MONGO_URI}`);
  } catch (err) {
    console.error("[DB] MongoDB connection failed:", err.message);
    console.warn("[DB] Server running without main DB (auth disabled until connected)");
  }
  console.log(`[SERVER] Running on port ${config.PORT}`);
});

// Socket.io setup
const io = new Server(server, {
  cors: { origin: config.CORS_ORIGIN, methods: ["GET", "POST"] },
});

// Tenant namespace: clients join room = tenantId
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  socket.on("join", (tenantId) => {
    if (tenantId && /^[A-Za-z0-9_-]{2,64}$/.test(tenantId)) {
      socket.join(tenantId);
      console.log(`[WS] ${socket.id} joined room: ${tenantId}`);
    }
  });
  socket.on("disconnect", () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Expose io for controllers
app.set("io", io);

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n[SHUTDOWN] ${signal} received, closing...`);
  io.close();
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
