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

const orderTimelineSchema = new Schema({
  type: { type: String, required: true, enum: ['created', 'transition', 'assignment', 'reopened', 'notification'] },
  fromStatus: String,
  toStatus: String,
  actor: {
    id: { type: Schema.Types.ObjectId, required: true },
    role: { type: String, required: true, enum: ['user', 'worker', 'admin', 'system'] },
  },
  fromWorker: { type: Schema.Types.ObjectId },
  toWorker: { type: Schema.Types.ObjectId },
  comment: { type: String, trim: true, maxlength: 1000 },
  origin: { type: String, required: true, enum: ['web', 'api', 'legacy', 'system'], default: 'api' },
  timestamp: { type: Date, required: true, default: Date.now },
}, { _id: true, strict: 'throw' });

const notificationSchema = new Schema({
  transitionEventId: Schema.Types.ObjectId,
  status: { type: String, enum: ['pending', 'sending', 'sent', 'failed'] },
  attempts: { type: Number, min: 0, default: 0 },
  sentAt: Date,
  lastAttemptAt: Date,
  claimedAt: Date,
  leaseExpiresAt: Date,
  claimToken: Schema.Types.ObjectId,
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
      type: String, enum: ['Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled'], default: 'Pending',
    },
    smsSent: { type: Boolean, default: false },
    assignedWorker: { type: Schema.Types.ObjectId, ref: 'Worker', default: null },
    assignedAt: Date,
    assignedBy: Schema.Types.ObjectId,
    timeline: { type: [orderTimelineSchema], default: [] },
    completionNotification: notificationSchema,
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

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ assignedWorker: 1, status: 1, createdAt: -1 });
orderSchema.index({ 'payment.current.status': 1, createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });

const timelinePath = (path) => path === 'timeline' || path.startsWith('timeline.');
const assertTimelineUpdate = (update) => {
  if (Array.isArray(update)) throw new Error('Order timeline is append-only; update pipelines are forbidden');
  if (!update || typeof update !== 'object') return;
  if (Object.prototype.hasOwnProperty.call(update, 'timeline')) throw new Error('Order timeline is append-only');
  for (const [operator, values] of Object.entries(update)) {
    if (!operator.startsWith('$') || !values || typeof values !== 'object') continue;
    if (operator === '$push') {
      if (Object.keys(values).some((path) => timelinePath(path) && path !== 'timeline')) throw new Error('Order timeline is append-only');
      if (Object.prototype.hasOwnProperty.call(values, 'timeline')) {
        const entry = values.timeline;
        if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some((key) => key.startsWith('$')))
          throw new Error('Order timeline is append-only; only one literal event may be pushed');
      }
      continue;
    }
    if (operator === '$rename') {
      if (Object.entries(values).some(([from, to]) => timelinePath(from) || timelinePath(String(to)))) throw new Error('Order timeline is append-only');
      continue;
    }
    if (Object.keys(values).some(timelinePath)) throw new Error('Order timeline is append-only');
  }
};

// Timeline entries are immutable and may only be appended with $push.
for (const hook of ['updateOne', 'updateMany', 'findOneAndUpdate']) {
  orderSchema.pre(hook, function preventTimelineRewrite(next) {
    try { assertTimelineUpdate(this.getUpdate?.()); return next(); } catch (error) { return next(error); }
  });
}
const immutableTimelineDocument = (next) => next(new Error('Order timeline is append-only'));
for (const hook of ['replaceOne', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete']) orderSchema.pre(hook, immutableTimelineDocument);
orderSchema.pre('deleteOne', { document: true, query: false }, immutableTimelineDocument);
orderSchema.pre('bulkWrite', function preventTimelineBulkBypass(next, operations) {
  try {
    for (const operation of operations) {
      if (operation.insertOne) continue;
      if (operation.updateOne) assertTimelineUpdate(operation.updateOne.update);
      else if (operation.updateMany) assertTimelineUpdate(operation.updateMany.update);
      else throw new Error('Order timeline is append-only');
    }
    return next();
  } catch (error) { return next(error); }
});
orderSchema.pre('save', function preventTimelineDocumentRewrite(next) {
  if (!this.isNew && this.isModified('timeline')) return next(new Error('Order timeline is append-only'));
  return next();
});

module.exports = model('Order', orderSchema);
