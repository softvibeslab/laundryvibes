const jwt = require('jsonwebtoken');

function authenticateUser(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, req.app.locals.config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired credentials' });
  }
}

function requireRoles(...roles) {
  return (req, res, next) => roles.includes(req.user?.role)
    ? next()
    : res.status(403).json({ message: 'Insufficient permissions' });
}

module.exports = authenticateUser;
module.exports.authenticateUser = authenticateUser;
module.exports.requireRoles = requireRoles;
