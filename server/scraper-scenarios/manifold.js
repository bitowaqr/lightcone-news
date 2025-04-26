import mongoose from 'mongoose';
import Scenario from '../models/Scenario.model.js';
import dotenv from 'dotenv';
import fs from 'fs'; // For potential test file writing

dotenv.config();

const PLATFORM_NAME = 'Manifold';
const MANIFOLD_API_BASE_URL = 'https://api.manifold.markets/v0';

/**
 * Extracts plain text content from a TipTap/ProseMirror JSON object.
 * @param {Object} contentNode - The TipTap JSON node.
 * @returns {string} - The extracted plain text.
 */
function extractTextFromTipTapJson(contentNode) {
  let text = '';
  if (!contentNode || !contentNode.content) {
    return '';
  }

  function traverse(node) {
    if (node.type === 'text' && node.text) {
      text += node.text;
    }

    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((childNode, index) => {
        traverse(childNode);
        // Add a newline after paragraphs/list items/etc.
        if (['paragraph', 'listItem', 'heading', 'blockquote'].includes(node.type) && index < node.content.length - 1) {
             if (childNode.type === 'text') text += '\n';
        }
      });
    }

     // Add double newline after major block elements
     if (['paragraph', 'orderedList', 'bulletList', 'heading', 'blockquote', 'codeBlock'].includes(node.type)) {
       text += '\n\n';
     }
      if (node.type === 'hardBreak') {
          text += '\n';
      }
  }

  traverse(contentNode);
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Formats raw Manifold market data into the Scenario schema.
 * @param {Object} market - The raw *full* market object from the Manifold API.
 * @returns {Object|null} - The formatted scenario data object or null if processing fails.
 */
function formatManifoldScenario(market) {
  try {
    if (!market.question || !market.id) {
      // console.warn(`Skipping Manifold market due to missing question or id: ${market?.slug || 'No slug'}`);
      return null;
    }

    let scenarioType = 'UNKNOWN';
    let currentProbability = null;
    let options = null;

    if (market.outcomeType === 'BINARY' && market.probability !== undefined && market.probability !== null) {
        scenarioType = 'BINARY';
        currentProbability = parseFloat(market.probability);
        if (isNaN(currentProbability) || currentProbability < 0 || currentProbability > 1) {
            // console.warn(`Invalid probability for Manifold market ${market.id}: ${market.probability}. Setting to null.`);
            currentProbability = null;
        }
    } else if (market.outcomeType === 'MULTIPLE_CHOICE') {
        scenarioType = 'CATEGORICAL';
        if (market.answers && Array.isArray(market.answers) && market.answers.length > 0) {
            options = market.answers.map((ans, index) => ({
                name: ans.text || `Option ${index + 1}`,
                probability: ans.probability !== undefined ? parseFloat(ans.probability) : 0,
            }));
            const probSum = options.reduce((sum, opt) => sum + opt.probability, 0);
            if (probSum > 0 && Math.abs(probSum - 1) > 0.01) {
                 // console.warn(`Normalizing probabilities for Manifold MC market ${market.id}. Original sum: ${probSum}`);
                 options = options.map(opt => ({ ...opt, probability: opt.probability / probSum }));
            }
        } else {
             options = [];
        }
    } else {
         return null; // Skip other types like FREE_RESPONSE, NUMERIC, PSEUDO_NUMERIC etc.
    }


    let resolutionStatus = 'OPEN';
    let resolutionDate = null;
    let resolutionCloseDate = null;
    let resolutionValue = null;

    if (market.isResolved) {
        resolutionStatus = 'RESOLVED';
        resolutionDate = market.resolutionTime ? new Date(market.resolutionTime) : null;
        resolutionCloseDate = market.closeTime ? new Date(market.closeTime) : null;
        resolutionValue = market.resolution || null;
        if (scenarioType === 'BINARY') {
            const resolvedProb = market.resolutionProbability;
            if (resolvedProb !== undefined) {
                currentProbability = parseFloat(resolvedProb);
            } else if (resolutionValue === 'YES') {
                currentProbability = 1.0;
            } else if (resolutionValue === 'NO') {
                currentProbability = 0.0;
            } else if (resolutionValue === 'MKT' || resolutionValue === 'CANCEL') {
                 currentProbability = market.probability !== undefined ? parseFloat(market.probability) : null;
             }
        } else if (scenarioType === 'CATEGORICAL' && resolutionValue && options) {
             options = options.map(opt => ({
                 ...opt,
                 probability: opt.name === resolutionValue ? 1.0 : 0.0
             }));
        }
    } else if (market.closeTime && new Date(market.closeTime) < new Date()) {
        resolutionStatus = 'CLOSED';
        resolutionCloseDate = new Date(market.closeTime);
    } else {
        resolutionStatus = 'OPEN';
        resolutionCloseDate = market.closeTime ? new Date(market.closeTime) : null;
    }

    const resolutionData = {
      resolutionSource: null,
      resolutionSourceUrl: null,
      expectedResolutionDate: resolutionCloseDate,
      resolutionDate: resolutionDate,
      resolutionCloseDate: resolutionCloseDate,
      resolutionValue: resolutionValue,
    };

    let descriptionText = market.description ? extractTextFromTipTapJson(market.description) : null;
    resolutionData.resolutionCriteria = descriptionText;

    const scenarioData = {
      question: market.question.trim(),
      description: descriptionText,
      platform: PLATFORM_NAME,
      platformScenarioId: market.id,
      conditionId: `${PLATFORM_NAME}_${market.id}`,
      tags: market.groupSlugs || [],
      openDate: market.createdTime ? new Date(market.createdTime) : null,
      publishDate: market.createdTime ? new Date(market.createdTime) : null,
      scenarioType: scenarioType,
      status: resolutionStatus,
      currentProbability: currentProbability,
      currentValue: null,
      options: options,
      url: market.url || `https://manifold.markets/${market.creatorUsername}/${market.slug}`,
      apiUrl: `${MANIFOLD_API_BASE_URL}/market/${market.id}`,
      embedUrl: null,
      volume: market.volume || 0,
      liquidity: market.totalLiquidity || null,
      numberOfTraders: market.uniqueBettorCount || 0,
      numberOfPredictions: market.totalBettors || 0,
      resolutionData: resolutionData,
      scrapedDate: new Date(),
    };

    if (scenarioType === 'BINARY' && scenarioData.currentProbability === null && scenarioData.status !== 'RESOLVED') {
        return null;
    }
     if (scenarioType === 'CATEGORICAL' && (!scenarioData.options || scenarioData.options.length === 0) && scenarioData.status !== 'RESOLVED') {
         return null;
    }

    return scenarioData;
  } catch (error) {
    console.error(`Error formatting Manifold market ${market?.id || 'ID missing'}:`, error);
    return null;
  }
}

