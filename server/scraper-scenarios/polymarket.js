import mongoose from 'mongoose';
import Scenario from '../models/Scenario.model.js';
import Article from '../models/Article.model.js'; // Import Article model
import dotenv from 'dotenv';
import fs from 'fs'; // Import fs for file operations

// Load environment variables
dotenv.config();

const PLATFORM_NAME = 'Polymarket';
const POLYMARKET_API_BASE_URL = 'https://gamma-api.polymarket.com';
const POLYMARKET_CLOB_API_URL = 'https://clob.polymarket.com';

/**
 * Formats raw Polymarket market data (and optional event data) into the Scenario schema.
 * @param {Object} market - The raw market object from the Polymarket API.
 * @param {Object} [event] - Optional: The parent event object (contains tags, potentially description).
 * @returns {Object|null} - The formatted scenario data object or null if processing fails.
 */
function formatPolymarketScenario(market, event = null) {
  try {
    // Basic validation
    if (!market.question || !market.conditionId) {
      console.warn(
        `[Polymarket] Skipping due to missing data: ${
          market?.slug?.substring(0, 15) || 'No Market slug'
        }`
      );
      return null;
    }
    if (market.volume === '0' || market.volumeNum === 0) {
      // console.warn(`Skipping market due to zero volume: ${market.slug || 'No Market slug'}`);
      return null;
    }

    let outcomes = [];
    let outcomePrices = [];
    let clobTokenIds = {};
    try {
      if (market.outcomes) outcomes = JSON.parse(market.outcomes);
      if (market.outcomePrices)
        outcomePrices = JSON.parse(market.outcomePrices);
      if (market.clobTokenIds && outcomes.length > 0) {
        let tokens = JSON.parse(market.clobTokenIds);
        for (let i = 0; i < outcomes.length; i++) {
          clobTokenIds[outcomes[i]] = tokens[i];
        }
      }
    } catch (parseError) {
      console.warn(
        `Skipping market due to JSON parse error for outcomes/prices: ${
          market.slug || 'No Market slug'
        }`,
        parseError
      );
      return null;
    }

    if (
      outcomes.length === 0 ||
      outcomePrices.length === 0 ||
      outcomes.length !== outcomePrices.length
    ) {
      console.warn(
        `Skipping market due to invalid/mismatched outcomes/prices: ${
          market.slug || 'No Market slug'
        }`
      );
      return null;
    }

    // --- Data Transformation ---
    let scenarioType = 'CATEGORICAL'; // Default
    let currentProbability = null;
    let options = [];
    let currentValue = null; // For NUMERIC/DATE - Polymarket seems less common for these

    // Check for standard Yes/No Binary market
    if (
      outcomes.length === 2 &&
      outcomes.includes('Yes') &&
      outcomes.includes('No')
    ) {
      scenarioType = 'BINARY';
      const yesOutcomePrice = outcomePrices[outcomes.indexOf('Yes')];
      if (yesOutcomePrice !== undefined) {
        currentProbability = parseFloat(yesOutcomePrice);
        options = null; // No options needed for standard binary
      }
    } else {
      // Handle other CATEGORICAL markets
      options = outcomes.map((name, index) => ({
        name: name,
        probability: parseFloat(outcomePrices[index]) || 0,
      }));
    }

    // URLs - Prioritize market slug, fallback to event slug if needed and available
    const marketUrlSlug = market.slug;
    const eventUrlSlug = event?.slug;
    const marketId = market.id;
    let marketUrl = `https://polymarket.com/event/${eventUrlSlug}`; // Default fallback using event
    let embedUrl = null;
    let apiUrl = `https://gamma-api.polymarket.com/markets/${marketId}`;
    if (marketUrlSlug) {
      marketUrl = `https://polymarket.com/market/${marketUrlSlug}`;
      embedUrl = `<iframe title="polymarket-market-iframe" src="https://embed.polymarket.com/market.html?market=${marketUrlSlug}&features=volume&theme=light" width="400" height="180" frameBorder="0" />`;
    } else if (eventUrlSlug) {
      // Use event slug if market slug is missing but event slug exists
      marketUrl = `https://polymarket.com/event/${eventUrlSlug}`;
    } else {
      marketUrl = `https://polymarket.com/`; // Generic fallback if neither slug exists
      console.warn(
        `Market ${market.id} missing market and event slug, using generic URL.`
      );
    }

    // Determine Resolution Status and Dates
    let resolutionStatus = 'OPEN';
    let resolutionDate = null;
    let resolutionCloseDate = null;
    let resolutionValue = null;

    if (market.closed) {
      // Determine actual close/resolution date
      const closeTimestamp = market.closedTime || market.umaEndDate;
      if (closeTimestamp) {
        resolutionCloseDate = new Date(closeTimestamp);
      }

      // Use umaResolutionStatus for more accurate resolved state if available, otherwise fallback
      if (market.umaResolutionStatus === 'resolved' || market.resolvedBy) {
        resolutionStatus = 'RESOLVED';
        resolutionDate = resolutionCloseDate; // If resolved, resolution date is the close date

        // Determine resolution value
        const resolvedIndex = outcomePrices.findIndex(
          (price) => parseFloat(price) === 1
        );
        if (resolvedIndex !== -1 && outcomes[resolvedIndex]) {
          resolutionValue = outcomes[resolvedIndex];
        } else {
          // Fallback if no outcome has price 1 (shouldn't happen for resolved binary/categorical)
          console.warn(
            `Resolved market ${market.id} has no outcome with price 1. Outcome prices: ${market.outcomePrices}`
          );
        }
      } else {
        resolutionStatus = 'CLOSED'; // Closed but not resolved yet
      }
    }

    // Description Logic: Use event description as main description.
    // Use market description *only* if it's different and event is provided.
    const marketDescription = market.description?.trim();
    const eventDescription = event?.description?.trim();
    let description = null; // Top-level description from the event usually
    if (event && eventDescription) {
      description = eventDescription;
    }

    // Resolution Data Object
    const resolutionData = {
      resolutionCriteria: marketDescription || null, // Market description becomes criteria
      resolutionSource: market.resolutionSource || null,
      resolutionSourceUrl: null, // No clear field in API data for this yet
      expectedResolutionDate: market.endDate ? new Date(market.endDate) : null,
      resolutionDate: resolutionDate,
      resolutionCloseDate: resolutionCloseDate,
      resolutionValue: resolutionValue,
    };

    

    const scenarioData = {
      // CORE
      question: market.question.trim(),
      description: description, // Use event description if available

      // PLATFORM & SOURCE INFO
      platform: PLATFORM_NAME,
      platformScenarioId: market.id,
      conditionId: market.conditionId,
      clobTokenIds: clobTokenIds,
      tags: event?.tags?.map((tag) => tag.label) || [], // Tags from parent event if available

      // TIMELINES
      openDate: market.startDate ? new Date(market.startDate) : null,
      scenarioType: scenarioType,

      // CURRENT STATE
      status: resolutionStatus,
      currentProbability: currentProbability, // Only for BINARY
      currentValue: currentValue, // For NUMERIC/DATE (if applicable)
      options: options?.length > 0 ? options : null, // Only for CATEGORICAL

      // URLS
      url: marketUrl,
      apiUrl: apiUrl,
      embedUrl: embedUrl,

      // Data about the scenario
      volume: market.volumeNum ??
          (market.volume ? parseFloat(market.volume) : undefined), // Prefer volumeNum
        liquidity:
          market.liquidityNum ??
          (market.liquidity ? parseFloat(market.liquidity) : undefined),
      // Resolution Data
      resolutionData: resolutionData, // Assign the constructed object

      // Scraping & Provenance
      scrapedDate: new Date(),
      // originalScrapedData: market, // Optional: uncomment to store raw data

      // AI Vector Embedding - leave empty, handled elsewhere
    };
    return scenarioData;
  } catch (error) {
    console.error(
      `Error formatting market ${market?.id || 'ID missing'}:`,
      error
    );
    return null; // Return null on error to allow skipping
  }
}

