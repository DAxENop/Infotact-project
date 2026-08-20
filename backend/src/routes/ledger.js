const router = require("express").Router();
const { create, list, stats, updateStatus } = require("../controllers/ledger");

router.post("/entries", create);
router.get("/entries", list);
router.get("/stats", stats);
router.patch("/entries/:id/status", updateStatus);

module.exports = router;
