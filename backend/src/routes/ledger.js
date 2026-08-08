const router = require("express").Router();
const { create, list, stats } = require("../controllers/ledger");

router.post("/entries", create);
router.get("/entries", list);
router.get("/stats", stats);

module.exports = router;
