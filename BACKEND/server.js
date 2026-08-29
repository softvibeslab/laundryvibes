const http = require('http');
const mongoose = require('mongoose');
const { loadConfig } = require('./config/env');
const connectDB = require('./config/db');
const { createApp } = require('./app');
const { attachSocket } = require('./socket');

async function start() {
  const config = loadConfig();
  await connectDB(config.mongoUrl);
  const app = createApp(config);
  const server = http.createServer(app);
  const io = attachSocket(server, config);
  app.locals.io = io;
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, config.host, resolve);
  });
  console.info(`Server listening on ${config.host}:${config.port}`);

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.info(`Received ${signal}; shutting down`);
    const timer = setTimeout(() => process.exit(1), 10_000).unref();
    io.close();
    server.close(async () => {
      await mongoose.disconnect();
      clearTimeout(timer);
      process.exit(0);
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  return server;
}

if (require.main === module) start().catch((error) => {
  console.error('Startup failed', { name: error.name, message: error.message });
  process.exit(1);
});

module.exports = { start };
