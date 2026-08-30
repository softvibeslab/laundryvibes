const { Schema, model } = require('mongoose');

const MAX_PRICE_PER_KG = 10_000;
const validPrice = (value) => Number.isFinite(value)
  && value >= 0.01
  && value <= MAX_PRICE_PER_KG
  && /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(String(value));

const methodSchema = new Schema({
  id: { type: String, enum: ['cash', 'transfer', 'card'], required: true },
  enabled: { type: Boolean, required: true },
}, { _id: false });

const paymentConfigSchema = new Schema({
  _id: { type: String, default: 'global', enum: ['global'] },
  currency: { type: String, default: 'MXN', enum: ['MXN'] },
  locale: { type: String, default: 'es-MX', immutable: true },
  pricePerKg: {
    type: Number,
    default: 60,
    min: 0.01,
    max: MAX_PRICE_PER_KG,
    validate: {
      validator: validPrice,
      message: 'pricePerKg must have at most two decimal places',
    },
  },
  methods: {
    type: [methodSchema],
    default: () => [
      { id: 'cash', enabled: true },
      { id: 'transfer', enabled: true },
      { id: 'card', enabled: true },
    ],
    validate: {
      validator(methods) {
        const ids = new Set((methods || []).map((method) => method.id));
        return methods?.length === 3 && ids.size === 3 && methods.some((method) => method.enabled);
      },
      message: 'All manual methods are required and at least one must be enabled',
    },
  },
  updatedBy: {
    actorId: { type: Schema.Types.ObjectId },
    role: { type: String, enum: ['admin'] },
  },
}, { timestamps: true, collection: 'payment_config' });

module.exports = model('PaymentConfig', paymentConfigSchema);
