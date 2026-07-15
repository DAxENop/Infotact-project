const express = require("express");
const { create } = require("../controllers/ledger.controller");

const router = express.Router();

router.post("/entries", create);

module.exports = router;