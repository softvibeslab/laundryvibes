const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const orderRoutes = require('./routes/userRoutes/orderRoutes');
const userRoutes = require('./routes/userRoutes/userRoute');
const complaintRoutes = require('./routes/userRoutes/complaintRoutes/complaintRoutes');
const workerAccountRoutes = require('./routes/Admin/WorkerControlle/workeraccount');
const profileRoutes = require('./routes/userRoutes/Profile/userDetails');
const workerOrderRoutes = require('./routes/Worker/Get-All-Orders/allOrders');
const stockRoutes = require('./routes/Worker/stockRoutes');
const paymentRoutes = require('./routes/payment/paymentRoutes');
const adminPaymentRoutes = require('./routes/payment/adminPaymentRoutes');
const { notFound, errorHandler } = require('./middleware/errors');

function createApp(config) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.locals.config = config;
  const corsOptions = {
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      const error = new Error('Origen no permitido'); error.status = 403; return callback(error);
    },
    credentials: true,
  };
  app.use(helmet());
  app.use(cors(corsOptions));
  app.use(express.json({ limit: config.payloadLimit }));
  const limiter = (windowMs, limit, message) => rateLimit({
    windowMs, limit, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { message },
  });
  // All aliases share one limiter/store, so changing the URL cannot reset the quota.
  const loginLimiter = limiter(15 * 60_000, config.loginRateLimit || 10, 'Demasiados intentos. Inténtalo de nuevo más tarde.');
  app.use(['/api/user/login', '/api/admin/login', '/api/worker/login'], loginLimiter);
  app.use(['/api/user/forgot-password', '/api/user/reset-password'], limiter(60 * 60_000, config.resetRateLimit || 5, 'Demasiadas solicitudes. Inténtalo de nuevo más tarde.'));
  const writeLimiter = limiter(15 * 60_000, config.writeRateLimit || 120, 'Demasiadas operaciones. Inténtalo de nuevo más tarde.');
  app.use(['/api/admin/add-worker', '/api/admin/payment-config', '/api/stock', '/api/admin/orders', '/api/worker/orders', '/api/worker/update-order-status'], (req, res, next) => (
    ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : writeLimiter(req, res, next)
  ));
  app.get('/api/health/live', (req, res) => res.json({ status: 'ok' }));
  app.get('/api/health/ready', (req, res) => {
    const ready = require('mongoose').connection.readyState === 1;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'unavailable' });
  });
  app.use('/api/user', orderRoutes, userRoutes, complaintRoutes, profileRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', workerAccountRoutes);
  app.use('/api/admin', adminPaymentRoutes);
  app.use('/api/admin', workerOrderRoutes);
  app.use('/api/worker', workerAccountRoutes, workerOrderRoutes);
  app.use('/api/stock', stockRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
