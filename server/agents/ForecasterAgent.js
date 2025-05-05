import mongoose from 'mongoose';
import Forecaster from '../models/Forecaster.model.js';
import Scenario from '../models/Scenario.model.js';

class ForecasterAgent {
    constructor(config) {
        this.config = config;
        this.forecasterDoc = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;
        try {
            this.forecasterDoc = await Forecaster.findOneAndUpdate(
                { name: this.config.name },
                {
                    $setOnInsert: {
                        name: this.config.name,
                        avatar: this.config.avatar || 'mdi:robot',
                        description: this.config.description || '',
                        type: this.config.type || 'AI',
                        status: this.config.status || 'ACTIVE',
                    }
                },
                { upsert: true, new: true, runValidators: true }
            ).lean();
            this.isInitialized = true;
        } catch (error) {
            console.error(`[${this.config.name}] Initialization failed:`, error);
            throw error;
        }
    }

    async forecast(scenarioOrId) {
        await this.initialize();
        if (!this.isInitialized) {
            throw new Error(`[${this.config.name}] Initialization failed, cannot proceed with forecast.`);
        }

        let scenario;
        try {
            if (typeof scenarioOrId === 'string' || scenarioOrId instanceof mongoose.Types.ObjectId) {
                scenario = await Scenario.findById(scenarioOrId);
            } else if (typeof scenarioOrId === 'object' && scenarioOrId._id) {
                scenario = scenarioOrId;
            } else {
                 throw new Error('Invalid scenarioOrId provided.');
            }
            if (!scenario) throw new Error(`Scenario not found: ${scenarioOrId}`);

            const predictionData = await this._generatePrediction(scenario);

            if (predictionData.probability === undefined || predictionData.probability === null) {
                 console.warn(`[${this.config.name}] _generatePrediction did not return a probability.`);
                 throw new Error(`[${this.config.name}] Prediction generation failed: Missing probability.`);
            }

            const historyEntry = {
                timestamp: new Date(),
                forecasterId: this.forecasterDoc._id,
                probability: predictionData.probability,
                rationalSummary: predictionData.rationalSummary || null,
                rationalDetails: predictionData.rationalDetails || null,
                comment: predictionData.comment || null,
                dossier: predictionData.dossier || [],
            };

            await Scenario.updateOne(
                { _id: scenario._id },
                { $push: { probabilityHistory: historyEntry } }
            );

            return historyEntry;

        } catch (error) {
            console.error(`[${this.config.name}] Error during forecast process for Scenario ID ${scenario?._id || scenarioOrId}:`, error);
            throw error;
        }
    }

    async _generatePrediction(scenario) {
        // eslint-disable-next-line no-unused-vars
        const { _id } = scenario;
        throw new Error('_generatePrediction() must be implemented by subclass');
    }
}

export default ForecasterAgent; 