/**
 * Scrapes Polymarket API event list and returns formatted market data
 * @param {Object} options - Configuration options for the scraper
 * @returns {Array} - Array of formatted market data
 */
async function scrapePolymarketData(options = {}) {
  // --- Default Options ---
  const defaults = {
    limit: 100, // Max: 100
    endDateMin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // any markets past 30 days
    active: undefined,
    endDateMax: undefined,
    closed: undefined,
    startDateMin: undefined,
    startDateMax: undefined,
    maxItems: undefined, // Max total markets to process
    excludeTags: [], // New: Array of tag labels to exclude
  };
  const config = { ...defaults, ...options };

  // --- Build API URL ---
  const queryParams = new URLSearchParams();
  queryParams.set('limit', config.limit.toString());
  if (config.active !== undefined)
    queryParams.set('active', config.active.toString());
  if (config.closed !== undefined)
    queryParams.set('closed', config.closed.toString());
  if (config.endDateMin) queryParams.set('end_date_min', config.endDateMin);
  if (config.endDateMax) queryParams.set('end_date_max', config.endDateMax);
  if (config.startDateMin)
    queryParams.set('start_date_min', config.startDateMin);
  if (config.startDateMax)
    queryParams.set('start_date_max', config.startDateMax);
  if (config.category) queryParams.set('category', config.category);

  const baseEventsUrl = `${POLYMARKET_API_BASE_URL}/events?${queryParams.toString()}`;

  let offset = 0;
  let keepGoing = true;
  const fetchLimit = config.limit;

  let totalRawMarketsFetched = 0;
  let processedCount = 0;
  const formattedScenarios = []; // Array to hold formatted scenarios
  const excludedByTagCount = {}; // New: Track exclusions by tag

  while (keepGoing) {
    const urlWithOffset = `${baseEventsUrl}&offset=${offset}`;
    // console.log(`Fetching events: ${urlWithOffset}`);
    try {
      const resp = await fetch(urlWithOffset);
      if (!resp.ok) {
        console.error(
          `API request failed with status ${resp.status}: ${await resp.text()}`
        );
        keepGoing = false;
        continue;
      }
      const eventsData = await resp.json();
      if (!eventsData || eventsData.length === 0) {
        // console.log('No more events found.');
        keepGoing = false;
        continue;
      }

      // console.log(
      //   `Processing ${eventsData.length} events from offset ${offset}...`
      // );

      for (const event of eventsData) {
        if (!event.markets || event.markets.length === 0) continue; // Skip events with no markets

        totalRawMarketsFetched += event.markets.length;

        for (const market of event.markets) {
          // Check if maxItems limit has been reached BEFORE processing
          if (
            config.maxItems !== undefined &&
            processedCount >= config.maxItems
          ) {
            keepGoing = false; // Stop fetching more events
            break; // Exit the inner market processing loop
          }

          // New: Tag Exclusion Logic
          let excludedByTag = false;
          let excludingTag = null;
          if (
            config.excludeTags.length > 0 &&
            event.tags &&
            event.tags.length > 0
          ) {
            for (const tag of event.tags) {
              // Normalize both strings for case-insensitive comparison and trim whitespace
              const normalizedTagLabel = tag.label.trim().toLowerCase();
              const matchingExcludeTag = config.excludeTags.find(
                (excludeTag) =>
                  excludeTag.trim().toLowerCase() === normalizedTagLabel
              );

              if (matchingExcludeTag) {
                excludedByTag = true;
                excludingTag = tag.label; // Keep original label for reporting
                break; // Stop checking tags for this market
              }
            }
          }

          if (excludedByTag) {
            // Increment the counter for the specific tag
            excludedByTagCount[excludingTag] =
              (excludedByTagCount[excludingTag] || 0) + 1;
            continue; // Skip to the next market
          }
          // End Tag Exclusion Logic

          const scenarioData = formatPolymarketScenario(market, event);

          if (scenarioData) {
            formattedScenarios.push(scenarioData);
            processedCount++;
          }
        } // End inner loop (markets)

        // Check again if we should stop fetching after processing markets in this event
        if (!keepGoing) {
          break; // Exit the outer event processing loop
        }
      } // End of processing loop for the batch

      // Check if we should stop fetching after processing the batch of events
      if (!keepGoing) {
        break; // Exit the outer while loop
      }

      if (eventsData.length < fetchLimit) {
        keepGoing = false;
      } else {
        offset += fetchLimit;
      }
      // Add a delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
    } catch (error) {
      console.error(`Error fetching events data from ${urlWithOffset}:`, error);
      keepGoing = false; // Stop on fetch error
    }
  }

  if (config.maxItems !== undefined && processedCount >= config.maxItems) {
    console.log(
      `[Polymarket] (Processing stopped early due to maxItems limit: ${config.maxItems})`
    );
  }

  return formattedScenarios;
}

/**
 * Fetches and formats data for a single Polymarket market.
 * @param {string} marketId - The ID of the market to fetch.
 * @returns {Object|null} - Formatted scenario data or null if fetch/format fails.
 */
async function fetchAndFormatSinglePolymarketMarket(marketId) {
  if (!marketId) {
    console.error('Market ID is required.');
    return null;
  }
  const url = `${POLYMARKET_API_BASE_URL}/markets/${marketId}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(
        `Failed to fetch market ${marketId}. Status: ${
          resp.status
        }, Body: ${await resp.text()}`
      );
      return null;
    }
    const marketData = await resp.json();

    if (!marketData) {
      console.error(`No data returned for market ${marketId}.`);
      return null;
    }

    // Use the shared formatter function (no event data available here)
    const formattedScenario = formatPolymarketScenario(marketData, null);
    return formattedScenario;
  } catch (error) {
    console.error(
      `[Polymarket] Error fetching/processing market ${marketId}:`,
      error
    );
    return null;
  }
}

/**
 * Fetches raw market data from the Polymarket CLOB API by its condition ID.
 * Internal helper function.
 * See: https://docs.polymarket.com/#get-market
 *
 * @param {string} conditionId - The condition_id of the market.
 * @returns {Promise<object>} A promise that resolves to the raw market data object.
 */
async function getPolymarketClobMarketByConditionId(conditionId) {
  const url = `${POLYMARKET_CLOB_API_URL}/markets/${conditionId}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `HTTP error ${response.status}: ${response.statusText}. Body: ${errorBody}`
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      `Error fetching Polymarket CLOB market by conditionId ${conditionId}:`,
      error
    );
    throw error; // Re-throw the error after logging
  }
}

