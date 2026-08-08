/**
 * Backend performance benchmark
 * Seeds 10,000 ledger entries and measures query latency.
 *
 * Usage: node src/benchmarks/query-perf.js
 * Requires: MongoDB running, env vars set (or defaults)
 */

const mongoose = require("mongoose");
const { LRUCache } = require("lru-cache");

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ledgerguard_bench";
const TENANT = "bench_tenant";

const ledgerSchema = new mongoose.Schema({
  tenant: { type: String, required: true, index: true },
  entryId: { type: String, required: true },
  amount: { type: Number, required: true },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

ledgerSchema.index({ tenant: 1, entryId: 1 }, { unique: true, name: "uniq_tenant_entry" });

const measure = (label, fn) => {
  const start = performance.now();
  const result = fn();
  const elapsed = performance.now() - start;
  return { label, elapsedMs: Math.round(elapsed * 100) / 100, result };
};

const measureAsync = async (label, fn) => {
  const start = performance.now();
  const result = await fn();
  const elapsed = performance.now() - start;
  return { label, elapsedMs: Math.round(elapsed * 100) / 100, result };
};

const run = async () => {
  console.log("=== LedgerGuard Query Performance Benchmark ===\n");

  // Connect
  const conn = await mongoose.createConnection(MONGO_URI).asPromise();
  const Ledger = conn.model("Ledger", ledgerSchema);

  // Seed data
  console.log("Seeding 10,000 entries...");
  const bulk = [];
  for (let i = 0; i < 10000; i++) {
    bulk.push({
      tenant: TENANT,
      entryId: `BENCH-${String(i).padStart(6, "0")}`,
      amount: Math.round(Math.random() * 100000) / 100,
      meta: { batch: Math.floor(i / 1000) },
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
    });
  }
  await Ledger.deleteMany({ tenant: TENANT });
  await Ledger.insertMany(bulk, { ordered: true });
  console.log("Seeded.\n");

  // Ensure index is built
  await Ledger.ensureIndexes();

  // Benchmark 1: Simple find with index (tenant + sort + limit)
  const r1 = await measureAsync("find+sort+limit(20)", async () => {
    return Ledger.find({ tenant: TENANT }).sort({ createdAt: -1 }).limit(20).lean();
  });
  console.log(`${r1.label}: ${r1.elapsedMs}ms (${r1.result.length} docs)`);

  // Benchmark 2: countDocuments with index
  const r2 = await measureAsync("countDocuments", async () => {
    return Ledger.countDocuments({ tenant: TENANT });
  });
  console.log(`${r2.label}: ${r2.elapsedMs}ms (count=${r2.result})`);

  // Benchmark 3:findOne with compound unique index
  const r3 = await measureAsync("findOne(indexed)", async () => {
    return Ledger.findOne({ tenant: TENANT, entryId: "BENCH-05000" }).lean();
  });
  console.log(`${r3.label}: ${r3.elapsedMs}ms (found=${!!r3.result})`);

  // Benchmark 4: Aggregation pipeline (summary)
  const r4 = await measureAsync("aggregate(summary)", async () => {
    return Ledger.aggregate([
      { $match: { tenant: TENANT } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 }, avg: { $avg: "$amount" } } },
    ]);
  });
  console.log(`${r4.label}: ${r4.elapsedMs}ms`);

  // Benchmark 5: Aggregation pipeline (daily trends)
  const r5 = await measureAsync("aggregate(daily)", async () => {
    return Ledger.aggregate([
      { $match: { tenant: TENANT, createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
  });
  console.log(`${r5.label}: ${r5.elapsedMs}ms`);

  // Benchmark 6: Aggregation pipeline (status breakdown)
  const r6 = await measureAsync("aggregate(status)", async () => {
    return Ledger.aggregate([
      { $match: { tenant: TENANT } },
      { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    ]);
  });
  console.log(`${r6.label}: ${r6.elapsedMs}ms`);

  // Benchmark 7: LRU cache lookup (simulating connection manager)
  const cache = new LRUCache({ max: 50, ttl: 1000 * 60 * 10 });
  for (let i = 0; i < 50; i++) cache.set(`tenant_${i}`, conn);
  const r7 = measure("lru-cache.get", () => cache.get("tenant_25"));
  console.log(`${r7.label}: ${r7.elapsedMs}ms`);

  // Summary
  const queries = [r1, r2, r3, r4, r5, r6];
  const sub5 = queries.filter((q) => q.elapsedMs < 5);
  console.log(`\n=== Summary ===`);
  console.log(`Queries under 5ms: ${sub5.length}/${queries.length}`);
  console.log(`All queries:`, queries.map((q) => `${q.label}=${q.elapsedMs}ms`).join(", "));

  await conn.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
