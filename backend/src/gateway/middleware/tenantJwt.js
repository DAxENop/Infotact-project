const jwt = require('jsonwebtoken');
const config = require('../../config');

// Simple key lookup: in prod, replace with JWKS or tenant key store
function getPublicKeyForTenant(tenantId) {
  // example: JWT_PUBLIC_KEYS env: tenantA:-----BEGIN...;tenantB:-----BEGIN...
  if (!config.JWT_PUBLIC_KEYS) return null;
  const pairs = config.JWT_PUBLIC_KEYS.split(',');
  for (const p of pairs) {
    const [k, v] = p.split(':');
    if (k === tenantId) return v;
  }
  return null;
}

module.exports = function tenantJwt(req, res, next) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing Bearer token' });
  const token = auth.slice(7);

  let decoded;
  try {
    // verify without key first to read tenant claim
    decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.payload) throw new Error('Invalid token');
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token format' });
  }

  const tenantId = decoded.payload.tid || decoded.payload.tenant || decoded.payload.org;
  if (!tenantId) return res.status(401).json({ error: 'Tenant claim missing' });

  const pub = getPublicKeyForTenant(tenantId);
  if (!pub) return res.status(401).json({ error: 'Unknown tenant or public key not configured' });

  try {
    const payload = jwt.verify(token, pub, { algorithms: ['RS256'] });
    req.tenant = { id: tenantId, claims: payload };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
};
