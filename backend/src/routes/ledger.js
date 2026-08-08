const express = require("express");
const { create, list } = require("../controllers/ledger");

const router = express.Router();

router.post("/entries", create);
router.get("/entries", list);

module.exports = router;