import { defineEventHandler, getQuery, createError } from 'h3';
import { useRuntimeConfig } from '#imports';
import { fetchAndFormatSingleManifoldMarket } from '../../scraper-scenarios/manifold.js';
import Scenario from '../../models/Scenario.model.js';
import mongoose from 'mongoose';

const PLATFORM_API_URLS = {
  Polymarket: 'https://gamma-api.polymarket.com/markets/',
  Metaculus: 'https://www.metaculus.com/api/posts/',
};

const cache = new Map();
const CACHE_DURATION_MS = 1 * 60 * 1000;
const FETCH_TIMEOUT_MS = 10_000;

async function fetchPolymarketChance(apiUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    try {
        const data = await $fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (data && data.outcomes && data.outcomePrices) {
            const outcomes = JSON.parse(data.outcomes);
            const prices = JSON.parse(data.outcomePrices);
            const yesIndex = outcomes.findIndex(o => typeof o === 'string' && o.toLowerCase() === 'yes');

            if (yesIndex !== -1 && prices[yesIndex] !== undefined) {
                const parsedChance = parseFloat(prices[yesIndex]);
                if (!isNaN(parsedChance)) {
                    return { chance: parsedChance, volume: data.volumeNum, status: data.umaResolutionStatus === 'resolved' && data.closed ? 'RESOLVED' : (data.closed ? 'CLOSED' : 'OPEN') };
                }
                throw new Error('Failed to parse chance');
            }
            return null;
        }
        throw new Error('Invalid data structure from API');
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw createError({ statusCode: 504, statusMessage: `Timeout fetching data from Polymarket after ${FETCH_TIMEOUT_MS / 1000}s` });
        }
        if (error.response && error.response.status === 404) {
            return null;
        }
        throw createError({ statusCode: error.response?.status || 502, statusMessage: `Failed to fetch or parse data from Polymarket: ${error.message}` });
    }
}

async function fetchMetaculusChance(apiUrl) {
    const runtimeConfig = useRuntimeConfig();
    const headers = { 'Authorization': `Token ${runtimeConfig.metaculusApiToken}` };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    try {
        const data = await $fetch(apiUrl, { 
            signal: controller.signal,
            headers: headers,
            parseResponse: JSON.parse
        });
        
        clearTimeout(timeoutId);
        
        if (data && data.question && typeof data.question === 'object' && data.question.type === 'binary') { 
            let currentProbability = null;
            let status = 'UNKNOWN';
            const predictionSource = data.question.aggregations?.recency_weighted?.latest || data.question.aggregations?.metaculus_prediction?.latest;

            if (predictionSource) {
                let prob = null;
                if (predictionSource.centers && predictionSource.centers.length > 0) {
                    prob = parseFloat(predictionSource.centers[0]);
                } else if (predictionSource.forecast_values && predictionSource.forecast_values.length === 2) {
                    prob = parseFloat(predictionSource.forecast_values[1]);
                }
                
                if (prob !== null && !isNaN(prob)) {
                    currentProbability = prob;
                }
            }
            
            const statusSource = data.question.status || data.status;
            const statusLower = statusSource ? statusSource.toLowerCase() : 'unknown';
            if (statusLower === 'open') status = 'OPEN';
            else if (statusLower === 'closed') status = 'CLOSED';
            else if (statusLower === 'resolved') status = 'RESOLVED';
            else if (statusLower === 'upcoming') status = 'UPCOMING';
            return {
                 chance: currentProbability,
                 volume: data.nr_forecasters ?? data.question.nr_forecasters ?? null,
                 status: status,
                 liquidity: null
            };
        } else if (data && data.question && data.question.type !== 'binary') {
            return null;
        } else {
            throw new Error('Invalid data structure from API');
        }

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw createError({ statusCode: 504, statusMessage: `Timeout fetching data from Metaculus after ${FETCH_TIMEOUT_MS / 1000}s` });
        }
        if (error.response && error.response.status === 404) {
            return null;
        }
        if (error.response && error.response.status === 401) {
           throw createError({ statusCode: 401, statusMessage: `Unauthorized fetching Metaculus data. Check API Token.` });
        }
        throw createError({ statusCode: error.response?.status || 502, statusMessage: `Failed to fetch or parse data from Metaculus: ${error.message}` });
    }
}

