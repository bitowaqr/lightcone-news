import { defineEventHandler, getQuery, createError } from 'h3';
import mongoose from 'mongoose';
import Scenario from '../../models/Scenario.model.js'; // Adjust path as needed
import { getPolymarketPriceHistory } from '../../scraper-scenarios/polymarket.js'; // Adjust path as needed
import { useRuntimeConfig } from '#imports'; // Import useRuntimeConfig

// Simple cache (optional, but recommended for performance)
const cache = new Map();
const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache for 5 minutes
const FETCH_TIMEOUT_MS = 15_000; // 15 seconds timeout

async function fetchPolymarketHistory(scenario) {
  console.log("scenario");
  console.log("scenario");
  console.log("scenario");
  console.log("scenario");
  console.log("scenario");
  console.log(scenario);
  
  if (!scenario || scenario.platform !== 'Polymarket' || !scenario.clobTokenIds || Object.keys(scenario.clobTokenIds).length === 0) {
    console.warn(`[Scenario History] Invalid scenario data for Polymarket history fetch: ID ${scenario?.platformScenarioId}`);
    return null; // Cannot fetch without required info
  }

  const historyData = {};
  const tokenIdsToFetch = [];

  // Determine which tokens to fetch based on scenario type
  if (scenario.scenarioType === 'BINARY') {
    const yesTokenId = scenario.clobTokenIds['Yes']; // Case-sensitive match assumed from scraper
    const noTokenId = scenario.clobTokenIds['No'];
    if (yesTokenId) tokenIdsToFetch.push({ outcome: 'Yes', id: yesTokenId });
    // Optionally fetch 'No' history as well if needed for comparison/full picture
    // if (noTokenId) tokenIdsToFetch.push({ outcome: 'No', id: noTokenId });
  } else if (scenario.scenarioType === 'CATEGORICAL') {
     // Fetch history for all categorical options
     Object.entries(scenario.clobTokenIds).forEach(([outcome, tokenId]) => {
        if (tokenId) {
             tokenIdsToFetch.push({ outcome, id: tokenId });
        }
     });
  } else {
    console.warn(`[Scenario History] History fetch not implemented for type ${scenario.scenarioType}, ID: ${scenario.platformScenarioId}`);
    return null; // Type not supported for history chart yet
  }

  if (tokenIdsToFetch.length === 0) {
     console.warn(`[Scenario History] No valid token IDs found to fetch history for ${scenario.platformScenarioId}`);
     return null;
  }

  // Determine market duration for fidelity calculation
  const nowMs = Date.now();
  let startMs = scenario.openDate ? new Date(scenario.openDate).getTime() : null;
  // Use resolutionCloseDate if available (market finished), otherwise use now
  let endMs = scenario.resolutionData?.resolutionCloseDate 
                ? new Date(scenario.resolutionData.resolutionCloseDate).getTime() 
                : nowMs;

  // Validate dates and calculate duration
  let durationMinutes = null;
  if (startMs && endMs && endMs > startMs) {
      durationMinutes = (endMs - startMs) / (1000 * 60);
  } else {
      // Fallback if dates are missing or invalid - getPolymarketPriceHistory will use its default
      console.warn(`[Scenario History] Could not determine valid duration for ${scenario.platformScenarioId}. Using default fidelity calculation.`);
      // durationMinutes remains null, letting the scraper function use its default
  }
  
  // Fetch history for each token ID
  // Use Promise.allSettled to handle potential errors for individual tokens
  const results = await Promise.allSettled(
    tokenIdsToFetch.map(async ({ outcome, id }) => {
        // Add a timeout mechanism around the scraper function call
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        try {
            // Pass the calculated duration (or null) to the updated function
          const history = await getPolymarketPriceHistory(id, durationMinutes);
          
            clearTimeout(timeoutId);
            if (history && Array.isArray(history.history)) {
                return { outcome, history: history.history };
            } else {
                 console.warn(`[Scenario History] Invalid history structure received for token ${id}`);
                 return { outcome, history: [] }; // Return empty if format is bad
            }
        } catch (fetchError) {
            clearTimeout(timeoutId);
            // Handle AbortError specifically if the scraper is enhanced later
            if (fetchError.name === 'AbortError') {
                 console.warn(`[Scenario History] Timeout fetching history for token ${id}`);
                 throw createError({statusCode: 504, statusMessage: `Timeout fetching history for token ${id}`})
            }
            console.error(`[Scenario History] Error fetching history for token ${id}:`, fetchError);
            throw createError({statusCode: 502, statusMessage: `Failed to fetch history for token ${id}`}) // Propagate as a server error for this token
        }
    })
  );
  
  // Process results
  let hasError = false;
  results.forEach((result, index) => {
      const { outcome } = tokenIdsToFetch[index];
      if (result.status === 'fulfilled') {
          historyData[outcome] = result.value.history; // { Yes: [...], No: [...] } or { OptionA: [...], OptionB: [...] }
      } else {
          // Log error but potentially continue if other tokens succeeded
          console.error(`[Scenario History] Failed to fetch history for outcome "${outcome}": ${result.reason}`);
          historyData[outcome] = []; // Provide empty array on failure
          hasError = true; // Indicate that at least one fetch failed
      }
  });

  // If ALL fetches failed, throw an error - otherwise return partial data
  if (hasError && Object.values(historyData).every(h => h.length === 0)) {
     throw createError({statusCode: 502, statusMessage: 'Failed to fetch any price history data.'})
  }

  return historyData;
}

