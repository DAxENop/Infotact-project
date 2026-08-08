const crypto = require("crypto");

const traces = [];
const MAX_TRACES = 1000;

const traceMiddleware = (req, res, next) => {
  const traceId = crypto.randomUUID();
  const start = performance.now();

  req.traceId = traceId;

  res.on("finish", () => {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    const entry = {
      traceId,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs,
      tenant: req.tenant?.id,
      ip: req.ip || req.socket.remoteAddress || "",
      userAgent: req.headers["user-agent"] || "",
      timestamp: new Date().toISOString(),
    };

    if (traces.length >= MAX_TRACES) traces.shift();
    traces.push(entry);

    const parts = [
      `[TRACE] ${entry.timestamp}`,
      `id=${entry.traceId}`,
      `${entry.method} ${entry.path}`,
      `status=${entry.status}`,
      `duration=${entry.durationMs}ms`,
    ];
    if (entry.tenant) parts.push(`tenant=${entry.tenant}`);
    console.log(parts.join(" "));
  });

  next();
};

const getRecentTraces = (_req, res) => {
  res.json({ traces: traces.slice(-100), total: traces.length });
};

const getTraceStats = (_req, res) => {
  if (traces.length === 0) {
    res.json({ count: 0, p50: 0, p95: 0, p99: 0, avg: 0 });
    return;
  }
  const sorted = traces.map((t) => t.durationMs).sort((a, b) => a - b);
  const p = (n) => sorted[Math.floor(sorted.length * n)] || 0;
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  res.json({
    count: sorted.length,
    p50: Math.round(p(0.5) * 100) / 100,
    p95: Math.round(p(0.95) * 100) / 100,
    p99: Math.round(p(0.99) * 100) / 100,
    avg: Math.round(avg * 100) / 100,
  });
};

module.exports = { traceMiddleware, getRecentTraces, getTraceStats };
