const express = require('express');
const tenantJwt = require('./gateway/middleware/tenantJwt');
const ledger = require('./routes/ledger');
const config = require('./config');

const app = express();
app.use(express.json());

app.use(tenantJwt);
app.use('/ledger', ledger);

app.listen(config.PORT, () => console.log(`Server running on ${config.PORT}`));

module.exports = app;
