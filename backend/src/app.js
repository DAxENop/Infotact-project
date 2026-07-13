const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const tenantJwt = require('./gateway/middleware/tenantJwt');
const ledger = require('./routes/ledger');
const config = require('./config');

const app = express();

const limiter = rateLimit({
	windowMs: config.RATE_LIMIT_WINDOW_MS,
	limit: config.RATE_LIMIT_MAX,
	standardHeaders: 'draft-7',
	legacyHeaders: false,
});

app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(limiter);
app.use(express.json());

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' });
});

app.use('/ledger', tenantJwt, ledger);

app.listen(config.PORT, () => console.log(`Server running on ${config.PORT}`));

module.exports = app;
