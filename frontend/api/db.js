const mongoose = require('mongoose');

// Use the connection string from environment.prod.ts (hardcoded for now to match user's context)
// ideally process.env.MONGODB_URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://ouistikram13_db_user:c5kBuafFBxAH6a1I@mariage.ivjpsop.mongodb.net/?appName=mariage';

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectToDatabase;