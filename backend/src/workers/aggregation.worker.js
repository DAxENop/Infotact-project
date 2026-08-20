/**
 * Worker thread for offloading heavy aggregation queries.
 * Single connection, multiple pipelines — no connection churn.
 */

const { parentPort } = require("worker_threads");
const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema({
  tenant: { type: String, required: true },
  entryId: { type: String, required: true },
  amount: { type: Number, required: true },
  meta: { type: Object, default: {} },
  status: { type: String, default: "posted" },
  createdAt: { type: Date, default: Date.now },
});

parentPort.on("message", async (msg) => {
  const { type, payload } = msg;

  try {
    if (type === "aggregate-multi") {
      const { uri, pipelines, tenant } = payload;
      const connUri = uri.includes("retryWrites") ? uri : uri + (uri.includes("?") ? "&" : "?") + "retryWrites=false";

      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(connUri, { bufferCommands: false, maxPoolSize: 2 });
      }

      const connection = mongoose.connection;
      const Ledger = connection.models.Ledger || connection.model("Ledger", ledgerSchema);

      const results = await Promise.all(
        pipelines.map((pipeline) => Ledger.aggregate(pipeline))
      );

      parentPort.postMessage({ type: "result", data: results });
    }

    if (type === "aggregate") {
      const { uri, pipeline, tenant } = payload;
      const connUri = uri.includes("retryWrites") ? uri : uri + (uri.includes("?") ? "&" : "?") + "retryWrites=false";

      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(connUri, { bufferCommands: false, maxPoolSize: 2 });
      }

      const connection = mongoose.connection;
      const Ledger = connection.models.Ledger || connection.model("Ledger", ledgerSchema);

      const result = await Ledger.aggregate(pipeline);
      parentPort.postMessage({ type: "result", data: result });
    }
  } catch (error) {
    parentPort.postMessage({ type: "error", error: error.message });
  }
});
