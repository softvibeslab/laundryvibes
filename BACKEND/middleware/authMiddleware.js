const jwt = require('jsonwebtoken');
const { findAccountForClaims, accountMatchesClaims } = require('../services/accountService');

async function authenticateUser(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Se requiere autenticación' });
  try {
    const claims = jwt.verify(token, req.app.locals.config.jwtSecret);
    const lookup = req.app.locals.config.accountLookup || findAccountForClaims;
    const account = await lookup(claims);
    if (!accountMatchesClaims(account, claims)) {
      return res.status(401).json({ message: 'La sesión fue revocada o la cuenta no está activa' });
    }
    req.user = claims;
    return next();
  } catch {
    return res.status(401).json({ message: 'Las credenciales no son válidas o han expirado' });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'No tienes permisos suficientes' });
}

module.exports = authenticateUser;
module.exports.authenticateUser = authenticateUser;
module.exports.requireRoles = requireRoles;
