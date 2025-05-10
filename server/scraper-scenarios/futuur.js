import Scenario from '../models/Scenario.model.js'; // Adjust path as needed
import dotenv from 'dotenv';
import crypto from 'crypto';
import { URLSearchParams } from 'url';

dotenv.config();

const PLATFORM_NAME = 'Futuur';
const FUTUUR_API_BASE_URL = 'https://api.futuur.com/api/v1';
const FUTUUR_HISTORY_API_BASE_URL = 'https://api.futuur.com/v1.5';
const FETCH_TIMEOUT_MS = 15000; // 15 seconds timeout

const FUTUUR_PUBLIC_KEY = process.env.FUTUUR_PUBLIC_KEY;
const FUTUUR_PRIVATE_KEY = process.env.FUTUUR_PRIVATE_KEY;

/**
 * Builds the HMAC signature for Futuur API requests.
 * @param {Object} params - Parameters to include in the signature (already includes Key and Timestamp).
 * @param {string} privateKey - The Futuur private API key.
 * @returns {string} The HMAC SHA-512 signature.
 */
function buildFutuurSignature(params, privateKey) {
  const sortedParams = {};
  Object.keys(params).sort().forEach(key => {
    sortedParams[key] = params[key];
  });
  const encodedParams = new URLSearchParams(sortedParams).toString();
  const hmac = crypto.createHmac('sha512', privateKey);
  hmac.update(encodedParams, 'utf-8');
  return hmac.digest('hex');
}

/**
 * Helper to safely fetch JSON from a URL with a timeout and optional Futuur authentication.
 * @param {string} url - The URL to fetch from.
 * @param {Object} [fetchOptions={}] - Basic fetch options (e.g., signal).
 * @param {Object} [queryParamsForHmac={}] - Query parameters of the request, to be included in HMAC if authenticating.
 * @returns {Promise<object|null>} - The JSON response or null on error/timeout.
 */
async function safeFetchJson(url, fetchOptions = {}, queryParamsForHmac = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const headers = { ...(fetchOptions.headers || {}) };

  if (FUTUUR_PUBLIC_KEY && FUTUUR_PRIVATE_KEY) {
    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = {
      ...queryParamsForHmac,
      Key: FUTUUR_PUBLIC_KEY,
      Timestamp: timestamp,
    };
    const signature = buildFutuurSignature(paramsToSign, FUTUUR_PRIVATE_KEY);
    headers['Key'] = FUTUUR_PUBLIC_KEY;
    headers['Timestamp'] = timestamp.toString();
    headers['HMAC'] = signature;
  }

  try {
    const response = await fetch(url, { ...fetchOptions, headers, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.error(`[Futuur] API request failed for ${url.substring(0,100)}...: ${response.status} ${response.statusText}`);
      // console.error('[Futuur] Response body:', await response.text()); // For more detailed error logging
      return null;
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`[Futuur] Timeout fetching ${url.substring(0,100)}...`);
    } else {
      console.error(`[Futuur] Error fetching ${url.substring(0,100)}...:`, error.message);
    }
    return null;
  }
}

/**
 * Formats raw Futuur market data into the Scenario schema.
 * @param {Object} marketDetail - The raw market object from the Futuur API (/markets/{id}).
 * @returns {Object|null} - The formatted scenario data object or null if processing fails.
 */
