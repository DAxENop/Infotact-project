/**
 * Worker thread for offloading heavy aggregation queries.
 * Keeps the main event loop unblocked for sub-5ms response times.
 *
 * Usage: called by ledger.service.js via parentPort.postMessage()
 */

const { parentPort } = require("worker_threads");

parentPort.on("message", async (msg) => {
  const { type, payload } = msg;

  try {
    if (type === "aggregate") {
      // Dynamically require mongoose inside worker to avoid connection sharing issues
      const mongoose = require("mongoose");
      const { uri, pipeline, tenant } = payload;

      // Connect worker to the specific tenant DB
      if (mongoose.connection.readyState !== 1) {
        const connUri = uri.includes("retryWrites") ? uri : uri + (uri.includes("?") ? "&" : "?") + "retryWrites=false";
        await mongoose.connect(connUri, { bufferCommands: false, maxPoolSize: 2 });
      }

      const connection = mongoose.connection;

      // Register model if not exists
      const ledgerSchema = new mongoose.Schema({
        tenant: { type: String, required: true },
        entryId: { type: String, required: true },
        amount: { type: Number, required: true },
        meta: { type: Object, default: {} },
        status: { type: String, default: "posted" },
        createdAt: { type: Date, default: Date.now },
      });

      let Ledger;
      if (connection.models.Ledger) {
        Ledger = connection.models.Ledger;
      } else {
        Ledger = connection.model("Ledger", ledgerSchema);
      }

      const result = await Ledger.aggregate(pipeline);
      parentPort.postMessage({ type: "result", data: result });
    }
  } catch (error) {
    parentPort.postMessage({ type: "error", error: error.message });
  }
});
