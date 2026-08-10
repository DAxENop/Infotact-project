const { withTenantConnection } = require("../db/connectionManager");
const { getLedgerModel } = require("../models/ledger");
const { acquireLock, releaseLock } = require("./redislock");
const { runInWorker } = require("./workerPool");

const getTenantDbUri = (tenantId) => {
  const safeTenantId = tenantId.toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  return process.env[`DB_URI_${safeTenantId}`];
};

const createLedgerEntry = async ({ tenant, entryId, amount, meta, status }) => {
  const lockKey = `ledger:${tenant}:${entryId}`;
  const { acquired, token } = await acquireLock(lockKey);
  if (!acquired) {
    return { success: false, statusCode: 409, data: { error: "Duplicate or in-progress" } };
  }

  try {
    const tenantDbUri = getTenantDbUri(tenant);
    if (!tenantDbUri) {
      await releaseLock(lockKey, token);
      return { success: false, statusCode: 500, data: { error: "Tenant DB is not configured" } };
    }
    const result = await withTenantConnection(tenant, tenantDbUri,
      async (connection) => {
        const Ledger = getLedgerModel(connection);
        const existingEntry = await Ledger.findOne({ tenant, entryId }).exec();
        if (existingEntry) {
          return { status: "exists" };
        }
        const ledgerEntry = new Ledger({ tenant, entryId, amount, meta, status });
        await ledgerEntry.save();
        return { status: "created", doc: ledgerEntry };
      }
    );
    await releaseLock(lockKey, token);

    return { success: true, statusCode: 200, data: result };
  } catch (error) {
    await releaseLock(lockKey, token);
    if (error.code === 11000) {
      return { success: true, statusCode: 200, data: { status: "exists" } };
    }
    throw error;
  }
};

const listLedgerEntries = async (tenantId, { page, limit }) => {
  const tenantDbUri = getTenantDbUri(tenantId);
  if (!tenantDbUri) {
    return { success: false, statusCode: 500, data: { error: "Tenant DB is not configured" } };
  }

  const result = await withTenantConnection(tenantId, tenantDbUri, async (connection) => {
    const Ledger = getLedgerModel(connection);
    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      Ledger.find({ tenant: tenantId }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Ledger.countDocuments({ tenant: tenantId }),
    ]);
    return { entries, total, page, limit, pages: Math.ceil(total / limit) };
  });

  return { success: true, statusCode: 200, data: result };
};

const getTenantStats = async (tenantId) => {
  const tenantDbUri = getTenantDbUri(tenantId);
  if (!tenantDbUri) {
    return { success: false, statusCode: 500, data: { error: "Tenant DB is not configured" } };
  }

  try {
    // Offload aggregation to worker thread to keep main event loop unblocked
    const [summary, byDay, byStatus] = await Promise.all([
      runInWorker({
        uri: tenantDbUri,
        tenant: tenantId,
        pipeline: [
          { $match: { tenant: tenantId } },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 }, avg: { $avg: "$amount" } } },
        ],
      }),
      runInWorker({
        uri: tenantDbUri,
        tenant: tenantId,
        pipeline: [
          { $match: { tenant: tenantId, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
      }),
      runInWorker({
        uri: tenantDbUri,
        tenant: tenantId,
        pipeline: [
          { $match: { tenant: tenantId } },
          { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
        ],
      }),
    ]);

    return {
      success: true,
      statusCode: 200,
      data: {
        summary: summary[0] || { total: 0, count: 0, avg: 0 },
        byDay,
        byStatus,
      },
    };
  } catch (error) {
    // Fallback: run on main thread if worker fails
    const result = await withTenantConnection(tenantId, tenantDbUri, async (connection) => {
      const Ledger = getLedgerModel(connection);
      const [summary, byDay, byStatus] = await Promise.all([
        Ledger.aggregate([
          { $match: { tenant: tenantId } },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 }, avg: { $avg: "$amount" } } },
        ]),
        Ledger.aggregate([
          { $match: { tenant: tenantId, createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$amount" }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Ledger.aggregate([
          { $match: { tenant: tenantId } },
          { $group: { _id: "$status", count: { $sum: 1 }, total: { $sum: "$amount" } } },
        ]),
      ]);
      return { summary: summary[0] || { total: 0, count: 0, avg: 0 }, byDay, byStatus };
    });
    return { success: true, statusCode: 200, data: result };
  }
};

const updateEntryStatus = async (tenantId, entryId, newStatus) => {
  const validStatuses = ["pending", "posted", "failed"];
  if (!validStatuses.includes(newStatus)) {
    return { success: false, statusCode: 400, data: { error: "Invalid status" } };
  }

  const tenantDbUri = getTenantDbUri(tenantId);
  if (!tenantDbUri) {
    return { success: false, statusCode: 500, data: { error: "Tenant DB is not configured" } };
  }

  const result = await withTenantConnection(tenantId, tenantDbUri, async (connection) => {
    const Ledger = getLedgerModel(connection);
    const doc = await Ledger.findOneAndUpdate(
      { tenant: tenantId, entryId },
      { status: newStatus },
      { new: true }
    ).lean();
    if (!doc) return { error: "Entry not found" };
    return { doc };
  });

  if (result.error) {
    return { success: false, statusCode: 404, data: { error: result.error } };
  }
  return { success: true, statusCode: 200, data: result };
};

module.exports = { createLedgerEntry, listLedgerEntries, getTenantStats, updateEntryStatus };
