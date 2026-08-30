const { Schema, model } = require('mongoose');

const auditEventSchema = new Schema({
  action: { type: String, required: true, trim: true, maxlength: 100, immutable: true },
  actor: {
    id: { type: Schema.Types.ObjectId },
    role: { type: String, required: true, enum: ['user', 'worker', 'admin', 'system'] },
  },
  target: {
    type: { type: String, required: true, trim: true, maxlength: 50 },
    id: { type: String, trim: true, maxlength: 200 },
  },
  origin: {
    ip: { type: String, maxlength: 100 },
    userAgent: { type: String, maxlength: 300 },
    channel: { type: String, enum: ['http', 'cli'], default: 'http' },
  },
  metadata: { type: Schema.Types.Mixed, default: {}, immutable: true },
}, {
  collection: 'audit_events',
  timestamps: { createdAt: true, updatedAt: false },
  strict: 'throw',
});

auditEventSchema.index({ createdAt: -1 });
auditEventSchema.index({ 'actor.id': 1, createdAt: -1 });

const immutable = (next) => next(new Error('Audit events are append-only'));
auditEventSchema.pre('save', function preventExistingSave(next) {
  if (!this.isNew) return immutable(next);
  return next();
});
for (const hook of ['updateOne', 'updateMany', 'replaceOne', 'findOneAndUpdate', 'findOneAndReplace', 'deleteOne', 'deleteMany', 'findOneAndDelete']) {
  auditEventSchema.pre(hook, immutable);
}
auditEventSchema.pre('deleteOne', { document: true, query: false }, immutable);
auditEventSchema.pre('bulkWrite', function allowOnlyBulkInserts(next, operations) {
  if (operations.every((operation) => operation.insertOne)) return next();
  return immutable(next);
});

module.exports = model('AuditEvent', auditEventSchema);
