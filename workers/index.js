import { updateScenarios } from './updateScenarios.js';
import { mongoService } from '../server/services/mongo.js';

// Run the updateScenarios worker
try {
  await updateScenarios();
} catch (error) {
  console.error('Error updating scenarios:', error);
} finally {
  await mongoService.disconnect();
  console.log('MongoDB connection closed.');
}