async function fetchManifoldChance(platformScenarioId) {
    if (!platformScenarioId) {
        return null;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        throw new Error('Manifold chance fetch timed out');
    }, FETCH_TIMEOUT_MS);

    try {
        const scenarioData = await fetchAndFormatSingleManifoldMarket(platformScenarioId);
        clearTimeout(timeoutId);

        if (!scenarioData) {
            return null;
        }

        return {
            chance: scenarioData.currentProbability,
            volume: scenarioData.volume ?? null,
            status: scenarioData.status ?? 'UNKNOWN',
            liquidity: scenarioData.liquidity ?? null,
        };

    } catch (error) {
        clearTimeout(timeoutId);
        if (error.message === 'Manifold chance fetch timed out') {
            throw createError({ statusCode: 504, statusMessage: `Timeout fetching Manifold chance after ${FETCH_TIMEOUT_MS / 1000}s` });
        }
        throw createError({ statusCode: 502, statusMessage: `Failed to fetch or process Manifold chance data: ${error.message}` });
    }
}

async function fetchLightconeChance(platformScenarioId) {
  try {
    const scenario = await Scenario.findOne({ platformScenarioId: platformScenarioId }).select('scenarioType probabilityHistory status').lean();
    if (!scenario) {
      return null;
    }

    if (scenario.scenarioType !== 'BINARY') {
      return null;
    }

    if (!scenario.probabilityHistory || scenario.probabilityHistory.length === 0) {
      return { chance: null, volume: 0, status: scenario.status, liquidity: null };
    }

    const latestForecasts = new Map();

    for (const forecast of scenario.probabilityHistory) {
      if (forecast.forecasterId && forecast.timestamp && typeof forecast.probability === 'number' && !isNaN(forecast.probability)) {
        const forecasterIdString = forecast.forecasterId.toString();
        const existing = latestForecasts.get(forecasterIdString);
        if (!existing || forecast.timestamp > existing.timestamp) {
          latestForecasts.set(forecasterIdString, {
            probability: forecast.probability,
            timestamp: forecast.timestamp
          });
        }
      }
    }

    const probabilities = Array.from(latestForecasts.values()).map(f => f.probability);
    
    if (probabilities.length === 0) {
      return { chance: null, volume: 0, status: scenario.status, liquidity: null };
    }

    probabilities.sort((a, b) => a - b);

    let medianChance;
    const mid = Math.floor(probabilities.length / 2);
    if (probabilities.length % 2 === 0) {
      medianChance = (probabilities[mid - 1] + probabilities[mid]) / 2;
    } else {
      medianChance = probabilities[mid];
    }

    return {
      chance: medianChance,
      volume: latestForecasts.size,
      status: scenario.status,
      liquidity: null
    };

  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
        return null;
    }
    throw createError({ statusCode: 500, statusMessage: `Internal server error fetching Lightcone chance: ${error.message}` });
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { platform, id } = query;

  if (!platform || !id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required query parameters: platform and id' });
  }

  const cacheKey = `${platform}:${id}`;
  const cachedItem = cache.get(cacheKey);
  

  if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_DURATION_MS) && cachedItem.data) {
    return { chance: cachedItem.data.chance, volume: cachedItem.data.volume, status: cachedItem.data.status, liquidity: cachedItem.data.liquidity };
  }

  try {
    let result = null;
    let apiUrl = '';

    switch (platform) {
      case 'Polymarket':
        const baseUrl = PLATFORM_API_URLS[platform];
        if (!baseUrl) {
           throw createError({ statusCode: 500, statusMessage: `API URL not configured for platform: ${platform}` });
        }
        apiUrl = `${baseUrl}${encodeURIComponent(id)}`;
        result = await fetchPolymarketChance(apiUrl);
        break;

      case 'Metaculus':
         const metaculusBaseUrl = PLATFORM_API_URLS[platform];
         if (!metaculusBaseUrl) { 
            throw createError({ statusCode: 500, statusMessage: `API URL not configured for platform: ${platform}` });
         }
         apiUrl = `${metaculusBaseUrl}${encodeURIComponent(id)}/`;
         result = await fetchMetaculusChance(apiUrl);
         break;
        
      case 'Manifold':
        result = await fetchManifoldChance(id);
        break;

      case 'Lightcone':
        result = await fetchLightconeChance(id);
        break;

      default:
        throw createError({ statusCode: 400, statusMessage: `Unsupported platform: ${platform}` });
    }

    if (result) {
      if (result.chance === undefined) result.chance = null;
      if (result.volume === undefined) result.volume = null;
      if (result.status === undefined) result.status = null;
      if (result.liquidity === undefined) result.liquidity = null;
    }

    if (result == null) {
      console.log(`[Chance] No result found for ${platform}:${id}`);
      return { chance: null, volume: null, status: null, liquidity: null };
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;

  } catch (error) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({ statusCode: 500, statusMessage: `Internal server error processing scenario chance: ${error.message}` });
  }
});