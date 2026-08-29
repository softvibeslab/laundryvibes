const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

function attachSocket(server, config) {
  const io = new Server(server, { cors: { origin: config.corsOrigins, credentials: true, methods: ['GET', 'POST'] }, maxHttpBufferSize: 10_000 });
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      socket.user = jwt.verify(token, config.jwtSecret);
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