/**
 * Fetches market details and extracts the 'Yes' and 'No' token IDs.
 *
 * @param {string} conditionId - The condition_id of the market.
 * @returns {Promise<{question: string, yesTokenId: string|null, noTokenId: string|null}>} A promise resolving to an object with market details.
 */
async function getMarketDetailsAndTokens(conditionId) {
  if (!conditionId) {
    throw new Error('conditionId is required.');
  }
  const marketData = await getPolymarketClobMarketByConditionId(conditionId);

  let yesTokenId = null;
  let noTokenId = null;

  if (marketData && marketData.tokens && marketData.tokens.length >= 2) {
    // Assuming the first token is 'Yes' and the second is 'No'
    // This might need adjustment if the order isn't guaranteed.
    // A safer approach would be to check marketData.tokens[n].outcome
    const yesToken = marketData.tokens.find(
      (token) => token.outcome?.toLowerCase() === 'yes'
    );
    const noToken = marketData.tokens.find(
      (token) => token.outcome?.toLowerCase() === 'no'
    );

    yesTokenId = yesToken ? yesToken.token_id : null;
    noTokenId = noToken ? noToken.token_id : null;

    if (!yesTokenId || !noTokenId) {
      console.warn(
        `Could not reliably determine Yes/No token IDs for conditionId ${conditionId}. Found: Yes=${yesTokenId}, No=${noTokenId}`
      );
      // Fallback to assuming order if lookup failed but array has >= 2 elements
      if (!yesTokenId && marketData.tokens.length > 0)
        yesTokenId = marketData.tokens[0].token_id;
      if (!noTokenId && marketData.tokens.length > 1)
        noTokenId = marketData.tokens[1].token_id;
    }
  } else {
    console.warn(
      `Market data or tokens array is missing or incomplete for conditionId ${conditionId}`
    );
  }

  return {
    question: marketData?.question || 'Question not found',
    yesTokenId: yesTokenId,
    noTokenId: noTokenId,
    // You could add other fields from marketData here if needed
    rawMarketData: marketData, // Optionally return the full raw data
  };
}

