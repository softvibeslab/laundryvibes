// userOrder.js
const { Schema, model } = require('mongoose');
const {
  MAX_NUMBER_OF_CLOTHES, MAX_ORDER_TOTAL, MAX_PRICE_PER_KG, MAX_WEIGHT_KG, parsePrice,
} = require('../services/paymentService');

const finiteRange = (minimum, maximum) => (value) => Number.isFinite(value) && value >= minimum && value <= maximum;
const moneyValidator = (maximum) => (value) => (
  Number.isFinite(value)
  && value > 0
  && value <= maximum
  && Number.isSafeInteger(Math.round(value * 100))
  && Math.abs(Math.round(value * 100) - value * 100) < Number.EPSILON * Math.max(1, Math.abs(value * 100))
);

const evidenceSchema = new Schema({
  data: { type: Buffer, select: false },
  contentType: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
  extension: { type: String, enum: ['jpg', 'png', 'webp', 'pdf'] },
}, { _id: false });

const paymentRecordSchema = new Schema({
  method: { type: String, enum: ['cash', 'transfer', 'card'] },
  methodLabel: { type: String },
  status: { type: String, enum: ['pending', 'pending_review', 'paid', 'unpaid'] },
  source: { type: String, enum: ['client', 'pos'] },
  actorId: { type: Schema.Types.ObjectId },
  actorRole: { type: String, enum: ['user', 'worker', 'admin'] },
  recordedAt: { type: Date },
  evidence: evidenceSchema,
}, { _id: false });

const currentPaymentSchema = new Schema({
  method: { type: String, enum: ['cash', 'transfer', 'card'] },
  methodLabel: { type: String },
  status: { type: String, enum: ['pending', 'pending_review', 'paid', 'unpaid'] },
  source: { type: String, enum: ['client', 'pos'] },
  actorId: { type: Schema.Types.ObjectId },
  actorRole: { type: String, enum: ['user', 'worker', 'admin'] },
  recordedAt: { type: Date },
}, { _id: false });

const orderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    numberOfClothes: {
      type: Number, required: true, min: 1, max: MAX_NUMBER_OF_CLOTHES,
      validate: { validator: Number.isSafeInteger, message: 'numberOfClothes must be a safe integer' },
    },
    weight: {
      type: Number, required: true, min: 0.001, max: MAX_WEIGHT_KG,
      validate: { validator: finiteRange(0.001, MAX_WEIGHT_KG), message: 'weight must be finite and within limits' },
    },
    createdAt: { type: Date, default: Date.now },
    status: {
      type: String, enum: ['Pending', 'In Progress', 'Completed', 'Delivered'], default: 'Pending',
    },
    smsSent: { type: Boolean, default: false },
    // Optional snapshots keep documents created before payment support readable.
    pricing: {
      currency: { type: String, enum: ['MXN'] },
      pricePerKg: {
        type: Number, min: 0.01, max: MAX_PRICE_PER_KG,
        validate: { validator: (value) => Number.isFinite(value) && Boolean(parsePrice(value)), message: 'pricePerKg is invalid' },
      },
      total: {
        type: Number, min: 0.01, max: MAX_ORDER_TOTAL,
        validate: { validator: moneyValidator(MAX_ORDER_TOTAL), message: 'total is invalid' },
      },
    },
    payment: {
      current: currentPaymentSchema,
      clientDeclaration: paymentRecordSchema,
      posRecord: paymentRecordSchema,
    },
  },
  { collection: 'orders' },
);

module.exports = model('Order', orderSchema);
