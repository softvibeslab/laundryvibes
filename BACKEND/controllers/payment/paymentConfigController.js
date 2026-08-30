const PaymentConfig = require('../../models/paymentConfig');
const { configDto, getPaymentConfig, parseMethods, parsePrice } = require('../../services/paymentService');
const { auditHttp } = require('../../services/auditService');
const { runInTransaction } = require('../../services/transactionService');

async function getConfig(req, res, next) {
  try {
    return res.json(configDto(await getPaymentConfig()));
  } catch (error) { return next(error); }
}

async function updateConfig(req, res, next) {
  try {
    const allowed = ['currency', 'pricePerKg', 'methods'];
    if (!req.body || Object.keys(req.body).some((key) => !allowed.includes(key)))
      return res.status(400).json({ message: 'La configuración contiene campos no permitidos' });
    const currency = String(req.body.currency || '').toUpperCase();
    const parsedPrice = parsePrice(req.body.pricePerKg);
    const methods = parseMethods(req.body.methods);
    if (currency !== 'MXN') return res.status(400).json({ message: 'La moneda debe ser MXN' });
    if (!parsedPrice)
      return res.status(400).json({ message: 'El precio por kg debe ser mayor que cero, respetar el máximo y tener máximo dos decimales' });
    if (!methods) return res.status(400).json({ message: 'Configura los tres métodos manuales y deja al menos uno activo' });

    const updated = await runInTransaction(async (session) => {
      const config = await PaymentConfig.findOneAndUpdate(
        { _id: 'global' },
        {
          $set: {
            currency, locale: 'es-MX', pricePerKg: parsedPrice.value, methods,
            updatedBy: { actorId: req.user.userId, role: 'admin' },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true, session },
      );
      await auditHttp(req, 'config.payment_updated', { type: 'payment_config', id: 'global' }, { currency, pricePerKg: parsedPrice.value }, { session });
      return config;
    }, { transactionRunner: req.app?.locals?.config?.transactionRunner });
    return res.json(configDto(updated));
  } catch (error) { return next(error); }
}

module.exports = { getConfig, updateConfig };