function formatFutuurScenario(marketDetail) {
  if (!marketDetail || !marketDetail.id || !marketDetail.title) {
    console.warn('[Futuur] Skipping market due to missing id or title.', marketDetail?.id);
    return null;
  }

  let scenarioType = 'UNKNOWN';
  if (marketDetail.is_binary && marketDetail.outcomes_type === 'yesno') {
    scenarioType = 'BINARY';
  } else {
    // console.warn(`[Futuur] Market ${marketDetail.id} is not a supported binary 'yesno' type. Type: ${marketDetail.outcomes_type}, IsBinary: ${marketDetail.is_binary}`);
    return null; // Only supporting binary yes/no for now
  }

  let currentProbability = null;
  let options = null;

  if (scenarioType === 'BINARY') {
    const yesOutcome = marketDetail.outcomes?.find(o => o.title?.toLowerCase() === 'yes');
    if (yesOutcome?.price) {
      if (marketDetail.real_currency_available && typeof yesOutcome.price.BTC === 'number') {
        currentProbability = parseFloat(yesOutcome.price.BTC);
      } else if (typeof yesOutcome.price.OOM === 'number') { // OOM seems to be play money
        currentProbability = parseFloat(yesOutcome.price.OOM);
      }
    }
  }
  // Add handling for CATEGORICAL if Futuur supports it and schema is extended

  let status = 'UNKNOWN';
  switch (marketDetail.status?.toLowerCase()) {
    case 'o': // open
      status = 'OPEN';
      break;
    case 'c': // closed (trading ended, not resolved)
      status = 'CLOSED';
      break;
    case 'r': // resolved
      status = 'RESOLVED';
      break;
    case 'f': // finished (trading ended, awaiting resolution - maps to resolving)
      status = 'RESOLVING';
      break;
    // Futuur docs don't mention 's' (suspended) or other statuses typically seen.
    default:
      status = 'UNKNOWN';
      // console.warn(`[Futuur] Unknown status '${marketDetail.status}' for market ${marketDetail.id}`);
  }
  
  // If market has a resolution, ensure status is RESOLVED
  if (marketDetail.resolution) {
      status = 'RESOLVED';
  }

  const resolutionDate = marketDetail.resolve_date ? new Date(marketDetail.resolve_date) : null;
  const expectedResolutionDate = marketDetail.bet_end_date ? new Date(marketDetail.bet_end_date) : null;
  let resolutionCloseDate = expectedResolutionDate; // Default to expected
  if (status === 'RESOLVED' && resolutionDate) {
      resolutionCloseDate = resolutionDate;
  } else if (status === 'CLOSED' || status === 'RESOLVING') {
      // If closed or resolving, the bet_end_date is the effective close for predictions.
      resolutionCloseDate = expectedResolutionDate;
  }


  const resolutionData = {
    resolutionCriteria: marketDetail.description || null, // HTML content
    resolutionSource: null, // Futuur API doesn't provide a structured source, might be in description
    resolutionSourceUrl: null, // Might be in description
    expectedResolutionDate: expectedResolutionDate,
    resolutionDate: resolutionDate,
    resolutionCloseDate: resolutionCloseDate,
    resolutionValue: marketDetail.resolution || null, // e.g., "Yes" or "No"
  };

  let volume = null;
  if (marketDetail.real_currency_available && typeof marketDetail.volume_real_money === 'number') {
    volume = marketDetail.volume_real_money;
  } else if (typeof marketDetail.volume_play_money === 'number') {
    volume = marketDetail.volume_play_money;
  }

  const scenarioData = {
    question: marketDetail.title.trim(),
    platform: PLATFORM_NAME,
    platformScenarioId: marketDetail.id.toString(),
    conditionId: `${PLATFORM_NAME}_${marketDetail.id.toString()}`,
    tags: marketDetail.tags?.map(t => t.name) || [],
    openDate: marketDetail.event_start_date ? new Date(marketDetail.event_start_date) : null, // Often null, need to check if there's a better field
    publishDate: null, // Futuur API doesn't provide a clear "publish date" for the market itself
    scenarioType: scenarioType,
    status: status,
    currentProbability: currentProbability,
    currentValue: null, // For NUMERIC/DATE, not applicable for BINARY
    options: options, // For CATEGORICAL
    url: `https://futuur.com/q/${marketDetail.id}/${marketDetail.slug}`,
    apiUrl: `${FUTUUR_API_BASE_URL}/markets/${marketDetail.id}/`,
    embedUrl: null, // Futuur doesn't seem to provide standard embeddable widgets
    volume: volume,
    liquidity: null, // Futuur API doesn't provide a direct liquidity measure like Manifold/Polymarket
    numberOfTraders: marketDetail.wagers_count_canonical, // Number of unique bettors
    numberOfPredictions: marketDetail.wagers_count, // Total number of wagers
    resolutionData: resolutionData,
    scrapedDate: new Date(),
    // textForEmbedding and aiVectorEmbedding will be handled by other processes
  };
  return scenarioData;
}

/**
 * Fetches and formats data for a single Futuur market.
 * @param {string} marketId - The ID of the market to fetch.
 * @returns {Promise<Object|null>} Formatted scenario data or null if fetch/format fails.
 */
async function fetchAndFormatSingleFutuurMarket(marketId) {
  if (!marketId) {
    console.error('[Futuur] Market ID is required for fetchAndFormatSingleFutuurMarket.');
    return null;
  }
  const marketDetailUrl = `${FUTUUR_API_BASE_URL}/markets/${marketId}/`;
  // For this endpoint, queryParamsForHmac is empty as ID is in path
  const marketDetail = await safeFetchJson(marketDetailUrl, {}, {}); 

  if (!marketDetail) {
    // console.warn(`[Futuur] Failed to fetch details for market ${marketId}.`);
    return null;
  }
  return formatFutuurScenario(marketDetail);
}

