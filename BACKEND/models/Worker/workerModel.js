


const { Schema, model } = require('mongoose');

const workerSchema = new Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, match: [/\S+@\S+\.\S+/, 'Please use a valid email address'] },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['worker', 'admin'], default: "worker" },
  active: { type: Boolean, default: true, required: true },
  tokenVersion: { type: Number, default: 0, min: 0, required: true, select: false }
}, {
  collection: 'workers',
  toJSON: { transform(doc, ret) { delete ret.password; return ret; } },
});

workerSchema.pre('save', async function revokeChangedAccount() {
  if (!this.isNew && (this.isModified('password') || this.isModified('active') || this.isModified('role'))) {
    let currentVersion = this.tokenVersion;
    if (!Number.isSafeInteger(currentVersion)) {
      const stored = await this.constructor.findById(this._id).select('+tokenVersion').lean();
      currentVersion = stored?.tokenVersion;
    }
    this.tokenVersion = (Number.isSafeInteger(currentVersion) ? currentVersion : 0) + 1;
  }
});

module.exports = model("Worker", workerSchema);