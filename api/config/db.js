const mongoose = require('mongoose');

// ── Serverless-safe connection caching ──────────────────────────────────────
// On Vercel, each function invocation may reuse a warm container. We cache the
// connection promise on the global object so we never open more than one
// connection per container, and never call process.exit() (which would kill
// the serverless runtime).
let cached = global._mongooseCached;
if (!cached) {
  cached = global._mongooseCached = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGODB_URI, {
        bufferCommands: false,
        maxPoolSize: 5, // keep pool small — many serverless instances can run in parallel
      })
      .then((m) => {
        console.log(`✅  MongoDB connected: ${m.connection.host}`);
        return m;
      })
      .catch((err) => {
        cached.promise = null; // allow retry on next invocation
        console.error('❌  MongoDB connection error:', err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
};

module.exports = connectDB;
