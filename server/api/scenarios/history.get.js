import { defineEventHandler, getQuery, createError } from 'h3';
import mongoose from 'mongoose';
import Scenario from '../../models/Scenario.model.js'; // Adjust path as needed
import { getPolymarketPriceHistory } from '../../scraper-scenarios/polymarket.js'; // Adjust path as needed
import { getManifoldMarketProbHistory } from '../../scraper-scenarios/manifold.js'; // <-- Import Manifold history function
import { useRuntimeConfig } from '#imports'; // Import useRuntimeConfig

// Simple cache (optional, but recommended for performance)
const cache = new Map();
const CACHE_DURATION_MS = 5 * 60 * 1000; // Cache for 5 minutes
const FETCH_TIMEOUT_MS = 15_000; // 15 seconds timeout

async function fetchPolymarketHistory(scenario) {
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
  
  // Add a timeout mechanism around the scraper function call
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  // Fetch history for each token ID
  // Use Promise.allSettled to handle potential errors for individual tokens
  const results = await Promise.allSettled(
    tokenIdsToFetch.map(async ({ outcome, id }) => {      
      try {
          // Pass the calculated duration (or null) to the updated function
          const history = await getPolymarketPriceHistory(id, durationMinutes);
          
          if (history && Array.isArray(history.history)) {
              return { outcome, history: history.history };
          } else {
               console.warn(`[Scenario History] Invalid history structure received for token ${id}`);
               return { outcome, history: [] }; // Return empty if format is bad
          }
      } catch (fetchError) {
          console.error(`[Scenario History] Error fetching history for token ${id}:`, fetchError);
          throw fetchError; // Re-throw error to be caught by timeout wrapper
      }
    })
  );

  // Clear timeout if all fetches complete before timeout
  clearTimeout(timeoutId);
  
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

// --- Manifold History Fetcher ---
async function fetchManifoldHistory(scenario) {
    const marketId = scenario.platformScenarioId;
    if (!marketId) {
        console.warn(`[Scenario History] Missing Manifold market ID (platformScenarioId) for scenario: ${scenario._id}`);
        return null;
    }

    // Add a timeout mechanism around the scraper function call
    const controller = new AbortController(); // Note: AbortController might not be directly usable with the current Manifold fetch loop
    const timeoutId = setTimeout(() => {
      // Manually throwing an error on timeout as AbortSignal isn't easily integrated into the fetch loop
      // Need to ensure this error is caught appropriately
      throw new Error('Manifold history fetch timed out'); 
    }, FETCH_TIMEOUT_MS);

    try {
        const historyResult = await getManifoldMarketProbHistory(marketId);
        clearTimeout(timeoutId);

        if (historyResult && historyResult.Probability) {
             // Manifold function already returns { Probability: [...] }, 
             // which aligns with { Yes: [...] } for binary Metaculus.
             // For consistency, we could rename "Probability" to "Yes" if it's BINARY?
             if(scenario.scenarioType === 'BINARY'){
                return { Yes: historyResult.Probability };
             } else {
                 // How to handle non-binary Manifold history if needed? 
                 // For now, just return the structure as is if non-binary.
                 console.warn(`[Scenario History] Returning raw history structure for non-binary Manifold market ${marketId}`);
                 return historyResult; // e.g., { Probability: [...] }
             }
        } else {
             console.warn(`[Scenario History] No history data found or invalid structure from getManifoldMarketProbHistory for ${marketId}`);
             return { Yes: [] }; // Return empty for binary case on failure
        }
    } catch (error) {
        clearTimeout(timeoutId);
        // Check if it's our manual timeout error
        if (error.message === 'Manifold history fetch timed out') {
             console.warn(`[Scenario History] Timeout fetching Manifold history for ${marketId}`);
             throw createError({statusCode: 504, statusMessage: `Timeout fetching Manifold history after ${FETCH_TIMEOUT_MS / 1000}s`});
        }
        console.error(`[Scenario History] Error fetching Manifold history for ${marketId}:`, error);
        throw createError({statusCode: 502, statusMessage: `Failed to fetch history data from Manifold: ${error.message}`});
    }
}

// --- Lightcone History Fetcher --- Calculate Median History at Each Timestamp ---
async function fetchLightconeHistory(scenario) {
    if (!scenario) {
        console.warn(`[Scenario History] Invalid scenario data provided for Lightcone history fetch.`);
        return null;
    }

    if (scenario.scenarioType !== 'BINARY') {
        console.warn(`[Scenario History] Median history fetch for Lightcone only implemented for BINARY type. Scenario ID: ${scenario._id}, Type: ${scenario.scenarioType}`);
        return null; // Return null for non-binary
    }

    const history = scenario.probabilityHistory;

    if (!history || history.length === 0) {
        console.warn(`[Scenario History] No probability history found for Lightcone scenario: ${scenario._id}`);
        return { Yes: [] }; // Return empty chart data
    }

    // 1. Filter for valid entries and sort primarily by timestamp, secondarily maybe by something else if needed
    const validHistory = history
        .filter(f => f.timestamp && !isNaN(new Date(f.timestamp).getTime()) && f.forecasterId && typeof f.probability === 'number' && !isNaN(f.probability))
        .map(f => ({ ...f, timestampMillis: new Date(f.timestamp).getTime() })) // Pre-calculate milliseconds
        .sort((a, b) => a.timestampMillis - b.timestampMillis);

    if (validHistory.length === 0) {
        console.warn(`[Scenario History] No valid entries found in probability history for Lightcone scenario: ${scenario._id}`);
        return { Yes: [] };
    }

    // 2. Get all unique timestamps where forecasts occurred
    const uniqueTimestamps = [...new Set(validHistory.map(f => f.timestampMillis))].sort((a, b) => a - b);

    const medianHistoryPoints = [];

    // 3. Iterate through each unique timestamp
    for (const tPoint of uniqueTimestamps) {
        // 4. Filter forecasts made at or before this timestamp
        const relevantForecasts = validHistory.filter(f => f.timestampMillis <= tPoint);

        if (relevantForecasts.length === 0) continue;

        // 5. Find the latest forecast for each forecaster *within this subset*
        const latestForecastsAtPoint = new Map();
        for (const forecast of relevantForecasts) {
            const key = forecast.forecasterId._id ? forecast.forecasterId._id.toString() : forecast.forecasterId.toString();
            const existing = latestForecastsAtPoint.get(key);

            // Compare based on pre-calculated timestampMillis
            if (!existing || forecast.timestampMillis > existing.timestampMillis) {
                latestForecastsAtPoint.set(key, forecast);
            }
        }

        // 6. Calculate the median of these latest probabilities
        const probabilities = Array.from(latestForecastsAtPoint.values()).map(f => f.probability);

        if (probabilities.length > 0) {
            probabilities.sort((a, b) => a - b);
            let medianChance;
            const mid = Math.floor(probabilities.length / 2);
            if (probabilities.length % 2 === 0) {
                medianChance = (probabilities[mid - 1] + probabilities[mid]) / 2;
            } else {
                medianChance = probabilities[mid];
            }

            // 7. Add the median data point for this timestamp
            medianHistoryPoints.push({
                t: tPoint, // Use the exact unique timestamp
                y: medianChance
            });
        }
    }
     // 8. Deduplicate points with the same median at consecutive timestamps (optional but good for chart rendering)
     const finalMedianHistory = medianHistoryPoints.filter((point, index, arr) => {
        // Keep the first point
        if (index === 0) return true;
        // Keep the point if its value is different from the previous one
        return point.y !== arr[index - 1].y;
    });


    // 9. Return in the format expected by the chart composable
    return { Yes: finalMedianHistory };
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
    let scenarioQuery = Scenario.findOne({ platform, platformScenarioId }); // Use let for query modification

    // --- RE-ADD POPULATE: Populate forecaster details for Lightcone history --- 
    if (platform === 'Lightcone') {
      // Select only the needed fields from Forecaster
      scenarioQuery = scenarioQuery.populate('probabilityHistory.forecasterId', 'name avatar'); 
    }
    // --- END RE-ADD POPULATE ---

    const scenario = await scenarioQuery.lean(); // Execute the query

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
      case 'Manifold':
        history = await fetchManifoldHistory(scenario);
        break;
      case 'Lightcone':
        // Calculate the median history for the chart
        const chartHistory = await fetchLightconeHistory(scenario); // Returns { Yes: [...] }
        // Combine chart data and the original populated history for the details
        history = { 
            chartData: chartHistory, 
            detailsData: scenario.probabilityHistory // Use the populated history from the main query
        };
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