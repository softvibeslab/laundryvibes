const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Se requiere autenticación' });
  try {
    req.user = jwt.verify(token, req.app.locals.config.jwtSecret);
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