async function fetchMetaculusHistory(scenario) {
    const runtimeConfig = useRuntimeConfig();
    const headers = { 'Authorization': `Token ${runtimeConfig.metaculusApiToken}` };
    // Metaculus uses question ID, which should be stored in platformQuestionId or platformScenarioId if they are the same
    // Let's assume platformScenarioId holds the correct ID for the API endpoint.
    const postId = scenario.platformScenarioId;
    if (!postId) {
        console.warn(`[Scenario History] Missing Metaculus post ID for scenario: ${scenario._id}`);
        return null;
    }
    
    // Correct endpoint for fetching a specific question's details including history
    const apiUrl = `https://www.metaculus.com/api/posts/${encodeURIComponent(postId)}/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
        const data = await $fetch(apiUrl, {
            signal: controller.signal,
            headers: headers,
            parseResponse: JSON.parse
        });
        clearTimeout(timeoutId);

        if (!data || typeof data !== 'object') {
            console.error(`[Scenario History] Invalid data structure from Metaculus API for ${apiUrl}`);
            throw new Error('Invalid data structure from API');
        }

        // CORRECTED: History is under aggregations.recency_weighted.history
        const historySource = data.question?.aggregations?.recency_weighted?.history;

        if (!historySource || !Array.isArray(historySource)) {
            console.warn(`[Scenario History] No history data found in Metaculus response for ${apiUrl}`);
            return { Yes: [] }; // Return empty history for "Yes" outcome
        }

        // Format history: { t: timestamp_ms, y: probability }
        // Use 'x' for timestamp (seconds) and 'y1' for probability in community_prediction history
        const formattedHistory = historySource
            .map(item => {
                // CORRECTED: Use structure from recency_weighted.history: { start_time: sec, centers: [prob] }
                if (item.start_time !== undefined && item.centers && Array.isArray(item.centers) && item.centers.length > 0 && typeof item.centers[0] === 'number') {
                     return {
                         t: item.start_time * 1000, // Convert seconds to milliseconds
                         y: item.centers[0]         // Probability is the first element in centers
                     };
                }
                return null; // Skip items with unexpected structure
            })
            .filter(item => item !== null && !isNaN(item.t) && !isNaN(item.y)); // Filter out nulls and invalid data

        // Sort by time just in case
        formattedHistory.sort((a, b) => a.t - b.t);

        // For binary, Metaculus provides the probability of 'Yes' directly
        return { Yes: formattedHistory };

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            console.warn(`[Scenario History] Timeout fetching Metaculus history for ${apiUrl}`);
            throw createError({
                statusCode: 504,
                statusMessage: `Timeout fetching Metaculus history after ${FETCH_TIMEOUT_MS / 1000}s`,
            });
        }
        
        if (error.response && error.response.status === 404) {
            console.warn(`[Scenario History] 404 Not Found fetching Metaculus history for ${apiUrl}`);
            // Throw 404 so the main handler catches it? Or return null? Let's throw.
            throw createError({ statusCode: 404, statusMessage: `Metaculus post ${postId} not found.` });
        }
        
         if (error.response && error.response.status === 401) {
           console.error(`[Scenario History] 401 Unauthorized fetching Metaculus data for ${apiUrl}. Check API Token.`);
           throw createError({
             statusCode: 401,
             statusMessage: `Unauthorized fetching Metaculus data. Check API Token.`,
           });
        }

        console.error(`[Scenario History] Error fetching or parsing Metaculus history for ${apiUrl}:`, error);
        throw createError({
            statusCode: error.response?.status || 502,
            statusMessage: `Failed to fetch or parse history data from Metaculus: ${error.message}`,
        });
    }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { platform, id: platformScenarioId } = query; // Use 'id' from query as platformScenarioId

  if (!platform || !platformScenarioId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required query parameters: platform and id',
    });
  }

  const cacheKey = `history:${platform}:${platformScenarioId}`;
  const cachedItem = cache.get(cacheKey);

  // Check cache
  if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_DURATION_MS)) {
    // console.log(`[Scenario History] Cache hit for ${cacheKey}`);
    return cachedItem.data;
  }

  // console.log(`[Scenario History] Cache miss or expired for ${cacheKey}`);

  try {
    // 1. Find the Scenario document in the database
    const scenario = await Scenario.findOne({ platform, platformScenarioId }).lean();

    if (!scenario) {
      throw createError({ statusCode: 404, statusMessage: 'Scenario not found in database' });
    }

    let history = null;
    switch (platform) {
      case 'Polymarket':
        history = await fetchPolymarketHistory(scenario);
        break;
      case 'Metaculus':
        history = await fetchMetaculusHistory(scenario);
        break;
      default:
        throw createError({
          statusCode: 400,
          statusMessage: `History fetching not supported for platform: ${platform}`,
        });
    }

    // Store result (even null/empty) in cache
    cache.set(cacheKey, { data: history, timestamp: Date.now() });

    if (history === null) {
        // Could happen if type not supported or required data missing
        return {}; // Return empty object to indicate no history available
    }

    return history; // Return the fetched history object { "OutcomeName": [...] }

  } catch (error) {
    console.error(`[Scenario History] Error processing ${platform}:${platformScenarioId}:`, error);
    // Clear cache entry on error? Maybe not, could cause repeated calls for persistent errors
    if (error.statusCode) {
      throw error; // Re-throw H3 errors
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Internal server error processing scenario history: ${error.message}`,
    });
  }
}); 