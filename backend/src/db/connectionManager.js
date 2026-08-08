const mongoose = require("mongoose");
const { LRUCache } = require("lru-cache");
const connections = new Map();
const cache = new LRUCache({
  max: 50,
  ttl: 1000 * 60 * 10,
  updateAgeOnGet: true,
  dispose: (connection, tenantId) => {
    connections.delete(tenantId);
    if (connection && typeof connection.close === "function") {
      connection.close().catch(() => {});
    }
  },
});

const createConnection = async (tenantId,mongoUri,options = {}) => {
  if (connections.has(tenantId)) {
    return connections.get(tenantId);
  }
  const connection = mongoose.createConnection(mongoUri, {
    ...options,
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 1,
  });

  await connection.asPromise();
  connections.set(tenantId, connection);
  cache.set(tenantId, connection);
  return connection;
};

const getConnection = (tenantId) => {
  // ponytail: cache.get updates LRU age so dispose fires on eviction
  cache.get(tenantId);
  return connections.get(tenantId) || null;
};

const closeConnection = async (tenantId) => {
  const connection = connections.get(tenantId);
  if (!connection) {
    return;
  }
  await connection.close();
  connections.delete(tenantId);
  cache.delete(tenantId);
};

const withTenantConnection = async (tenantId,mongoUri,callback) => {
  let connection = getConnection(tenantId);

  if (!connection) {
    connection = await createConnection(tenantId, mongoUri);
  }
  const session = await connection.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await callback(connection, session);
    });

    await session.endSession();

    return result;
  } catch (error) {
    await session.endSession();
    throw error;
  }
};

module.exports = {
  createConnection,
  getConnection,
  closeConnection,
  withTenantConnection,
};