/**
 * Filters a list of LiteMarket objects based on specified criteria.
 * @param {Array<Object>} liteMarkets - An array of LiteMarket objects.
 * @param {Object} [filterOptions={}] - Optional configuration for filtering.
 * @returns {Array<string>} - An array of market IDs that pass the filter.
 */
function filterLiteMarkets(liteMarkets) {
    const filteredMarketIds = [];
    let skippedCount = 0;
    
    // Get current time for date comparisons
    const now = Date.now();
    const oneDayOld = now - (1 * 24 * 60 * 60 * 1000);
    const oneWeekOld = now - (7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60 * 1000);
    const lastBetLessThan14DaysAgo = (market) => market.lastBetTime && market.lastBetTime > fourteenDaysAgo;
    const fiveYearsAgo = now - (5 * 365 * 24 * 60 * 60 * 1000);
    const fiveYearsFromNow = now + (5 * 365 * 24 * 60 * 60 * 1000);
    const isResolved = (market) => market.isResolved === true;
    // unique bettor filters
    const minUniqueBettorsOnFirstDay = 5;
    const minUniqueBettorsInFirstWeek = 10;
    const minUniqueBettorsAfterFirstWeek = 20;
    const minUniqueBettorsAfter14Days = 30;
    // volume filters
    const minVolumeFirstDay = 500;
    const minVolumeFirstWeek = 1_000;
    const minVolumeAfterFirstWeek = 2_000;
    const minVolumeAfter14Days = 5_000;

    for (const liteMarket of liteMarkets) {
        let keep = true;

        // Not resolved filter
        if (isResolved(liteMarket)) {
            keep = false;
        }

        // based on age of market, apply different unique bettor counts
        if (keep) {
            if (liteMarket.createdTime > oneDayOld) {
                // Less than 1 day old
                if (liteMarket.uniqueBettorCount < minUniqueBettorsOnFirstDay) {
                    keep = false;
                }
                if (liteMarket.volume < minVolumeFirstDay) {
                    keep = false;
                }
            } else if (liteMarket.createdTime > oneWeekOld) {
                // Between 1 day and 1 week old
                if (liteMarket.uniqueBettorCount < minUniqueBettorsInFirstWeek) {
                    keep = false;
                }
                if (liteMarket.volume < minVolumeFirstWeek) {
                    keep = false;
                }
            } else if (liteMarket.createdTime > fourteenDaysAgo) {
                // Between 1 week and 14 days old
                if (liteMarket.uniqueBettorCount < minUniqueBettorsAfterFirstWeek) {
                    keep = false;
                }
                if (liteMarket.volume < minVolumeAfterFirstWeek) {
                    keep = false;
                }
            } else {
                // Older than 14 days
                if (liteMarket.uniqueBettorCount < minUniqueBettorsAfter14Days) {
                    keep = false;
                }
                if (liteMarket.volume < minVolumeAfter14Days) {
                    keep = false;
                }
            }
        }
        
        
        // Last bet in the last 14 days filter
        if (keep && lastBetLessThan14DaysAgo(liteMarket)) {
            keep = false;
        }
        
        // // Volume filter
        // if (keep && (liteMarket.volume === undefined || liteMarket.volume <= minVolume)) {
        //     keep = false;
        // }
        
        // Created within the last 5 years filter
        if (keep && liteMarket.createdTime && liteMarket.createdTime < fiveYearsAgo) {
            keep = false;
        }
        
        // Will close within the next 5 years filter
        if (keep && liteMarket.closeTime && liteMarket.closeTime > fiveYearsFromNow) {
            keep = false;
        }

        if (keep) {
            filteredMarketIds.push(liteMarket.id);
        } else {
            skippedCount++;
        }
    }

    console.log(`[Manifold] Filtered out ${skippedCount} markets. ${filteredMarketIds.length} remaining.`);
    return filteredMarketIds;
}

