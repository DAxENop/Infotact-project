/**
 * LedgerGuard Query Performance Benchmark
 * Seeds 10,000 ledger entries and measures query latency.
 *
 * Usage: npm run bench (from backend/)
 * Requires: MongoDB running on localhost:27017
 */

const mongoose = require("mongoose");
const { LRUCache } = require("lru-cache");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ledgerguard_bench";
const TENANT = "bench_tenant";
const COUNT = 10_000;

const ledgerSchema = new mongoose.Schema({
  tenant: { type: String, required: true },
  entryId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["posted", "pending", "failed", "processing"], default: "posted" },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});
ledgerSchema.index({ tenant: 1, entryId: 1 }, { unique: true });

const measureAsync = async (label, fn) => {
  const start = performance.now();
  const result = await fn();
  const ms = Math.round((performance.now() - start) * 100) / 100;
  return { label, ms, result };
};

const measure = (label, fn) => {
  const start = performance.now();
  const result = fn();
  const ms = Math.round((performance.now() - start) * 100) / 100;
  return { label, ms, result };
};

const pad = (s, n) => String(s).padEnd(n);
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const run = async () => {
  console.log(bold("\n  LedgerGuard — Query Performance Benchmark\n"));
  console.log(`  Tenant: ${TENANT}`);
  console.log(`  Entries: ${COUNT.toLocaleString()}`);
  console.log(`  MongoDB: ${MONGO_URI}\n`);

  const conn = await mongoose.createConnection(MONGO_URI).asPromise();

  // Seed
  process.stdout.write("  Seeding entries... ");
  await conn.dropDatabase();
  const Ledger = conn.model("Ledger", ledgerSchema);
  await Ledger.createIndexes();
  const statuses = ["posted", "pending", "failed", "processing"];
  const bulk = Array.from({ length: COUNT }, (_, i) => ({
    tenant: TENANT,
    entryId: `BENCH-${String(i).padStart(6, "0")}`,
    amount: Math.round((Math.random() * 50000 + 10) * 100) / 100,
    status: statuses[i % 4],
    meta: { batch: Math.floor(i / 1000), source: "benchmark" },
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
  }));
  await Ledger.insertMany(bulk, { ordered: true });
  console.log("done.\n");

  // Benchmarks
  const results = [];

  results.push(await measureAsync("find+sort+limit(20)", () =>
    Ledger.find({ tenant: TENANT }).sort({ createdAt: -1 }).limit(20).lean()
  ));

  results.push(await measureAsync("countDocuments", () =>
    Ledger.countDocuments({ tenant: TENANT })
  ));

  results.push(await measureAsync("findOne(indexed)", () =>
    Ledger.findOne({ tenant: TENANT, entryId: "BENCH-05000" }).lean()
  ));

  results.push(await measureAsync("aggregate(summary)", () =>
    Ledger.aggregate([
      { $match: { tenant: TENANT } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 }, avg: { $avg: "$amount" } } },
    ])
  ));

  results.push(await measureAsync("aggregate(daily)", () =>
    Ledger.aggregate([
      { $match: { tenant: TENANT, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
  ));

  results.push(await measureAsync("aggregate(status)", () =>
    Ledger.aggregate([
      { $match: { tenant: TENANT } },
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ])
  ));

  // LRU cache benchmark
  const cache = new LRUCache({ max: 50, ttl: 1000 * 60 * 10 });
  for (let i = 0; i < 50; i++) cache.set(`tenant_${i}`, conn);
  results.push(measure("lru-cache.get", () => cache.get("tenant_25")));

  // Output
  console.log(bold("  Results\n"));
  console.log(`  ${pad("Operation", 24)} ${pad("Latency", 12)} Status`);
  console.log(`  ${"─".repeat(24)} ${"─".repeat(12)} ${"─".repeat(20)}`);

  for (const r of results) {
    const ok = r.ms < 5;
    const status = ok ? green("✅ sub-5ms") : dim("worker thread");
    console.log(`  ${pad(r.label, 24)} ${pad(r.ms + "ms", 12)} ${status}`);
  }

  const queries = results.filter((r) => !r.label.startsWith("lru"));
  const sub5 = queries.filter((r) => r.ms < 5);
  console.log(`\n  ${bold("Summary")}: ${sub5.length}/${queries.length} queries under 5ms\n`);

  await conn.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Benchmark failed:", err.message);
  process.exit(1);
});
