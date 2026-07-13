const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });

function toInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseKeyMap(raw) {
  if (!raw) return {};

  try {
    const asJson = JSON.parse(raw);
    if (asJson && typeof asJson === 'object') {
      return asJson;
    }
  } catch (_err) {
    // Fallback to k:v,k2:v2 for local quick setup.
  }

  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const idx = entry.indexOf(':');
      if (idx <= 0) return acc;

      const key = entry.slice(0, idx).trim();
      const value = entry.slice(idx + 1).trim();
      if (key && value) acc[key] = value;
      return acc;
    }, {});
}

const jwtPublicKeyMap = parseKeyMap(process.env.JWT_PUBLIC_KEYS || '');

module.exports = {
  PORT: toInt(process.env.PORT, 4000),
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  RATE_LIMIT_WINDOW_MS: toInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  RATE_LIMIT_MAX: toInt(process.env.RATE_LIMIT_MAX, 120),
  JWT_ISSUER: process.env.JWT_ISSUER || '',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || '',
  JWT_PUBLIC_KEY_MAP: jwtPublicKeyMap,
};
