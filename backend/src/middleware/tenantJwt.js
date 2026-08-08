const jwt = require("jsonwebtoken");
const config = require("../config");

const JWT_SECRET = process.env.JWT_SECRET || "ledgerguard-dev-secret-change-in-prod";

const getPublicKeyForTenant = (tenantId) => {
  const rawKey = config.JWT_PUBLIC_KEY_MAP[tenantId];
  if (!rawKey) {
    return null;
  }
  return rawKey.replace(/\\n/g, "\n");
};

const isValidTenantId = (tenantId) => {
  return (
    typeof tenantId === "string" &&
    /^[A-Za-z0-9_-]{2,64}$/.test(tenantId)
  );
};

const tenantJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({error: "Missing Bearer token"});
  }
  const token = authorization.slice(7);
  let decodedToken;

  try {
    decodedToken = jwt.decode(token, {complete: true});
  } catch (error) {
    return res.status(401).json({error: "Invalid token format"});
  }

  if (!decodedToken || !decodedToken.payload) {
    return res.status(401).json({error: "Invalid token format"});
  }

  const alg = decodedToken.header?.alg;

  // Try RS256 first (per-tenant public key), fall back to HMAC (JWT_SECRET)
  if (alg === "RS256") {
    const tenantId = decodedToken.payload.tid || decodedToken.payload.tenant || decodedToken.payload.org;
    if (!isValidTenantId(tenantId)) {
      return res.status(401).json({error: "Invalid tenant claim"});
    }

    const publicKey = getPublicKeyForTenant(tenantId);
    if (!publicKey) {
      return res.status(401).json({error: "Unknown tenant or public key not configured"});
    }

    try {
      const verifyOptions = { algorithms: ["RS256"] };
      if (config.JWT_ISSUER) verifyOptions.issuer = config.JWT_ISSUER;
      if (config.JWT_AUDIENCE) verifyOptions.audience = config.JWT_AUDIENCE;

      const payload = jwt.verify(token, publicKey, verifyOptions);
      req.tenant = { id: tenantId, claims: payload };
      return next();
    } catch (error) {
      return res.status(401).json({error: "Token verification failed"});
    }
  }

  // HMAC fallback (for auth-issued tokens)
  if (alg === "HS256") {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const tenantId = payload.tid;
      if (!isValidTenantId(tenantId)) {
        return res.status(401).json({error: "Invalid tenant claim"});
      }
      req.tenant = { id: tenantId, claims: payload };
      return next();
    } catch (error) {
      return res.status(401).json({error: "Token verification failed"});
    }
  }

  return res.status(401).json({error: "Unsupported JWT algorithm"});
};

module.exports = tenantJwt;