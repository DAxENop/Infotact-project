const express = require('express');
const router = express.Router();
const Redis = require('ioredis');
const redis = new Redis(require('../config').REDIS_URL);
const { withTenantConnection } = require('../db/connectionManager');

// Simple Ledger schema factory
function getLedgerModel(conn) {
  const schema = new conn.Schema({
    tenant: String,
    entryId: { type: String, index: true },
    amount: Number,
    meta: Object,
    createdAt: { type: Date, default: Date.now },
  });
  return conn.models.Ledger || conn.model('Ledger', schema);
}

// idempotent ledger entry
router.post('/entries', async (req, res) => {
  const tenant = req.tenant && req.tenant.id;
  if (!tenant) return res.status(400).json({ error: 'tenant missing' });

  const { entryId, amount, meta } = req.body || {};
  if (!entryId) return res.status(400).json({ error: 'entryId required' });

  const lockKey = `ledger:${tenant}:${entryId}`;
  const lock = await redis.set(lockKey, '1', 'PX', 30_000, 'NX');
  if (!lock) return res.status(409).json({ error: 'Duplicate or in-progress' });

  try {
    const tenantDbUri = process.env[`DB_URI_${tenant}`] || process.env.MASTER_DB_URI;
    if (!tenantDbUri) return res.status(500).json({ error: 'No DB configured for tenant' });

    const result = await withTenantConnection(tenant, tenantDbUri, async (conn, session) => {
      const Ledger = getLedgerModel(conn);
      // check existing
      const exists = await Ledger.findOne({ entryId }).session(session).exec();
      if (exists) return { status: 'exists' };
      const doc = new Ledger({ tenant, entryId, amount, meta });
      await doc.save({ session });
      return { status: 'created', doc };
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'internal' });
  } finally {
    await redis.del(lockKey);
  }
});

module.exports = router;
