const mongoose = require('mongoose');
const LRU = require('lru-cache');

// Map tenantId -> mongoose.Connection
const connections = new Map();

// LRU cache to evict idle connections
const cache = new LRU({
  max: 50,
  ttl: 1000 * 60 * 10, // 10 minutes
  dispose: (tenantId, conn) => {
    if (conn && conn.close) conn.close().catch(() => {});
  },
});

async function createConnection(tenantId, mongoUri, opts = {}) {
  if (connections.has(tenantId)) return connections.get(tenantId);
  const conn = await mongoose.createConnection(mongoUri, { ...opts, bufferCommands: false });
  connections.set(tenantId, conn);
  cache.set(tenantId, conn);
  return conn;
}

function getConnection(tenantId) {
  const c = connections.get(tenantId);
  if (c) cache.get(tenantId); // touch
  return c;
}

async function closeConnection(tenantId) {
  const c = connections.get(tenantId);
  if (!c) return;
  await c.close();
  connections.delete(tenantId);
  cache.delete(tenantId);
}

async function withTenantConnection(tenantId, mongoUri, fn) {
  let conn = getConnection(tenantId);
  if (!conn) conn = await createConnection(tenantId, mongoUri);

  // Provide a session-bound transaction helper
  const session = await conn.startSession();
  let res;
  try {
    await session.withTransaction(async () => {
      res = await fn(conn, session);
    });
  } finally {
    await session.endSession();
  }
  return res;
}

module.exports = { createConnection, getConnection, closeConnection, withTenantConnection };
