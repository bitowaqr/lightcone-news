import mongoose from 'mongoose';
import Forecaster from '../models/Forecaster.model.js';
import Scenario from '../models/Scenario.model.js';
import { mongoService } from '../services/mongo.js'; 
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * Finds an existing Forecaster by name or creates a new one.
 * Ensures the database connection is established.
 * @param {string} name - The unique name of the forecaster.
 * @param {object} [metadata={}] - Optional metadata for creation (avatar, description).
 * @returns {Promise<mongoose.Types.ObjectId>} The _id of the found or created Forecaster.
 * @throws {Error} If the operation fails.
 */
export async function findOrCreateForecaster(name, metadata = {}) {
    
    if (!name) {
        throw new Error('Forecaster name is required.');
    }
    await mongoService.connect(); // Ensure connection

    try {
        const determinedType = metadata.type || 'AI'; // Default to AI if not specified

        const insertData = {
            name: name,
            avatar: metadata.avatar || 'mdi:robot',
            description: metadata.description || '',
            type: determinedType,
            status: metadata.status || 'ACTIVE',
        };

        if (determinedType === 'AI') {
            if (typeof metadata.modelDetails !== 'undefined') {
                insertData.modelDetails = metadata.modelDetails;
            }
            // If metadata.modelDetails is not provided, schema default (empty object for AI)
            // will be applied upon new document creation.
            // userId should be null/undefined for AI type as per schema validation.
            // By not adding metadata.userId to insertData here, it remains unset,
            // which should satisfy the schema validator `v == null` for AI type if userId was undefined.
        } else if (determinedType === 'HUMAN') {
            if (typeof metadata.userId !== 'undefined') {
                insertData.userId = metadata.userId;
            }
            // If metadata.userId is not provided for a HUMAN forecaster,
            // schema validation (userId is required for HUMAN) will trigger an error.
            // modelDetails is not applicable/required for HUMAN type and defaults to undefined by schema.
        }

        const forecasterDoc = await Forecaster.findOneAndUpdate(
            { name: name },
            { $setOnInsert: insertData },
            { upsert: true, new: true, runValidators: true }
        ).lean();

        if (!forecasterDoc) {
            throw new Error(`Failed to find or create Forecaster document for ${name}`);
        }
        return forecasterDoc._id;
    } catch (error) {
        console.error(`[agentUtils] Error finding or creating forecaster '${name}':`, error);
        throw error;
    }
}

/**
 * Fetches a Scenario document based on its _id or platform/platformScenarioId.
 * Ensures the database connection is established.
 * @param {string | mongoose.Types.ObjectId} identifier - Scenario's MongoDB _id or platformScenarioId.
 * @param {string | null} [platform=null] - The platform name (required if identifier is platformScenarioId).
 * @returns {Promise<object | null>} The lean Scenario object or null if not found.
 * @throws {Error} If the query fails or inputs are invalid.
 */
export async function getScenarioForAgent(identifier, platform = null) {
    await mongoService.connect(); // Ensure connection
    let query = {};

    if (platform) {
        // Assume identifier is platformScenarioId
        query = { platform: platform, platformScenarioId: identifier };
    } else {
        // Assume identifier is MongoDB _id
        if (!mongoose.Types.ObjectId.isValid(identifier)) {
            console.error(`[agentUtils] Invalid MongoDB _id format provided: ${identifier}`);
            return null; // Or throw? Returning null for now.
        }
        query = { _id: identifier };
    }

    try {
        const scenario = await Scenario.findOne(query)
            .select('question questionNew description resolutionCriteria resolutionDate status')
            .lean(); 
        return scenario; // Returns null if not found
    } catch (error) {
        console.error(`[agentUtils] Error fetching scenario with query ${JSON.stringify(query)}:`, error);
        throw error;
    }
}

/**
 * Saves a new forecast entry to a Scenario's probabilityHistory.
 * Ensures the database connection is established.
 * @param {object} options
 * @param {string | mongoose.Types.ObjectId} options.scenarioId - The _id of the Scenario to update.
 * @param {string | mongoose.Types.ObjectId} options.forecasterId - The _id of the Forecaster making the prediction.
 * @param {object} options.predictionData - Object containing forecast details (probability required).
 * @param {number} options.predictionData.probability - The probability value (0-1).
 * @param {string} [options.predictionData.rationalSummary] - Optional summary.
 * @param {string} [options.predictionData.rationalDetails] - Optional details.
 * @param {string} [options.predictionData.comment] - Optional comment.
 * @param {Array<string>} [options.predictionData.dossier] - Optional array of evidence URLs.
 * @returns {Promise<object>} The result object from the MongoDB update operation.
 * @throws {Error} If update fails or inputs are invalid.
 */
export async function saveForecast({ scenarioId, forecasterId, predictionData }) {
    // Validate required inputs
    if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
        throw new Error('[agentUtils] Invalid or missing scenarioId for saving forecast.');
    }
    if (!forecasterId || !mongoose.Types.ObjectId.isValid(forecasterId)) {
        throw new Error('[agentUtils] Invalid or missing forecasterId for saving forecast.');
    }
    if (!predictionData || predictionData.probability === undefined || predictionData.probability === null) {
        throw new Error('[agentUtils] predictionData requires a probability field for saving forecast.');
    }

    await mongoService.connect(); // Ensure connection

    const historyEntry = {
        timestamp: new Date(),
        forecasterId: forecasterId,
        probability: predictionData.probability,
        rationalSummary: predictionData.rationalSummary || null,
        rationalDetails: predictionData.rationalDetails || null,
        comment: predictionData.comment || null,
        dossier: predictionData.dossier || [],
    };

    try {
        const updateResult = await Scenario.updateOne(
            { _id: scenarioId },
            { $push: { probabilityHistory: historyEntry } }
        );

        if (updateResult.matchedCount === 0) {
            // Throw an error if the scenario wasn't found, as the agent likely expects it to exist
            throw new Error(`[agentUtils] Scenario ${scenarioId} not found during forecast save operation.`);
        }
         if (updateResult.modifiedCount === 0) {
            // Log a warning if matched but not modified, might indicate an issue but not always fatal
             console.warn(`[agentUtils] Scenario ${scenarioId} was matched but probabilityHistory was not updated.`);
         }

        // Consider returning the historyEntry or a success boolean instead of the raw updateResult
        return updateResult; 
    } catch (error) {
        console.error(`[agentUtils] Error saving forecast for scenario ${scenarioId}:`, error);
        throw error;
    }
} 


export const defaultPredictionOutputSchema = z.object({
    response: z.object({
        probability: z.number().describe("The probability estimate. Minimum: 0.001; Maximum: 0.999"),
        rationalSummary: z.string().describe("A brief rationale summary."),
        rationalDetails: z.string().optional().describe("More detailed rationale."),
        dossier: z.array(z.string()).optional().describe("Array of evidence URLs."),
        comment: z.string().optional().describe("Optional internal comment."),
    })
});

export const predictionOutputSchema = zodToJsonSchema(defaultPredictionOutputSchema);

export const predictionOutputSchemaString = JSON.stringify(predictionOutputSchema);


export const closeMongoConnection = async () => {
    await mongoService.disconnect();
}