/**
 * Fetches historical price data for a specific Polymarket outcome token using interval=max.
 * See: https://docs.polymarket.com/#timeseries-data
 *
 * @param {string} tokenId - The specific token_id for the outcome (e.g., the 'Yes' or 'No' token).
 * @param {number} [marketDurationMinutes] - Optional: The approximate duration of the market in minutes. Used to calculate optimal fidelity. Defaults to 90 days if not provided.
 * @returns {Promise<object>} A promise that resolves to the history object { history: [...] }.
 */
async function getPolymarketPriceHistory(
  tokenId,
  marketDurationMinutes
) {
  if (!tokenId) {
    throw new Error('tokenId is required');
  }

  const TARGET_DATA_POINTS = 50;
  const MIN_FIDELITY_MINUTES = 1;
  const MAX_FIDELITY_MINUTES = 1440; // 1 day
  const DEFAULT_DURATION_MINUTES = 90 * 24 * 60; // 90 days as default

  // Use provided duration or default if invalid
  const durationMinutes = (marketDurationMinutes && marketDurationMinutes > 0) 
    ? marketDurationMinutes 
    : DEFAULT_DURATION_MINUTES;

  // Calculate desired fidelity
  let calculatedFidelity = Math.round(durationMinutes / TARGET_DATA_POINTS);

  // Clamp fidelity to reasonable bounds
  const finalFidelity = Math.max(
      MIN_FIDELITY_MINUTES,
      Math.min(calculatedFidelity, MAX_FIDELITY_MINUTES)
  );

  const params = new URLSearchParams({
    market: tokenId, // API expects the token_id in the 'market' parameter
    interval: 'max',
    fidelity: finalFidelity.toString(),
  });

  const url = `${POLYMARKET_CLOB_API_URL}/prices-history?${params.toString()}`;
  console.log(`Fetching price history from: ${url}`); // Log includes fidelity now

  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Handle 404 gracefully - might mean no data for the period
      if (response.status === 404) {
        console.warn(`No price history found for token ${tokenId} with status 404.`);
        return { history: [] };
      }
      
      const errorBody = await response.text();
      throw new Error(
        `HTTP error ${response.status}: ${response.statusText}. Body: ${errorBody}`
      );
    }

    const data = await response.json();
    
    // Validate response structure
    if (!data || !Array.isArray(data.history)) {
      console.warn(`Unexpected history data format for token ${tokenId}:`, data);
      return { history: [] };
    }
    
    // Standardize the output format to match what HistoryChart expects: { t: ms, y: prob }
    const standardizedHistory = data.history.map(item => ({
        t: item.t * 1000, // Convert seconds to milliseconds
        y: item.p         // Use 'p' as the source for probability 'y'
    }));
    
    return { history: standardizedHistory };
  } catch (error) {
    console.error(`Error fetching Polymarket price history for token ${tokenId}:`, error);
    return { history: [] };
  }
}

export { 
  scrapePolymarketData,
  fetchAndFormatSinglePolymarketMarket,
  getPolymarketClobMarketByConditionId,
  getMarketDetailsAndTokens,
  getPolymarketPriceHistory,
}; // Export main functions

// // test
// const someMarkets = await scrapePolymarketData({ maxItems: 10, endDateMin: new Date(Date.now()).toISOString(), active: true });

// const someMarketDetails = await getMarketDetailsAndTokens(someMarkets[0].conditionId);
// console.log(someMarketDetails);

// // Need to estimate duration for the test
// const estimatedDurationMinutes = (new Date().getTime() - new Date(someMarkets[0].openDate).getTime()) / (1000 * 60); 
// const somePriceHistory = await getPolymarketPriceHistory(someMarketDetails.yesTokenId, estimatedDurationMinutes);

// console.log(somePriceHistory);
// process.exit(0);
