const crypto = require("crypto");
const redis = require("../config/redis");
const ensureRedisConnected = async () => {
  if (redis.status === "ready" || redis.status === "connecting") {
    return;
  }
  await redis.connect();
};

const acquireLock = async (lockKey) => {
  await ensureRedisConnected();
  const token = crypto.randomUUID();
  const isLockAcquired = await redis.set(lockKey,token,"PX",30000,"NX");
  return {acquired: Boolean(isLockAcquired),token};
};
const releaseLock = async (lockKey, token) => {
  const unlockScript = `if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    end
    return 0
  `;

  await redis.eval(unlockScript,1,lockKey,token);
};

module.exports = {
  acquireLock,
  releaseLock,
};