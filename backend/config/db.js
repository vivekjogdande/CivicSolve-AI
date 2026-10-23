const mongoose = require('mongoose');
const { env } = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
    console.log(`[db] connected to MongoDB (${mongoose.connection.name})`);
  } catch (err) {
    console.error(`[db] MongoDB connection error (${err.message}). The server will start, but database operations may fail until MongoDB is available.`);
  }

  mongoose.connection.on('error', (err) => {
    console.error(`[db] MongoDB runtime error: ${err.message}`);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected.');
  });
  mongoose.connection.on('reconnected', () => {
    console.log('[db] MongoDB reconnected successfully.');
  });
}

module.exports = { connectDB };
