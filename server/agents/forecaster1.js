import { mongoService } from '../services/mongo.js';
import Scenario from '../models/Scenario.model.js'; // Ensure Scenario model is imported
import { loremIpsum } from 'lorem-ipsum'; // Using a simple lorem ipsum generator

/**
 * Generates a mock forecast for a PENDING scenario.
 * @param {string} scenarioId - The _id of the scenario to forecast.
 * @returns {Promise<boolean>} - True if successful, false otherwise.
 */
export const generateMockForecast = async (scenarioId) => {
  if (!scenarioId) {
    console.error('[Forecaster1] No scenarioId provided.');
    return false;
  }

  console.log(`[Forecaster1] Attempting to generate forecast for scenario: ${scenarioId}`);

  try {
    // 1. Fetch the scenario
    // Use lean() for performance if we only need to read and update
    const scenario = await Scenario.findById(scenarioId).lean();

    if (!scenario) {
      console.error(`[Forecaster1] Scenario not found: ${scenarioId}`);
      return false;
    }

    // 2. Check status
    if (scenario.status !== 'PENDING') {
      console.log(`[Forecaster1] Scenario ${scenarioId} is not PENDING (status: ${scenario.status}). Skipping forecast.`);
      return true; // Not an error, just nothing to do
    }

    // 3. Generate mock data
    const mockProbability = Math.random(); // 0 to 1
    const mockRationale = loremIpsum({
      count: 2, // Number of units
      units: 'paragraphs',
      paragraphLowerBound: 3, // Min sentences per paragraph
      paragraphUpperBound: 5, // Max sentences per paragraph
    });
    const timestamp = new Date();

    // 4. Prepare update data
    const updateData = {
      currentProbability: mockProbability,
      // Add to history - use $push with mongoService or handle array update correctly
      probabilityHistory: [...(scenario.probabilityHistory || []), { timestamp, value: mockProbability }],
      rationaleSummary: mockRationale.substring(0, 150) + '...', // Example summary
      // rationaleDetails: mockRationale, // Optionally add full rationale
      status: 'OPEN' // Update status
    };

    // 5. Update scenario using mongoService
    console.log(`[Forecaster1] Updating scenario ${scenarioId} with mock forecast:`, { prob: mockProbability, status: 'OPEN' });
    // Pass the full update object
    const updatedScenario = await mongoService.updateScenario({ _id: scenarioId, ...updateData });

    if (updatedScenario) {
      console.log(`[Forecaster1] Successfully updated scenario ${scenarioId} to OPEN.`);
      return true;
    } else {
      console.error(`[Forecaster1] Failed to update scenario ${scenarioId} in DB.`);
      return false;
    }

  } catch (error) {
    console.error(`[Forecaster1] Error processing scenario ${scenarioId}:`, error);
    return false;
  }
};
