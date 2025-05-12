import { forecasterStrange } from '../agents/forecasterStrange.js';
import { forecasterOrunmila } from '../agents/forecasterOrunmila.js';
import { forecasterSibyl } from '../agents/forecasterSibyl.js';
import { forecasterManhattan } from '../agents/forecasterManhattan.js';
import { forecasterTiresias } from '../agents/forecasterTiresias.js';
import { forecasterMoirae } from '../agents/forecasterMoirae.js';
import { forecasterSaruman } from '../agents/forecasterSaruman.js';
import { forecasterGaladriel } from '../agents/forecasterGaladriel.js'; // Excluding Jona/Galadriel for now
import { forecasterMuaddib } from '../agents/forecasterMuaddib.js';
import Scenario from '../models/Scenario.model.js';
import Forecaster from '../models/Forecaster.model.js';
import { mongoService } from './mongo.js';

// List of all imported forecaster objects (excluding Jona/Galadriel)
const allAgentObjects = [
    forecasterGaladriel,
    forecasterManhattan,
    forecasterMoirae,
    forecasterMuaddib,
    forecasterOrunmila,
    forecasterSaruman,
    forecasterSibyl,
    forecasterStrange,
    forecasterTiresias,
];

// Dynamically build the forecastAgents map
const forecastAgents = allAgentObjects.reduce((acc, agent) => {
    if (agent && typeof agent.getName === 'function') {
        acc[agent.getName()] = agent;
    } else {
        console.warn('Encountered an invalid agent object while building forecastAgents map:', agent);
    }
    return acc;
}, {});

export const forecastAgentsNames = Object.keys(forecastAgents);


export const generateForecastsParallel = async (scenarioId, opts = {}) => {
    const { save = true, log = false, agents = null } = opts;
    // Use Object.keys(forecastAgents) to get names for agentsToUse if agents param is null
    const agentNamesToUse = agents || Object.keys(forecastAgents);

    await mongoService.connect();

    const forecastPromises = agentNamesToUse.map(async (agentName) => {
        const agentObject = forecastAgents[agentName];
        if (!agentObject) {
            if (log) console.warn(`[generateForecastsParallel] Agent object for ${agentName} not found. Skipping.`);
            return null;
        }
        try {
            // Use agentName for DB lookup, which is the key in forecastAgents map (e.g., 'Muadib-bot v0.1')
            const forecasterMeta = agentObject.getMeta(); // Get the latest meta from the agent object
            const forecasterDoc = await Forecaster.findOneAndUpdate(
                { name: agentName }, // Find by name
                { $set: { ...forecasterMeta, lastUsed: new Date() } }, // Update with latest meta and lastUsed
                { new: true, upsert: true } // Create if not found, return the updated/new doc
            ).lean();
            // Check status explicitly after upserting/finding
            if (!forecasterDoc || forecasterDoc.status !== 'ACTIVE' || forecasterDoc.type !== 'AI') {
                if (log) console.warn(`[generateForecastsParallel] Forecaster DB record for ${agentName} not found, not active, or not AI type after update/upsert. Skipping.`);
                return null;
            }

            let existingForecast = null;
            const scenarioDoc = await Scenario.findById(scenarioId).lean();
            if (scenarioDoc && scenarioDoc.probabilityHistory && scenarioDoc.probabilityHistory.length > 0) {
                const historyReversed = [...scenarioDoc.probabilityHistory].reverse();
                const lastForecastByAgent = historyReversed.find(
                    entry => entry.forecasterId && entry.forecasterId.toString() === forecasterDoc._id.toString()
                );
                if (lastForecastByAgent) {
                    existingForecast = {
                        _id: lastForecastByAgent._id.toString(), // Ensure _id is passed for existing forecast
                        probability: lastForecastByAgent.probability,
                        rationalSummary: lastForecastByAgent.rationalSummary,
                        rationalDetails: lastForecastByAgent.rationalDetails,
                        dossier: lastForecastByAgent.dossier,
                        timestamp: lastForecastByAgent.timestamp
                    };
                }
            }
            // Use agentObject.invoke to call the forecaster
            return agentObject.invoke(scenarioId, save, log, existingForecast).catch(error => {
                if (log) console.error(`[${agentName}] Forecast generation failed:`, error);
                return null;
            });
        } catch (error) {
            if (log) console.error(`[generateForecastsParallel] Error processing agent ${agentName}:`, error);
            return null;
        }
    });
    const forecasts = await Promise.all(forecastPromises);
    return forecasts.filter(forecast => forecast !== null);
}

