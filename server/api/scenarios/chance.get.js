import { defineEventHandler, getQuery, createError } from 'h3';

// Base URLs for different platforms (consider moving to config if grows)
const PLATFORM_API_URLS = {
  Polymarket: 'https://gamma-api.polymarket.com/markets/',
  // Metaculus: 'https://www.metaculus.com/api2/questions/', // Example
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
    return  {chance: null, volume: null, status: null, liquidity: null}
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
        apiUrl = `${PLATFORM_API_URLS[platform]}${encodeURIComponent(id)}`;
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