/**
 * Scrapes Futuur API for markets and returns formatted scenario data.
 * @param {Object} [options={}] - Configuration options for the scraper.
 * @param {number} [options.maxItems=2000] - Maximum number of items to fetch and process.
 * @param {string[]} [options.status=['o']] - Market status to filter by (e.g., 'o' for open, 'r' for resolved).
 * @returns {Promise<Array<Object>>} - Array of formatted scenario data objects.
 */
async function scrapeFutuurData(options = {}) {
  const config = {
    maxItems: 2_000,
    status: ['o'], // Default to open markets, expects an array now
    ...options,
  };

  const formattedScenarios = [];
  let offset = 0;
  const limit = 1_000; 
  let keepFetching = true;
  let i = 0; // Counter for logging/debugging as in your changes

  while (keepFetching && formattedScenarios.length < config.maxItems) {
    const queryParamsObject = {
      limit: limit.toString(),
      offset: offset.toString(),
      ordering: '-volume_real_money',
      // status is handled per item after fetching list, as API might not support multiple status query params well
    };
    // If API supports multiple status values, construct it here. Example: status=o&status=f
    // For now, fetching all and filtering locally for multiple statuses might be more robust if API is restrictive.
    // If only one status is typically used, can add: queryParamsObject.status = config.status[0]; 
    
    const queryParamsStr = new URLSearchParams(queryParamsObject).toString();
    const marketsListUrl = `${FUTUUR_API_BASE_URL}/markets/?${queryParamsStr}`;
    
    // console.log(`[Futuur] Fetching markets: ${marketsListUrl}`);
    const marketsResponse = await safeFetchJson(marketsListUrl, {}, queryParamsObject);

    if (!marketsResponse || !marketsResponse.results || marketsResponse.results.length === 0) {
      // console.log('[Futuur] No more markets found or API error.');
      keepFetching = false;
      continue;
    }

    for (const marketInList of marketsResponse.results) {
        i++;
      if (formattedScenarios.length >= config.maxItems) {
        keepFetching = false;
        break;
      }

      // Local status filtering based on your changes
      if (!config.status.includes(marketInList.status)) {
        console.log(`Skipping ${i}`);
        continue;
      }

      if (!marketInList.is_binary || marketInList.outcomes_type !== 'yesno') {
          // console.log(`[Futuur] Skipping non-binary market from list: ${marketInList.id} - ${marketInList.title.substring(0,30)}`);
          continue;
      }
      // Consider a minimum volume filter if desired, e.g. from your changes:
      // if (marketInList.volume_real_money < 1 && marketInList.volume_play_money < 1) {
      //   console.log(`[Futuur] Skipping zero volume market from list: ${marketInList.id}`);
      //   continue;
      // }

      console.log(`${i} [Futuur] Fetching details for market ${marketInList.id}: ${marketInList.title.substring(0,30)}...`);
      const scenarioData = await fetchAndFormatSingleFutuurMarket(marketInList.id);
      if (scenarioData) {
        formattedScenarios.push(scenarioData);
      }
      await new Promise(resolve => setTimeout(resolve, 250)); // Delay from your changes
    }

    if (marketsResponse.pagination && marketsResponse.pagination.next) {
      offset += limit;
    } else {
      keepFetching = false; // No more pages
    }
  }
  // console.log(`[Futuur] Scraped ${formattedScenarios.length} scenarios.`);
  return formattedScenarios;
}

/**
 * Fetches and formats price history for a Futuur market.
 * @param {string} marketId - The Futuur market ID.
 * @param {string} [currencyMode='real_money'] - 'real_money' or 'play_money'.
 * @returns {Promise<Object|null>} - Object with keys for outcomes (e.g., "Yes", "No") and array of {t, y} points, or null.
 */
