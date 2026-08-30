const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { findAccountForClaims, accountMatchesClaims } = require('./services/accountService');

function attachSocket(server, config) {
  const io = new Server(server, { cors: { origin: config.corsOrigins, credentials: true, methods: ['GET', 'POST'] }, maxHttpBufferSize: 10_000 });
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const claims = jwt.verify(token, config.jwtSecret);
      const lookup = config.accountLookup || findAccountForClaims;
      const account = await lookup(claims);
      if (!accountMatchesClaims(account, claims)) return next(new Error('Invalid credentials'));
      socket.user = claims;
      return next();
    } catch { return next(new Error('Invalid credentials')); }
  });
  io.on('connection', (socket) => {
    if (['worker', 'admin'].includes(socket.user.role)) socket.join('workers');
    if (socket.user.role === 'user') socket.join(`user:${socket.user.userId}`);
  });
  return io;
}

module.exports = { attachSocket };
