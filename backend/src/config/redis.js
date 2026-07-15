const Redis = require("ioredis");
const { REDIS_URL } = require("./index");

const redis = new Redis(REDIS_URL, {
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
});

module.exports = redis;