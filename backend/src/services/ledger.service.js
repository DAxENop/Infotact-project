const { withTenantConnection } = require("../db/connectionManager");
const {getLedgerModel} = require("../models/ledger.model");
const {acquireLock,releaseLock} = require("./redisLock.service");
const getTenantDbUri = (tenantId) => {
    const safeTenantId = tenantId.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    return process.env[`DB_URI_${safeTenantId}`];
};
const createLedgerEntry = async ({tenant,entryId,amount,meta}) => {
  const lockKey = `ledger:${tenant}:${entryId}`;
  const { acquired, token } = await acquireLock(lockKey);
  if (!acquired) {
    return {success: false,statusCode: 409,data: {error: "Duplicate or in-progress"}};
  }

  try {
    const tenantDbUri = getTenantDbUri(tenant);
    if (!tenantDbUri) {
      await releaseLock(lockKey, token);
      return {success: false,statusCode: 500,data: {error: "Tenant DB is not configured"}};
    }
    const result = await withTenantConnection(tenant,tenantDbUri,
      async (connection, session) => {
        const Ledger = getLedgerModel(connection);
        const existingEntry = await Ledger.findOne({tenant,entryId}).session(session).exec();
        if (existingEntry) {
          return {status: "exists"};
        }
        const ledgerEntry = new Ledger({tenant,entryId,amount,meta});
        await ledgerEntry.save({session});
        return {status: "created",doc: ledgerEntry};
      }
    );
    await releaseLock(lockKey, token);

    return {success: true,statusCode: 200,data: result};
  } catch (error) {
    await releaseLock(lockKey, token);
    if (error.code === 11000) {
      return {success: true,statusCode: 200,data: {status: "exists"}};
    }
    throw error;
  }
};
module.exports = {
  createLedgerEntry,
};