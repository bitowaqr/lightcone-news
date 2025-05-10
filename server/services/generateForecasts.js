import { forecasterStrange } from '../agents/forecasterStrange.js';
import { forecasterOrunmila } from '../agents/forecasterOrunmila.js';
import { forecasterSibyl } from '../agents/forecasterSibyl.js';
import { forecasterManhattan } from '../agents/forecasterManhattan.js';
import { forecasterTiresias } from '../agents/forecasterTiresias.js';
import { forecasterMoirae } from '../agents/forecasterMoirae.js';
import { forecasterSaruman } from '../agents/forecasterSaruman.js';
import { forecasterGaladriel } from '../agents/forecasterJona.js';
import { forecasterMuadib } from '../agents/forecasterMuaddib.js';

const forecastAgents = {
    'galadriel': forecasterGaladriel,
    'manhattan': forecasterManhattan,
    'moirae': forecasterMoirae,
    'muadib': forecasterMuadib,
    'orunmila': forecasterOrunmila,
    'saruman': forecasterSaruman,
    'sibyl': forecasterSibyl,
    'strange': forecasterStrange,
    'tiresias': forecasterTiresias,
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




// // TESTING
(async () => {
    const fs = await import('fs');
  const { closeMongoConnection } = await import('../utils/agentUtils.js');
  const scenarioId = '681c1f33d173119b5f84b5d2';
  // const result = await generateForecastsSequential(scenarioId, { save: true, log: true, timeout: 5_000 });
  const result = await generateForecastsParallel(scenarioId, { save: false, log: true });
  fs.writeFileSync('forecasts3.json', JSON.stringify(result, null, 2));
  console.log("----------------");
  console.log("Finished!");
  console.log("----------------");
  await closeMongoConnection();
})();


