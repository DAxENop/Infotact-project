const mongoose = require("mongoose");

const getLedgerModel = (connection) => {
  if (connection.models.Ledger) {
    return connection.models.Ledger;
  }

  const ledgerSchema = new mongoose.Schema({
    tenant: {type: String,required: true,index: true},
    entryId: {type: String,required: true},
    amount: {type: Number,required: true},
    status: {type: String, default: "posted", enum: ["pending", "posted", "success", "failed"]},
    meta: {type: Object,default: {}},
    createdAt: {type: Date,default: Date.now},
  });

  ledgerSchema.index(
    {tenant: 1,entryId: 1},
    {unique: true,name: "uniq_tenant_entry"}
  );
  return connection.model("Ledger", ledgerSchema);
};

module.exports = { getLedgerModel };