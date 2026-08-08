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
  const uri = mongoUri.includes("retryWrites") ? mongoUri : mongoUri + (mongoUri.includes("?") ? "&" : "?") + "retryWrites=false";
  const connection = mongoose.createConnection(uri, {
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
  // ponytail: skip session/transactions — standalone Mongo doesn't support them
  return callback(connection, null);
};

module.exports = {
  createConnection,
  getConnection,
  closeConnection,
  withTenantConnection,
};