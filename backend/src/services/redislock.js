const crypto = require("crypto");
const redis = require("../config/redis");

let redisAvailable = false;

const ensureRedisConnected = async () => {
  if (redis.status === "ready") { redisAvailable = true; return true; }
  if (redis.status === "connecting") return true;
  try {
    await redis.connect();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
};

redis.on("ready", () => { redisAvailable = true; });
redis.on("error", () => { redisAvailable = false; });
redis.on("close", () => { redisAvailable = false; });

const acquireLock = async (lockKey) => {
  const connected = await ensureRedisConnected();
  if (!connected) return { acquired: true, token: "no-redis" }; // ponytail: skip lock when Redis unavailable (dev only)
  const token = crypto.randomUUID();
  const isLockAcquired = await redis.set(lockKey, token, "PX", 30000, "NX");
  return { acquired: Boolean(isLockAcquired), token };
};

const releaseLock = async (lockKey, token) => {
  if (!redisAvailable || token === "no-redis") return;
  const unlockScript = `if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end; return 0`;
  await redis.eval(unlockScript, 1, lockKey, token);
};

module.exports = { acquireLock, releaseLock };