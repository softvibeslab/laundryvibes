


const { Schema, model } = require('mongoose');

const workerSchema = new Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true, match: [/\S+@\S+\.\S+/, 'Please use a valid email address'] },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['worker', 'admin'], default: "worker" }
}, {
  collection: 'workers',
  toJSON: { transform(doc, ret) { delete ret.password; return ret; } },
});

module.exports = model("Worker", workerSchema);