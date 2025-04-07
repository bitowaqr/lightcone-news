// server/plugins/mongoose.server.js
import mongoose from 'mongoose';
// import { useRuntimeConfig } from '#imports'; // Auto-imported by Nuxt

export default defineNitroPlugin(async (nitroApp) => {
  const config = useRuntimeConfig();
  const mongoUri = config.mongodbUri; // Read URI from runtime config

  if (!mongoUri) {
    console.error('❌ MongoDB URI is not defined in runtime config.');
    return; // Stop plugin execution if URI is missing
  }

  // Only attempt to connect once
  if (mongoose.connection.readyState === 0) { // 0 = disconnected
    console.log('🔌 Attempting to connect to MongoDB...');
    try {
      await mongoose.connect(mongoUri);
      console.log('✅ MongoDB connected successfully.');
    } catch (e) {
      console.error('❌ MongoDB connection error:', e);
      // Optional: throw error to potentially stop server startup on critical DB failure
      // throw e;
    }
  } else {
     console.log('ℹ️ MongoDB connection already established.');
  }

  // Optional: Handle disconnection events if needed for monitoring/cleanup
  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected.');
  });
  mongoose.connection.on('error', (error) => {
     console.error('❌ MongoDB connection error event:', error);
  });
});