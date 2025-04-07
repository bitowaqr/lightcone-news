import mongoose from 'mongoose';
import Scenario from '../models/Scenario.model.js';
import dotenv from 'dotenv';
import fs from 'fs'; // Import fs for file operations

// Load environment variables
dotenv.config();

const POLYMARKET_API_BASE_URL = 'https://gamma-api.polymarket.com';
const PLATFORM_NAME = 'Polymarket';

async function connectDB() {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      // useNewUrlParser and useUnifiedTopology are deprecated but might be needed for older setups
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully for Polymarket scraper.');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Exit if DB connection fails
  }
}

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
        `Skipping market due to missing essential data (question/conditionId): ${
          market.slug || 'No Market slug'
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
    try {
      if (market.outcomes) outcomes = JSON.parse(market.outcomes);
      if (market.outcomePrices)
        outcomePrices = JSON.parse(market.outcomePrices);
    } catch (parseError) {
      console.warn(
        `Skipping market due to JSON parse error for outcomes/prices: ${market.slug || 'No Market slug'}`,
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
        `Skipping market due to invalid/mismatched outcomes/prices: ${market.slug || 'No Market slug'}`
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
    let apiUrl = null;
    if (marketUrlSlug) {
      marketUrl = `https://polymarket.com/market/${marketUrlSlug}`;
      embedUrl = `<iframe title="polymarket-market-iframe" src="https://embed.polymarket.com/market.html?market=${marketUrlSlug}&features=volume&theme=light" width="400" height="180" frameBorder="0" />`;
      apiUrl = `https://gamma-api.polymarket.com/markets/${marketId}`;
    } else if (eventUrlSlug) {
        // Use event slug if market slug is missing but event slug exists
        marketUrl = `https://polymarket.com/event/${eventUrlSlug}`;
    }
    else {
      marketUrl = `https://polymarket.com/`; // Generic fallback if neither slug exists
      console.warn(`Market ${market.id} missing market and event slug, using generic URL.`);
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
        const resolvedIndex = outcomePrices.findIndex(price => parseFloat(price) === 1);
        if (resolvedIndex !== -1 && outcomes[resolvedIndex]) {
          resolutionValue = outcomes[resolvedIndex];
        } else {
          // Fallback if no outcome has price 1 (shouldn't happen for resolved binary/categorical)
          console.warn(`Resolved market ${market.id} has no outcome with price 1. Outcome prices: ${market.outcomePrices}`);
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
      platformScenarioId: market.id, // Use market ID as the unique identifier
      tags: event?.tags?.map((tag) => tag.label) || [], // Tags from parent event if available

      // TIMELINES
      openDate: market.startDate ? new Date(market.startDate) : null,
      // closeDate removed, now in resolutionData.expectedResolutionDate

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
      scenarioData: {
        // Include comment count if available from the event
        commentCount: event?.commentCount,
        volume:
          market.volumeNum ??
          (market.volume ? parseFloat(market.volume) : null), // Prefer volumeNum
        liquidity:
          market.liquidityNum ??
          (market.liquidity ? parseFloat(market.liquidity) : null),
        // Add other relevant market data here if needed
        numberOfTraders: null, // Not directly available in market/event data shown
        rationaleSummary: "", // Requires separate generation/fetching
        rationaleDetails: "", // Requires separate generation/fetching
        dossier: {}, // Requires separate generation/fetching
      },

      // Resolution Data
      resolutionData: resolutionData, // Assign the constructed object

      // Relationships
      relatedArticleIds: [], // To be populated later
      relatedScenarioIds: [], // To be populated later

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
    active: undefined, // Fetch active markets by default
    endDateMin: undefined,
    endDateMax: undefined,
    closed: undefined,
    startDateMin: undefined,
    startDateMax: undefined,
    maxItems: undefined, // Max total markets to process
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

  console.log(
    `Starting Polymarket event data fetch with options: ${JSON.stringify(
      config
    )}`
  );
  console.log(`Base Events URL: ${baseEventsUrl}`);

  while (keepGoing) {
    const urlWithOffset = `${baseEventsUrl}&offset=${offset}`;
    console.log(`Fetching events: ${urlWithOffset}`);
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
        console.log('No more events found.');
        keepGoing = false;
        continue;
      }

      console.log(
        `Processing ${eventsData.length} events from offset ${offset}...`
      );

      for (const event of eventsData) {
        if (!event.markets || event.markets.length === 0) continue; // Skip events with no markets

        totalRawMarketsFetched += event.markets.length;

        for (const market of event.markets) {
          // Check if maxItems limit has been reached BEFORE processing
          if (
            config.maxItems !== undefined &&
            processedCount >= config.maxItems
          ) {
            console.log(
              `Reached maxItems limit (${config.maxItems}), stopping fetch.`
            );
            keepGoing = false; // Stop fetching more events
            break; // Exit the inner market processing loop
          }

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
        console.log('Fetched last page of events.');
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

  console.log(`
--- Polymarket Scrape Summary (Events) ---`);
  console.log(`Options used: ${JSON.stringify(config)}`);
  console.log(`Total raw markets found in events: ${totalRawMarketsFetched}`);
  console.log(`Successfully processed and formatted: ${processedCount}`);
  if (config.maxItems !== undefined && processedCount >= config.maxItems) {
    console.log(
      `(Processing stopped early due to maxItems limit: ${config.maxItems})`
    );
  }
  console.log(`---------------------------------`);

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
  console.log(`Fetching single market: ${url}`);

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

    if (formattedScenario) {
      console.log(
        `Successfully fetched and formatted market ${marketId}: "${formattedScenario.question.substring(
          0,
          50
        )}..."`
      );
    } else {
      console.error(`Failed to format data for market ${marketId}.`);
    }
    return formattedScenario;
  } catch (error) {
    console.error(
      `Error fetching or processing single market ${marketId}:`,
      error
    );
    return null;
  }
}

/**
 * Saves scraped market data to MongoDB or JSON file
 * @param {Array} scenarios - Array of formatted market data
 * @param {boolean} useMongoDB - Whether to save to MongoDB (true) or JSON file (false)
 * @returns {Object} - Summary of save operation
 */
async function saveScenarioData(scenarios, useMongoDB = true) {
  let createdCount = 0;
  let updatedCount = 0;
  const totalToSave = scenarios.length;

  if (totalToSave === 0) {
    console.log('No scenarios provided to save.');
    return { created: 0, updated: 0, total: 0 };
  }

  if (useMongoDB) {
    await connectDB(); // Ensure DB connection

    console.log(`Attempting to save ${totalToSave} scenarios to MongoDB...`);

    for (const scenarioData of scenarios) {
      try {
        // Upsert: Find based on platform and platformScenarioId, update if found, insert if not.
        const filter = {
          platform: PLATFORM_NAME,
          platformScenarioId: scenarioData.platformScenarioId,
        };
        // Update all fields from scenarioData, set createdAt only on insert
        const update = {
          $set: scenarioData,
          $setOnInsert: { createdAt: new Date() }, // Add createdAt timestamp only when inserting
        };
        const optionsDb = {
          upsert: true, // Create doc if it doesn't exist
          new: true, // Return the modified document (or new one)
          setDefaultsOnInsert: true, // Apply schema defaults on insert
        };

        // Use findOneAndUpdate to get info about whether it was an insert or update
        const result = await Scenario.findOneAndUpdate(
          filter,
          update,
          optionsDb
        );

        // Check if the document was newly created in this operation
        // A common check is if `createdAt` is very close to `updatedAt` after the upsert
        // Adjust tolerance as needed (e.g., 1 second)
        if (
          result &&
          result.createdAt &&
          result.updatedAt &&
          result.updatedAt.getTime() - result.createdAt.getTime() < 1000
        ) {
          createdCount++;
        } else {
          updatedCount++;
        }
      } catch (error) {
        // Log detailed error including which scenario failed
        console.error(
          `Error saving scenario (ID: ${
            scenarioData.platformScenarioId
          }, Question: "${scenarioData.question.substring(0, 30)}..."):`,
          error
        );
        // Decide if you want to stop the whole process or continue saving others
        // For now, just log and continue
      }
    }

    console.log(`
--- MongoDB Save Summary ---`);
    console.log(`Attempted: ${totalToSave}`);
    console.log(`New scenarios created: ${createdCount}`);
    console.log(`Existing scenarios updated: ${updatedCount}`);
    console.log(`Failed: ${totalToSave - createdCount - updatedCount}`);
    console.log(`---------------------------------`);
  } else {
    // Save to JSON file
    const filename = 'polymarket_scenarios.json';
    try {
      fs.writeFileSync(filename, JSON.stringify(scenarios, null, 2));
      console.log(`${totalToSave} scenarios saved to ${filename}`);
      createdCount = totalToSave; // Assume all are "created" for file output
    } catch (error) {
      console.error(`Error writing scenarios to ${filename}:`, error);
    }
  }

  return { created: createdCount, updated: updatedCount, total: totalToSave };
}

/**
 * Main function to scrape Polymarket event list and save data
 * @param {Object} options - Configuration options for the scraper (passed to scrapePolymarketData)
 * @param {boolean} useMongoDB - Whether to save to MongoDB (true) or JSON file (false)
 */
async function runPolymarketEventScraper(options = {}, useMongoDB = true) {
  console.log('Starting Polymarket Event Scraper...');
  try {
    const scenarios = await scrapePolymarketData(options);
    if (scenarios && scenarios.length > 0) {
      await saveScenarioData(scenarios, useMongoDB);
    } else {
      console.log('No scenarios scraped from events.');
    }
  } catch (error) {
    console.error('Error during Polymarket event scraping:', error);
    // Decide if the error should propagate or be handled here
    // throw error; // Uncomment to propagate
  } finally {
    if (useMongoDB && mongoose.connection.readyState >= 1) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed after event scrape.');
    }
    console.log('Polymarket Event Scraper finished.');
  }
}

/**
 * Example function to fetch a single market and save it.
 * @param {string} marketId - The ID of the market to fetch and save.
 * @param {boolean} useMongoDB - Whether to save to MongoDB (true) or JSON file (false)
 */
async function fetchAndSaveSingleMarket(marketId, useMongoDB = true) {
  console.log(`Starting single market fetch for ID: ${marketId}...`);
  let scenario = null;
  try {
    scenario = await fetchAndFormatSinglePolymarketMarket(marketId);

    if (scenario) {
      // Save the single scenario (pass it as an array to saveScenarioData)
      await saveScenarioData([scenario], useMongoDB);
    } else {
      console.log(`Could not fetch or format market ${marketId}. Not saving.`);
    }
  } catch (error) {
    console.error(`Error fetching or saving single market ${marketId}:`, error);
  } finally {
    if (useMongoDB && mongoose.connection.readyState >= 1) {
      await mongoose.disconnect();
      console.log('MongoDB connection closed after single market operation.');
    }
    console.log(`Single market operation finished for ID: ${marketId}.`);
  }
}

// --- Example Usage ---

// Example 1: Run the event scraper with specific options, save to JSON
// runPolymarketEventScraper({ limit: 50, maxItems: 150, active: true }, false)
//   .catch(error => {
//     console.error("Unhandled error during Polymarket event scraping:", error);
//     process.exit(1);
//   });

// Example 2: Fetch a single market by ID and save to JSON
// fetchAndSaveSingleMarket('501011', false) // Use the example market ID
//     .catch(error => {
//         console.error("Unhandled error during single market fetch/save:", error);
//         process.exit(1);
//     });

// Example 3: Run event scraper with defaults, save to MongoDB (ensure MONGODB_URI is set in .env)
// runPolymarketEventScraper({}, true)
//   .catch(error => {
//     console.error("Unhandled error during Polymarket event scraping:", error);
//     process.exit(1);
//   });

// Choose ONE example to run or comment them all out if running via import
// Default: Run event scraper with limited items to JSON
runPolymarketEventScraper({
  limit: 100,
  active: true,
  endDateMin: new Date().toISOString(),
}, false).catch((error) => {
  console.error('Unhandled error during Polymarket event scraping:', error);
  process.exit(1);
});


// fetchAndSaveSingleMarket('501011', false).catch((error) => {
//   console.error('Unhandled error during single market fetch/save:', error);
//   process.exit(1);
// });

// Export functions if needed for module usage
export {
  scrapePolymarketData,
  fetchAndFormatSinglePolymarketMarket,
  saveScenarioData,
  runPolymarketEventScraper,
  fetchAndSaveSingleMarket,
  formatPolymarketScenario, // Export the formatter if needed elsewhere
};

// export default runPolymarketEventScraper; // Example default export
