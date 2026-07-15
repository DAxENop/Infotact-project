const path = require("path");
require("dotenv").config({path: path.resolve(process.cwd(), ".env")});
const toInt = (value, defaultValue) => {
  const parsedValue = parseInt(value, 10);
  return Number.isNaN(parsedValue) ? defaultValue : parsedValue;
};

const parseKeyMap = (value) => {
  if (!value) {
    return {};
  }

  const keyMap = {};
  const tenants = value.split(",");
  for (const tenant of tenants) {
    const [tenantId, publicKey] = tenant.split(":");
    if (!tenantId || !publicKey) {
      continue;
    }
    keyMap[tenantId.trim()] = publicKey.trim();
  }
  return keyMap;
};

const config = {
  PORT: toInt(process.env.PORT, 4000),
  REDIS_URL:process.env.REDIS_URL || "redis://127.0.0.1:6379",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",
  RATE_LIMIT_WINDOW_MS: toInt(process.env.RATE_LIMIT_WINDOW_MS,60000),
  RATE_LIMIT_MAX: toInt(process.env.RATE_LIMIT_MAX,120),

  JWT_ISSUER: process.env.JWT_ISSUER || "",
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || "",
  JWT_PUBLIC_KEY_MAP: parseKeyMap( process.env.JWT_PUBLIC_KEYS)};

module.exports = config;