/**
 * Scrapes Manifold Markets API using the /search-markets endpoint.
 * @param {Object} options - Configuration options for the scraper.
 * @returns {Promise<Array>} - Promise resolving to an array of formatted scenario data objects.
 */
async function scrapeManifoldData(options = {}) {
    const config = {
        term: options.term || '',
        limit: Math.min(options.limit || 1_000, 1000),
        maxItems: options.maxItems,
        sort: options.sort || 'last-updated',
        filter: options.filter || 'open',
        contractType: options.contractType || 'BINARY',
        creatorId: options.creatorId,
        topicSlug: options.topicSlug,
        minLiquidity: options.minLiquidity,
    };

    const allLiteMarkets = [];

    // --- Phase 1: Collect all relevant LiteMarkets --- 
    let keepFetching = true;
    let offset = 0;
    let fetchedCount = 0;
    while (keepFetching && (config.maxItems === undefined || fetchedCount < config.maxItems)) {
        const queryParams = new URLSearchParams();
        queryParams.set('term', config.term);
        queryParams.set('limit', config.limit.toString());
        queryParams.set('offset', offset.toString());
        queryParams.set('sort', config.sort);
        queryParams.set('filter', config.filter);
        queryParams.set('contractType', config.contractType);
        if (config.creatorId) queryParams.set('creatorId', config.creatorId);
        if (config.topicSlug) queryParams.set('topicSlug', config.topicSlug);
        if (config.minLiquidity !== undefined) queryParams.set('liquidity', config.minLiquidity.toString());

        const url = `${MANIFOLD_API_BASE_URL}/search-markets?${queryParams.toString()}`;

        try {
            const resp = await fetch(url);
            if (!resp.ok) {
                console.error(`Manifold search failed (Offset ${offset}): Status ${resp.status}`);
                keepFetching = false;
                continue;
            }

            const liteMarkets = await resp.json();
            if (!liteMarkets || !Array.isArray(liteMarkets) || liteMarkets.length === 0) {
                keepFetching = false;
                continue;
            }

            // Respect maxItems limit for fetched lite markets
            const remainingSlots = config.maxItems !== undefined ? config.maxItems - fetchedCount : Infinity;
            const marketsToAdd = liteMarkets.slice(0, remainingSlots);
            allLiteMarkets.push(...marketsToAdd);
            fetchedCount += marketsToAdd.length;

            if (marketsToAdd.length < liteMarkets.length || fetchedCount === config.maxItems) {
                keepFetching = false; // Reached maxItems or end of results for this slice
            }
            if (liteMarkets.length < config.limit) {
                keepFetching = false; // Reached the actual end of API results
            }

            if (keepFetching) {
                offset += config.limit;
                 await new Promise(resolve => setTimeout(resolve, 300)); // Delay between pages
            }

        } catch (error) {
            console.error(`Error during Manifold search fetch (Offset ${offset}):`, error);
            keepFetching = false;
        }
    } 
    
    // --- Phase 2: Filter collected LiteMarkets --- 
    const filteredMarketIds = filterLiteMarkets(allLiteMarkets, { minVolume: 1 });

    // --- Phase 3: Fetch Full Details for filtered markets --- 
    const allFormattedScenarios = [];
    let formattedCount = 0;
    const detailFetchLimit = config.maxItems !== undefined ? config.maxItems : Infinity;

    for (const marketId of filteredMarketIds) {
         if (formattedCount >= detailFetchLimit) {
            console.log(`Reached maxItems limit (${detailFetchLimit}) during detail fetching.`);
            break;
         }

        try {
            const scenarioData = await fetchAndFormatSingleManifoldMarket(marketId);
            if (scenarioData) {
                allFormattedScenarios.push(scenarioData);
                formattedCount++;
            }
            await new Promise(resolve => setTimeout(resolve, 150)); // Rate limiting delay (400/min)
        } catch (error) {
            console.error(`Error fetching/formatting market ${marketId} in Phase 3:`, error);
            await new Promise(resolve => setTimeout(resolve, 150)); // Delay even on error
        }
    }

    return allFormattedScenarios;
}


