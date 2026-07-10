const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

module.exports = {
  PORT: process.env.PORT || 4000,
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  MASTER_DB_URI: process.env.MASTER_DB_URI || '',
  // public keys store can be a URL or env var mapping in prod
  JWT_PUBLIC_KEYS: process.env.JWT_PUBLIC_KEYS || '',
};
