import { defineEventHandler, getQuery, createError } from 'h3';
import { useRuntimeConfig } from '#imports'; // Import useRuntimeConfig

// Base URLs for different platforms (consider moving to config if grows)
const PLATFORM_API_URLS = {
  Polymarket: 'https://gamma-api.polymarket.com/markets/',
  Metaculus: 'https://www.metaculus.com/api/posts/', // Example
};

// Simple cache object (in-memory, basic)
const cache = new Map();
const CACHE_DURATION_MS = 1 * 60 * 1000; // Cache for 1 minutes
const FETCH_TIMEOUT_MS = 10_000; // 10 seconds timeout

async function fetchPolymarketChance(apiUrl) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    try {
        // Use $fetch available globally in Nuxt server routes, pass signal
        const data = await $fetch(apiUrl, { signal: controller.signal });
        // Clear timeout if fetch completes successfully
        clearTimeout(timeoutId);
        

    if (data && data.outcomes && data.outcomePrices) {
      const outcomes = JSON.parse(data.outcomes);
      const prices = JSON.parse(data.outcomePrices);

      // Find the index of the "Yes" outcome (case-insensitive)
      const yesIndex = outcomes.findIndex(o => typeof o === 'string' && o.toLowerCase() === 'yes');

      if (yesIndex !== -1 && prices[yesIndex] !== undefined) {
        const parsedChance = parseFloat(prices[yesIndex]);
        if (!isNaN(parsedChance)) {
          return { chance: parsedChance, volume: data.volumeNum, status: data.umaResolutionStatus === 'resolved' && data.closed ? 'RESOLVED' : (data.closed ? 'CLOSED' : 'OPEN') };
        } else {
          console.error(`[Scenario Chance Proxy] Failed to parse chance from Polymarket response for ${apiUrl}`);
          throw new Error('Failed to parse chance');
        }
      } else {
        // Handle cases where 'Yes'/'No' might not be present or structure differs
        // For non-binary, maybe we return the structure or a primary outcome?
        console.warn(`[Scenario Chance Proxy] Could not find standard "Yes" outcome/price in Polymarket response for ${apiUrl}. Outcomes: ${data.outcomes}`);
        // For now, let's return null if it's not a clear Yes/No binary market for simplicity
        // Or throw an error if a chance is strictly expected
        // throw new Error('Could not find valid Yes/No outcome/price');
        return null; // Indicate not found or not applicable
      }
    } else {
      console.error(`[Scenario Chance Proxy] Invalid data structure from Polymarket API for ${apiUrl}`);
      throw new Error('Invalid data structure from API');
    }
  } catch (error) {
    // Clear timeout in case of error too
    clearTimeout(timeoutId);

    // Check if error is due to abort/timeout
    if (error.name === 'AbortError') {
        console.warn(`[Scenario Chance Proxy] Timeout fetching Polymarket data for ${apiUrl}`);
        throw createError({
            statusCode: 504, // Gateway Timeout
            statusMessage: `Timeout fetching data from Polymarket after ${FETCH_TIMEOUT_MS / 1000}s`,
        });
    }

    // Check if the error is from $fetch itself (e.g., 404 Not Found)
    if (error.response && error.response.status === 404) {
        console.warn(`[Scenario Chance Proxy] 404 Not Found fetching Polymarket data for ${apiUrl}`);
        // Return null or a specific indicator instead of throwing a server error for a simple 404
        return null;
    }

    console.error(`[Scenario Chance Proxy] Error fetching or parsing Polymarket data for ${apiUrl}:`, error);
    // Re-throw a more specific error or handle it
    throw createError({
      statusCode: error.response?.status || 502, // Use status from upstream if available, else 502
      statusMessage: `Failed to fetch or parse data from Polymarket: ${error.message}`,
    });
  }
}


