import { forecasterBilly } from '../agents/forecasterBilly.js';
import { forecasterNate } from '../agents/forecasterNate.js';
import { forecasterPhil } from '../agents/forecasterPhil.js';
import { forecasterDan } from '../agents/forecasterDan.js';
import { forecasterLea } from '../agents/forecasterLea.js';
import { forecasterBarb } from '../agents/forecasterBarb.js';
import { forecasterRobin } from '../agents/forecasterRobin.js';
import fs from 'fs';

const forecastAgents = {
    'billy': forecasterBilly,
    'nate': forecasterNate,
    'phil': forecasterPhil,
    'dan': forecasterDan,
    'lea': forecasterLea,
    'barb': forecasterBarb,
    'robin': forecasterRobin
}

export const generateForecastsParallel = async (scenarioId, opts = {}) => {
    const { save = true, log = false, agents = null } = opts;
    const agentsToUse = agents || Object.keys(forecastAgents);
    const forecastPromises = agentsToUse.map(agent => 
        forecastAgents[agent](scenarioId, save, log).catch(error => {
            if (log) console.error(`[${agent}] Forecast generation failed:`, error);
            return null; // Return null for failed agents
        })
    );
    const forecasts = await Promise.all(forecastPromises);
    return forecasts.filter(forecast => forecast !== null); // Filter out null results
}

export const generateForecastsSequential = async (scenarioId, opts = {}) => {
    const { save = true, log = false, agents = null, timeout = 10_000 } = opts;
    const agentsToUse = agents || Object.keys(forecastAgents);
    const forecasts = [];
    for (const agent of agentsToUse) {
        try {
            const forecast = await forecastAgents[agent](scenarioId, save, log);
            forecasts.push(forecast);
            console.log(`[${agent}] Forecast: ${forecast.predictionData.probability}`);
        } catch (error) {
            if (log) console.error(`[${agent}] Forecast generation failed:`, error);
        }
        console.log(`[${agent}] Waiting for ${timeout}ms...`);
        await new Promise(resolve => setTimeout(resolve, timeout));
    }
    return forecasts;
}




// TESTING
(async () => {
  const { closeMongoConnection } = await import('../utils/agentUtils.js');
  const scenarioId = '6816f8069a446c44b935505e';
  const result = await generateForecastsSequential(scenarioId, { save: false, log: true, timeout: 5_000 });
  fs.writeFileSync('forecasts2.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await closeMongoConnection();
})();


