/**
 * LedgerGuard Demo Data Seeder
 * Populates the test tenant DB with realistic billing entries.
 *
 * Usage: npm run seed (from backend/)
 * Requires: MongoDB running on localhost:27017
 */

const mongoose = require("mongoose");

const MONGO_URI = process.env.DB_URI_TEST_TENANT || "mongodb://127.0.0.1:27017/ledgerguard_test_tenant";
const TENANT = "test-tenant";
const COUNT = parseInt(process.env.SEED_COUNT || "200", 10);

const ledgerSchema = new mongoose.Schema({
  tenant: { type: String, required: true },
  entryId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ["posted", "pending", "failed", "processing"], default: "posted" },
  meta: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});
ledgerSchema.index({ tenant: 1, entryId: 1 }, { unique: true });

const prefixes = ["INV", "BILL", "PAY", "TXN", "REC", "ORD"];
const companies = ["Acme Corp", "Globex Inc", "Initech", "Umbrella Co", "Stark Industries", "Wayne Enterprises"];
const statuses = ["posted", "posted", "posted", "pending", "pending", "failed", "processing"];

const randomAmount = () => Math.round((Math.random() * 25000 + 25) * 100) / 100;
const randomDate = () => {
  const daysAgo = Math.floor(Math.random() * 90);
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 86400000);
};

const run = async () => {
  console.log(`\n  LedgerGuard — Demo Data Seeder\n`);
  console.log(`  Tenant:  ${TENANT}`);
  console.log(`  Entries: ${COUNT}`);
  console.log(`  DB:      ${MONGO_URI}\n`);

  const conn = await mongoose.createConnection(MONGO_URI).asPromise();
  const Ledger = conn.model("Ledger", ledgerSchema);

  await Ledger.deleteMany({ tenant: TENANT });

  const entries = Array.from({ length: COUNT }, (_, i) => {
    const prefix = prefixes[i % prefixes.length];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const amount = randomAmount();

    return {
      tenant: TENANT,
      entryId: `${prefix}-2026-${String(i + 1).padStart(4, "0")}`,
      amount,
      status,
      meta: { company, description: `${status === "failed" ? "Failed payment" : "Billing cycle"} — ${company}` },
      createdAt: randomDate(),
    };
  });

  process.stdout.write("  Inserting entries... ");
  await Ledger.insertMany(entries, { ordered: true });
  console.log("done.\n");

  // Summary
  const stats = await Ledger.aggregate([
    { $match: { tenant: TENANT } },
    { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
    { $sort: { _id: 1 } },
  ]);

  console.log("  Status Breakdown:");
  for (const s of stats) {
    console.log(`    ${s._id.padEnd(12)} ${String(s.count).padStart(4)} entries  $${s.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
  }

  const total = stats.reduce((a, s) => a + s.total, 0);
  console.log(`    ${"─".repeat(40)}`);
  console.log(`    ${"Total".padEnd(12)} ${String(COUNT).padStart(4)} entries  $${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n`);

  await conn.close();
  process.exit(0);
};

run().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
