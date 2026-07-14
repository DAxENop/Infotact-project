const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { z } = require('zod');
const Redis = require('ioredis');
const redis = new Redis(require('../config').REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});
const { withTenantConnection } = require('../db/connectionManager');

const createLedgerEntrySchema = z.object({
  entryId: z
    .string()
    .min(6)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  amount: z.coerce.number().positive(),
  meta: z.record(z.unknown()).optional().default({}),
});

function getLedgerModel(conn) {
  const schema = new conn.Schema({
    tenant: { type: String, required: true, index: true },
    entryId: { type: String, required: true },
    amount: { type: Number, required: true },
    meta: { type: Object, default: {} },
    createdAt: { type: Date, default: Date.now },
  });

  schema.index({ tenant: 1, entryId: 1 }, { unique: true, name: 'uniq_tenant_entry' });

  return conn.models.Ledger || conn.model('Ledger', schema);
}

function tenantEnvKey(tenantId) {
  const safe = tenantId.toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return `DB_URI_${safe}`;
}

async function safeUnlock(lockKey, token) {
  const lua = `
    if redis.call('GET', KEYS[1]) == ARGV[1] then
      return redis.call('DEL', KEYS[1])
    end
    return 0
  `;

  await redis.eval(lua, 1, lockKey, token);
}

async function ensureRedisConnected() {
  if (redis.status === 'ready' || redis.status === 'connecting') return;
  await redis.connect();
}

router.post('/entries', async (req, res) => {
  const tenant = req.tenant && req.tenant.id;
  if (!tenant) return res.status(400).json({ error: 'tenant missing' });

  const parsed = createLedgerEntrySchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      issues: parsed.error.flatten(),
    });
  }

  const { entryId, amount, meta } = parsed.data;

  const lockKey = `ledger:${tenant}:${entryId}`;
  const lockToken = crypto.randomUUID();

  await ensureRedisConnected();

  const lock = await redis.set(lockKey, lockToken, 'PX', 30_000, 'NX');
  if (!lock) return res.status(409).json({ error: 'Duplicate or in-progress' });

  try {
    const tenantDbUri = process.env[tenantEnvKey(tenant)];
    if (!tenantDbUri) return res.status(500).json({ error: 'Tenant DB is not configured' });

    const result = await withTenantConnection(tenant, tenantDbUri, async (conn, session) => {
      const Ledger = getLedgerModel(conn);
      const exists = await Ledger.findOne({ tenant, entryId }).session(session).exec();
      if (exists) return { status: 'exists' };

      const doc = new Ledger({ tenant, entryId, amount, meta });
      await doc.save({ session });

      return { status: 'created', doc };
    });

    return res.json(result);
  } catch (err) {
    if (err && err.code === 11000) {
      return res.json({ status: 'exists' });
    }

    console.error(err);
    return res.status(500).json({ error: 'internal' });
  } finally {
    await safeUnlock(lockKey, lockToken);
  }
});

module.exports = router;