export const generateForecastsSequential = async (scenarioId, opts = {}) => {
    const { save = true, log = false, agents = null, timeout = 10_000, randomize = true } = opts;
    let agentNamesToUse = agents || Object.keys(forecastAgents);
    if (randomize) agentNamesToUse = agentNamesToUse.sort(() => Math.random() - 0.5);
    
    await mongoService.connect();

    const forecasts = [];
    for (const agentName of agentNamesToUse) {
        const agentObject = forecastAgents[agentName];
        if (!agentObject) {
            if (log) console.warn(`[generateForecastsSequential] Agent object for ${agentName} not found. Skipping.`);
            if (timeout > 0 && agentNamesToUse.indexOf(agentName) < agentNamesToUse.length - 1) {
                if(log) console.log(`[${agentName}] Skipping, waiting for ${timeout}ms...`);
                await new Promise(resolve => setTimeout(resolve, timeout));
            }
            continue;
        }
        try {
            // Use agentName for DB lookup
            const forecasterMeta = agentObject.getMeta(); // Get the latest meta from the agent object
            const forecasterDoc = await Forecaster.findOneAndUpdate(
                 { name: agentName }, // Find by name
                 { $set: { ...forecasterMeta, lastUsed: new Date() } }, // Update with latest meta and lastUsed
                 { new: true, upsert: true } // Create if not found, return the updated/new doc
            ).lean();

             // Check status explicitly after upserting/finding
            if (!forecasterDoc || forecasterDoc.status !== 'ACTIVE' || forecasterDoc.type !== 'AI') {
                 if (log) console.warn(`[generateForecastsSequential] Forecaster DB record for ${agentName} not found, not active, or not AI type after update/upsert. Skipping.`);
                 if (timeout > 0 && agentNamesToUse.indexOf(agentName) < agentNamesToUse.length - 1) {
                    if(log) console.log(`[${agentName}] Skipping, waiting for ${timeout}ms...`);
                    await new Promise(resolve => setTimeout(resolve, timeout));
                 }
                 continue;
            }

            let existingForecast = null;
            const scenarioDoc = await Scenario.findById(scenarioId).lean();
            if (scenarioDoc && scenarioDoc.probabilityHistory && scenarioDoc.probabilityHistory.length > 0) {
                const historyReversed = [...scenarioDoc.probabilityHistory].reverse();
                const lastForecastByAgent = historyReversed.find(
                    entry => entry.forecasterId && entry.forecasterId.toString() === forecasterDoc._id.toString()
                );
                if (lastForecastByAgent) {
                    existingForecast = {
                        _id: lastForecastByAgent._id.toString(), // Ensure _id is passed for existing forecast
                        probability: lastForecastByAgent.probability,
                        rationalSummary: lastForecastByAgent.rationalSummary,
                        rationalDetails: lastForecastByAgent.rationalDetails,
                        dossier: lastForecastByAgent.dossier,
                        timestamp: lastForecastByAgent.timestamp
                    };
                }
            }
            if(log) console.log(`[${agentName}] Existing forecast? ${existingForecast ? 'yes' : 'no'}`);

            // Use agentObject.invoke to call the forecaster
            const forecast = await agentObject.invoke(scenarioId, save, log, existingForecast);
            forecasts.push(forecast);
            if(log) console.log(`[${agentName}] Forecast: ${forecast.predictionData.probability}`);
        } catch (error) {
            if (log) console.error(`[${agentName}] Forecast generation failed:`, error);
        }
        if (timeout > 0 && agentNamesToUse.indexOf(agentName) < agentNamesToUse.length - 1) {
            if(log) console.log(`[${agentName}] Waiting for ${timeout}ms...`);
            await new Promise(resolve => setTimeout(resolve, timeout));
        }
    }
    return forecasts;
}

// // // TESTING
// (async () => {
//     const fs = await import('fs');
//   const { closeMongoConnection } = await import('../utils/agentUtils.js');
//   const scenarioId = '681c1f33d173119b5f84b5d2';
//   const result = await generateForecastsSequential(scenarioId, { save: true, log: true, agents: null, timeout: 1_000 });
//   // const result = await generateForecastsParallel(scenarioId, { save: true, log: true, agents: ['Galadriel-bot v0.1'] }); // Example using actual name
//   fs.writeFileSync('forecasts-all.json', JSON.stringify(result, null, 2));
//   await closeMongoConnection();
// })();


