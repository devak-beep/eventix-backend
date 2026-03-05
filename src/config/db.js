const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error('MONGO_URI is missing');

mongoose.set('bufferCommands', false);

let cached = global.__mongooseCache;
if (!cached) {
  cached = global.__mongooseCache = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      maxPoolSize: 1,
      retryWrites: true,
      w: 'majority',
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
