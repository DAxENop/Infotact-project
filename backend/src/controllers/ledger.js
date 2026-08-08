const { createLedgerEntrySchema } = require("../validators/ledger.validator");
const { createLedgerEntry, listLedgerEntries, getTenantStats } = require("../services/ledger.service");

const create = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant missing" });
    }

    const { entryId, amount, meta } = req.body;
    const parsedData = createLedgerEntrySchema.safeParse({ entryId, amount, meta });
    if (!parsedData.success) {
      return res.status(400).json({ error: "Invalid request payload", issues: parsedData.error.flatten() });
    }

    const result = await createLedgerEntry({
      tenant: tenantId,
      entryId,
      amount,
      meta: parsedData.data.meta,
    });

    // Emit real-time event to tenant room
    if (result.success && result.data?.doc) {
      const io = req.app.get("io");
      if (io) {
        io.to(tenantId).emit("ledger:created", result.data.doc);
      }
    }

    return res.status(result.statusCode).json(result.data);
  } catch (error) {
    console.error("[LEDGER] Create error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const list = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant missing" });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    const result = await listLedgerEntries(tenantId, { page, limit });
    return res.status(result.statusCode).json(result.data);
  } catch (error) {
    console.error("[LEDGER] List error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const stats = async (req, res) => {
  try {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant missing" });
    }

    const result = await getTenantStats(tenantId);
    return res.status(result.statusCode).json(result.data);
  } catch (error) {
    console.error("[LEDGER] Stats error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { create, list, stats };
