/**
 * Offloads heavy aggregation queries to a worker thread.
 * Single worker, single connection, multiple pipelines.
 */

const { Worker } = require("worker_threads");
const path = require("path");

const WORKER_PATH = path.join(__dirname, "../workers/aggregation.worker.js");

const runInWorker = (payload, timeoutMs = 10000) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(WORKER_PATH);
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("Worker timed out"));
    }, timeoutMs);

    worker.on("message", (msg) => {
      clearTimeout(timer);
      if (msg.type === "result") resolve(msg.data);
      else reject(new Error(msg.error));
      worker.terminate();
    });

    worker.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    const type = payload.pipelines ? "aggregate-multi" : "aggregate";
    worker.postMessage({ type, payload });
  });
};

module.exports = { runInWorker };