/**
 * Fetches and formats data for a single Manifold market by its ID.
 * @param {string} marketId - The ID of the market to fetch.
 * @returns {Promise<Object|null>} - Formatted scenario data or null if fetch/format fails.
 */
async function fetchAndFormatSingleManifoldMarket(marketId) {
  if (!marketId) {
    console.error('Manifold Market ID is required.');
    return null;
  }
  const url = `${MANIFOLD_API_BASE_URL}/market/${marketId}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
       if (resp.status === 404) {
           // console.warn(`Manifold market ${marketId} not found (404).`);
           return null;
       }
      console.error(
        `Failed to fetch Manifold market ${marketId}. Status: ${resp.status}`
      );
      return null;
    }
    const marketData = await resp.json();

    if (!marketData) {
      // console.error(`No data returned for Manifold market ${marketId}.`);
      return null;
    }

    const formattedScenario = formatManifoldScenario(marketData);
    if (!formattedScenario) {
    //   console.warn(`Failed to format Manifold market ${marketId}.`);
    }
    return formattedScenario;
  } catch (error) {
    console.error(
      `Error fetching or processing single Manifold market ${marketId}:`,
      error
    );
    return null;
  }
}

/**
 * Fetches the current probability for a specific Manifold market.
 * @param {string} marketId - The ID of the market to fetch probability for.
 * @returns {Promise<number|null>} - The probability (0 to 1) or null if fetch fails.
 */
async function getManifoldMarketProbability(marketId) {
  if (!marketId) {
    console.error('Manifold Market ID is required');
    return null;
  }
  const url = `${MANIFOLD_API_BASE_URL}/market/${marketId}/prob`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      if (resp.status === 404) {
           return null;
       }
      console.error(
        `Failed fetch probability for Manifold market ${marketId}. Status: ${resp.status}`
      );
      return null;
    }
    const probData = await resp.json();

    if (probData && probData.probability !== undefined && probData.probability !== null) {
        const probability = parseFloat(probData.probability);
        return !isNaN(probability) ? probability : null;
    } else {
      return null;
    }
  } catch (error) {
    console.error(
      `Error fetching probability for Manifold market ${marketId}:`,
      error
    );
    return null;
  }
}



// Export functions for external use
export {
  scrapeManifoldData,
  fetchAndFormatSingleManifoldMarket,
  formatManifoldScenario,
  getManifoldMarketProbability,
};



// --- Testing Function ---
// async function runManifoldTests() {
//      const testMarkets = await scrapeManifoldData({
//          maxItems: 100_000,
//      });
//      console.log(`Fetched ${testMarkets.length} markets for testing.`);
//      fs.writeFileSync('manifold_test_results.json', JSON.stringify(testMarkets, null, 2));
//      console.log("Test results saved to manifold_test_results.json");
//      // process.exit(0);
// }
// Example direct run:
// runManifoldTests();