const jwt = require("jsonwebtoken");
const config = require("../config");

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

  if (!decodedToken.header || decodedToken.header.alg !== "RS256") {
    return res.status(401).json({error: "Unsupported JWT algorithm"});
  }

  const tenantId = decodedToken.payload.tid || decodedToken.payload.tenant || decodedToken.payload.org;
  if (!isValidTenantId(tenantId)) {
    return res.status(401).json({error: "Invalid tenant claim"});
  }

  const publicKey = getPublicKeyForTenant(tenantId);
  if (!publicKey) {
    return res.status(401).json({error: "Unknown tenant or public key not configured"});
  }

  try {
    const verifyOptions = {algorithms: ["RS256"]};
    if (config.JWT_ISSUER) {
      verifyOptions.issuer = config.JWT_ISSUER;
    }

    if (config.JWT_AUDIENCE) {
      verifyOptions.audience = config.JWT_AUDIENCE;
    }

    const payload = jwt.verify(token,publicKey,verifyOptions);
    req.tenant = {id: tenantId,claims: payload};
    next();
  } catch (error) {
    return res.status(401).json({error: "Token verification failed"});
  }
};

module.exports = tenantJwt;