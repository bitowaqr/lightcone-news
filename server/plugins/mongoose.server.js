// server/plugins/mongoose.server.js
import { mongoService } from '../services/mongo.js'; // Import the service
// import mongoose from 'mongoose'; // No longer needed here
// import { useRuntimeConfig } from '#imports'; // No longer needed here

export default defineNitroPlugin(async (nitroApp) => {
  // const config = useRuntimeConfig(); // Handled by the service
  // const mongoUri = config.mongodbUri; // Handled by the service

  // if (!mongoUri) { // Handled by the service
  //   console.error('❌ MongoDB URI is not defined in runtime config.');
  //   return; // Stop plugin execution if URI is missing
  // }

  // Delegate connection logic to the service
  await mongoService.connect();

  // The service now handles connection state checking and logging.
  // Event listeners (disconnected, error) are also handled within the service.

  // Optional: You could add a check here to ensure connection was successful
  // if (mongoService.getConnectionState() !== 1) {
  //   console.error('❌ Initial MongoDB connection failed in plugin. Check logs.');
  //   // Decide if the server should proceed without DB
  // }
});

// // Only attempt to connect once
// if (mongoose.connection.readyState === 0) { // 0 = disconnected
//   console.log('🔌 Attempting to connect to MongoDB...');
//   try {
//     await mongoose.connect(mongoUri);
//     console.log('✅ MongoDB connected successfully.');
//   } catch (e) {
//     console.error('❌ MongoDB connection error:', e);
//     // Optional: throw error to potentially stop server startup on critical DB failure
//     // throw e;
//   }
// } else {
//    console.log('ℹ️ MongoDB connection already established.');
// }

// // Optional: Handle disconnection events if needed for monitoring/cleanup
// mongoose.connection.on('disconnected', () => {
//   console.warn('⚠️ MongoDB disconnected.');
// });
// mongoose.connection.on('error', (error) => {
//    console.error('❌ MongoDB connection error event:', error);
// });