async function fetchMetaculusChance(apiUrl) {
    const runtimeConfig = useRuntimeConfig();
    const headers = { 'Authorization': `Token ${runtimeConfig.metaculusApiToken}` }; // Use token
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    
    try {
        // Metaculus API endpoint is /api/questions/{id}/
        // The provided apiUrl already includes the base and ID from the calling function
        // CORRECTED: Use /api/posts/{id}/ endpoint
        const data = await $fetch(apiUrl, { 
            signal: controller.signal,
            headers: headers,
            parseResponse: JSON.parse // Ensure response is parsed as JSON
        });
        
        clearTimeout(timeoutId);
        
        // Extract data based on the provided example structure and scraper logic
        // The API returns the question data directly, not nested under 'question' like the posts endpoint
        // CORRECTED: Data is nested under 'question' in the /posts/ response
        if (data && data.question && typeof data.question === 'object' && data.question.type === 'binary') { 
            let currentProbability = null;
            let status = 'UNKNOWN';

            // Get probability from community prediction first, then metaculus prediction, nested under 'question'
            // CORRECTED: Use aggregations path based on response and scraper logic
            const predictionSource = data.question.aggregations?.recency_weighted?.latest || data.question.aggregations?.metaculus_prediction?.latest;

            // Extract probability using correct paths/indices
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
            
            // Get status from the main question object
            // CORRECTED: Get status from either post or question, prioritizing question
            const statusSource = data.question.status || data.status;
            const statusLower = statusSource ? statusSource.toLowerCase() : 'unknown';
            if (statusLower === 'open') status = 'OPEN';
            else if (statusLower === 'closed') status = 'CLOSED'; // Closed but not yet resolved
            else if (statusLower === 'resolved') status = 'RESOLVED';
            else if (statusLower === 'upcoming') status = 'UPCOMING'; // Upcoming/pending
            
            // Return the structured data, volume/liquidity are null for Metaculus
            // Use nr_forecasters or vote score as a proxy for volume?
            // CORRECTED: Use nr_forecasters from post or question
            return {
                 chance: currentProbability,
                 volume: data.nr_forecasters ?? data.question.nr_forecasters ?? null, // Using nr_forecasters as proxy
                 status: status,
                 liquidity: null
            };
        } else if (data && data.question && data.question.type !== 'binary') {
             console.warn(`[Scenario Chance Proxy] Metaculus question ${apiUrl} is not binary (type: ${data.question.type}). Returning null.`);
             return null; // Only handle binary for now
        } else {
            console.error(`[Scenario Chance Proxy] Invalid data structure from Metaculus API for ${apiUrl}`);
            throw new Error('Invalid data structure from API');
        }

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            console.warn(`[Scenario Chance Proxy] Timeout fetching Metaculus data for ${apiUrl}`);
            throw createError({
                statusCode: 504,
                statusMessage: `Timeout fetching data from Metaculus after ${FETCH_TIMEOUT_MS / 1000}s`,
            });
        }
        
        if (error.response && error.response.status === 404) {
            console.warn(`[Scenario Chance Proxy] 404 Not Found fetching Metaculus data for ${apiUrl}`);
            return null; // Return null for 404s
        }
        
        if (error.response && error.response.status === 401) {
           console.error(`[Scenario Chance Proxy] 401 Unauthorized fetching Metaculus data for ${apiUrl}. Check API Token.`);
           throw createError({
             statusCode: 401,
             statusMessage: `Unauthorized fetching Metaculus data. Check API Token.`,
           });
        }

        console.error(`[Scenario Chance Proxy] Error fetching or parsing Metaculus data for ${apiUrl}:`, error);
        throw createError({
            statusCode: error.response?.status || 502,
            statusMessage: `Failed to fetch or parse data from Metaculus: ${error.message}`,
        });
    }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  // Expect 'platform' and 'id' (platformScenarioId)
  const { platform, id } = query;

  if (!platform || !id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required query parameters: platform and id',
    });
  }

  // Construct cache key using platform and id
  const cacheKey = `${platform}:${id}`;
  const cachedItem = cache.get(cacheKey);

  // Check cache
  if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_DURATION_MS)) {
    // console.log(`[Scenario Chance Proxy] Cache hit for ${cacheKey}`);
    return { chance: cachedItem.data.chance, volume: cachedItem.data.volume, status: cachedItem.data.status, liquidity: cachedItem.data.liquidity }; // Return cached data structure
  }

  // console.log(`[Scenario Chance Proxy] Cache miss or expired for ${cacheKey}`);

  try {
    let result = null; // Default to null
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

      // Add cases for other platforms (Metaculus, etc.) here
      case 'Metaculus':
         // Correct Metaculus API endpoint is /api/questions/{id}/
         // The scraper uses /api/posts/{id}/, but the example shows /api/questions/{id} contains the probability data.
         // CORRECTED: Use the /api/posts/ endpoint URL from PLATFORM_API_URLS
         const metaculusBaseUrl = PLATFORM_API_URLS[platform]; // Use the defined base URL
         if (!metaculusBaseUrl) { 
            throw createError({ statusCode: 500, statusMessage: `API URL not configured for platform: ${platform}` });
         }
         apiUrl = `${metaculusBaseUrl}${encodeURIComponent(id)}/`;
         result = await fetchMetaculusChance(apiUrl);
         break;
        
      default:
        throw createError({
          statusCode: 400,
          statusMessage: `Unsupported platform: ${platform}`,
        });
    }

    // Store result (even null) in cache to avoid re-fetching known misses (like 404s or non-binary)
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result ; // Return the result (could be null)

  } catch (error) {
    // Log the error server-side
    console.error(`[Scenario Chance Proxy] Error processing ${platform}:${id}:`, error);

    // Ensure the error is propagated correctly
    if (error.statusCode) {
      throw error; // Re-throw H3 errors directly
    }
    // Wrap other errors
    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error processing scenario chance: ${error.message}`,
    });
  }
});