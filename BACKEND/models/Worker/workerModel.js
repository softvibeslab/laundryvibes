


const { Schema, model } = require('mongoose');

const workerSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  role: { type: String, default: "worker" } // Default role as "worker"
}, {
  collection: 'workers',
  toJSON: { transform(doc, ret) { delete ret.password; return ret; } },
});

module.exports = model("Worker", workerSchema);