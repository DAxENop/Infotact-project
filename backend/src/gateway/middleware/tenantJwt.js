const jwt = require('jsonwebtoken');
const config = require('../../config');

function getPublicKeyForTenant(tenantId) {
  const rawKey = config.JWT_PUBLIC_KEY_MAP[tenantId];
  if (!rawKey) return null;

  // Support multiline PEM keys passed through env variables.
  return rawKey.replace(/\\n/g, '\n');
}

function isValidTenantId(tenantId) {
  return typeof tenantId === 'string' && /^[A-Za-z0-9_-]{2,64}$/.test(tenantId);
}

module.exports = function tenantJwt(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Bearer token' });
  const token = auth.slice(7);

  let decoded;
  try {
    decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.payload) throw new Error('Invalid token');
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  if (!decoded.header || decoded.header.alg !== 'RS256') {
    return res.status(401).json({ error: 'Unsupported JWT algorithm' });
  }

  const tenantId = decoded.payload.tid || decoded.payload.tenant || decoded.payload.org;
  if (!isValidTenantId(tenantId)) return res.status(401).json({ error: 'Invalid tenant claim' });

  const pub = getPublicKeyForTenant(tenantId);
  if (!pub) return res.status(401).json({ error: 'Unknown tenant or public key not configured' });

  try {
    const verifyOptions = { algorithms: ['RS256'] };

    if (config.JWT_ISSUER) verifyOptions.issuer = config.JWT_ISSUER;
    if (config.JWT_AUDIENCE) verifyOptions.audience = config.JWT_AUDIENCE;

    const payload = jwt.verify(token, pub, verifyOptions);

    req.tenant = { id: tenantId, claims: payload };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
};
