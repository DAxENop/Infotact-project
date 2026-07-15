const {createLedgerEntrySchema} = require("../validators/ledger.validator");
const {createLedgerEntry} = require("../services/ledger.service");
const create = async (req, res) => {
  try {const tenantId = req.tenant?.id;
    if (!tenantId) {
      return res.status(400).json({error: "Tenant missing"});
    }

    const {entryId,amount,meta} = req.body;

    const parsedData = createLedgerEntrySchema.safeParse({entryId,amount,meta});
    if (!parsedData.success) {
      return res.status(400).json({error: "Invalid request payload",issues: parsedData.error.flatten()});
    }

    const result = await createLedgerEntry({
      tenant: tenantId,
      entryId,
      amount,
      meta: parsedData.data.meta,
    });

    return res.status(result.statusCode).json(result.data);
  } catch (error) {

    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

module.exports = {
  create,
};