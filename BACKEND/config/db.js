const mongoose = require('mongoose');

async function connectDB(mongoUrl) {
  await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 10000 });
  console.info('MongoDB connected');
  return mongoose.connection;
}

module.exports = connectDB;