async function getFutuurMarketProbHistory(marketId, currencyMode = 'real_money') {
  if (!marketId) {
    console.error('[Futuur History] Market ID is required.');
    return null;
  }
  const queryParamsForHistory = { currency_mode: currencyMode };
  const historyUrl = `${FUTUUR_HISTORY_API_BASE_URL}/questions/${marketId}/price_history/?${new URLSearchParams(queryParamsForHistory).toString()}`;
  
  // console.log(`[Futuur History] Fetching from ${historyUrl}`);
  const historyApiResponse = await safeFetchJson(historyUrl, {}, queryParamsForHistory);

  if (!historyApiResponse || !Array.isArray(historyApiResponse)) {
    // console.warn(`[Futuur History] No history data or invalid format for market ${marketId} with ${currencyMode}.`);
    // If primary currency mode fails, and it was real_money, the retry logic below will handle play_money.
    if (currencyMode === 'play_money') return null; // Avoid infinite loop if play_money also fails here.
  }

  const historyData = {};
  if (Array.isArray(historyApiResponse)) { // Ensure it's an array before iterating
    for (const outcomeData of historyApiResponse) {
      if (outcomeData.name && Array.isArray(outcomeData.data)) {
        const validPoints = outcomeData.data.filter(p => p.x && typeof p.y === 'number' && !isNaN(new Date(p.x).getTime()));
        historyData[outcomeData.name] = validPoints.map(p => ({
          t: new Date(p.x).getTime(),
          y: p.y / 100, // Convert percentage to 0-1 probability
        })).sort((a,b) => a.t - b.t);
      }
    }
  }
  
  // If real_money failed or returned no data for "Yes", try "play_money" for "Yes"
  if (currencyMode === 'real_money' && (!historyData["Yes"] || historyData["Yes"].length === 0)) {
      // console.log(`[Futuur History] Retrying market ${marketId} with play_money as real_money was empty or failed for 'Yes'.`);
      const playMoneyHistory = await getFutuurMarketProbHistory(marketId, 'play_money');
      // Check if playMoneyHistory is not null and has meaningful data for "Yes"
      if (playMoneyHistory && playMoneyHistory["Yes"] && playMoneyHistory["Yes"].length > 0) {
          // console.log(`[Futuur History] Using play_money history for market ${marketId} for 'Yes' outcome.`);
          return playMoneyHistory; // Return the whole object from play_money call
      } else if (playMoneyHistory) {
          // console.log(`[Futuur History] play_money was also empty/failed for 'Yes' for market ${marketId}. Returning original (possibly empty/failed) real_money data.`);
          return historyData; // Return original (potentially empty or partially filled) real_money data
      }
      // If playMoneyHistory was null (e.g. fetch failed), stick with original historyData
  }

  return Object.keys(historyData).length > 0 ? historyData : (historyApiResponse === null && currencyMode === 'real_money' ? null : historyData );
}

export {
  scrapeFutuurData,
  fetchAndFormatSingleFutuurMarket,
  formatFutuurScenario, // If needed externally for testing single objects
  getFutuurMarketProbHistory,
  PLATFORM_NAME as FutuurPlatformName,
  FUTUUR_API_BASE_URL,
  FUTUUR_HISTORY_API_BASE_URL
};


// // --- Test functions ---
// async function testScrapeAllOpen() {
//   console.log("--- Test: Scrape All Open Futuur Markets (max 1_000) ---");
//   const scenarios = await scrapeFutuurData({ maxItems: 1_000, status: ['o'] });
//   console.log(`Fetched ${scenarios.length} open scenarios.`);
//   if (scenarios.length > 0) {
//     // console.log("Sample scenario:", JSON.stringify(scenarios[0], null, 2));
//     // fs.writeFileSync('futuur_test_scrape_open.json', JSON.stringify(scenarios, null, 2));
//   }
// }

// async function testFetchSingle() {
//   const testMarketId = "206522"; // Bitcoin above $150k
//   console.log(`--- Test: Fetch Single Futuur Market ID: ${testMarketId} ---`);
//   const scenario = await fetchAndFormatSingleFutuurMarket(testMarketId);
//   if (scenario) {
//     console.log("Fetched scenario:", scenario.question, scenario.currentProbability, scenario.status);
//     // console.log(JSON.stringify(scenario, null, 2));
//     // fs.writeFileSync('futuur_test_single.json', JSON.stringify(scenario, null, 2));
//   } else {
//     console.log(`Failed to fetch market ${testMarketId}.`);
//   }
// }

// async function testFetchHistory() {
//   const testMarketId = "206522"; // Bitcoin above $150k
//   console.log(`--- Test: Fetch History for Futuur Market ID: ${testMarketId} ---`);
//   let history = await getFutuurMarketProbHistory(testMarketId, 'real_money');
//   console.log(history);
  
//   if (history && history["Yes"] && history["Yes"].length > 0) {
//     console.log(`Fetched history for "Yes" (real_money or fallback): ${history["Yes"].length} points.`);
//     // console.log("First 2 'Yes' points:", history["Yes"].slice(0, 2));
//     // console.log("Last 2 'Yes' points:", history["Yes"].slice(-2));
//   } else {
//      console.log(`No 'Yes' history (real_money or fallback) for market ${testMarketId}.`);
//   }
//   // console.log(JSON.stringify(history, null, 2));
//   // fs.writeFileSync('futuur_test_history.json', JSON.stringify(history, null, 2));
// }

// (async () => {
//   await testScrapeAllOpen();
//   await testFetchSingle();
//   await testFetchHistory();
// })();

