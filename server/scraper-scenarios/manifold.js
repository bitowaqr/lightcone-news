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
  let text = ' ';
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
         // console.warn(`Skipping Manifold market ${market.id} due to unsupported type: ${market.outcomeType}`);
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

/**
 * Fetches the probability history for a specific Manifold market using the /bets endpoint.
 * @param {string} marketId - The ID of the market (contractId in Manifold API).
 * @param {number} [afterTime] - Optional Unix timestamp (milliseconds) to fetch bets created after this time.
 * @param {number} [beforeTime] - Optional Unix timestamp (milliseconds) to fetch bets created before this time.
 * @returns {Promise<Object|null>} - A promise resolving to an object like { "Probability": [{t: time_ms, y: probability}, ...] } or null on error.
 */
async function getManifoldMarketProbHistory(marketId, afterTime = null, beforeTime = null) {
  if (!marketId) {
    console.error('[Manifold History] Market ID is required.');
    return null;
  }

  const allHistoryPoints = [];
  let lastBetId = null;
  let keepFetching = true;
  const limit = 1000; // Max limit

  // console.log(`[Manifold History] Fetching probability history for market: ${marketId}`);

  while (keepFetching) {
    const queryParams = new URLSearchParams();
    queryParams.set('contractId', marketId);
    queryParams.set('limit', limit.toString());
    queryParams.set('order', 'asc'); // Get oldest bets first

    if (lastBetId) {
      queryParams.set('after', lastBetId); // Fetch bets created *after* the last one we saw
    } else if (afterTime) {
        queryParams.set('afterTime', afterTime.toString()); // Use afterTime only for the first request if provided
    }
    // beforeTime filtering will be done after fetching all relevant bets

    const url = `${MANIFOLD_API_BASE_URL}/bets?${queryParams.toString()}`;
    // console.log(`[Manifold History] Fetching URL: ${url}`); // Debug logging

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error(
          `[Manifold History] Failed fetch for ${marketId}. Status: ${resp.status}, URL: ${url}`
        );
        return null; // Stop fetching on error
      }

      const bets = await resp.json();

      if (!bets || !Array.isArray(bets) || bets.length === 0) {
        keepFetching = false; // No more bets found
        continue;
      }

      // Process bets in the current batch
      for (const bet of bets) {
        // Ensure the bet has the necessary fields and is not a redemption or cancellation without probAfter
        // AND that the timestamp is a valid finite number
        if (bet.createdTime && typeof bet.createdTime === 'number' && isFinite(bet.createdTime) && 
            bet.probAfter !== undefined && bet.probAfter !== null && 
            !bet.isRedemption && !bet.isCancelled) {
             // Filter by beforeTime if provided
             if (!beforeTime || bet.createdTime <= beforeTime) {
                 // Ensure probability is also valid
                 if (typeof bet.probAfter === 'number' && isFinite(bet.probAfter)) {
                     allHistoryPoints.push({
                         t: bet.createdTime,
                         y: bet.probAfter,
                     });
                 }
             }
        }
        // Handle edge cases like initial liquidity provisions (might lack probAfter)
        // Or consider adding bet.probBefore as the first point if relevant? For now, stick to probAfter.
      }


      if (bets.length < limit) {
        keepFetching = false; // Reached the end of available bets
      } else {
        // Prepare for the next page: get the ID of the last bet in this batch
        lastBetId = bets[bets.length - 1].id;
        // Add a small delay to be kind to the API
        await new Promise(resolve => setTimeout(resolve, 150)); // 150ms delay (align with other fetches)
      }

    } catch (error) {
      console.error(
        `[Manifold History] Error fetching or processing bets for ${marketId}:`,
        error
      );
      return null; // Stop fetching on error
    }
  }

  // console.log(`[Manifold History] Fetched ${allHistoryPoints.length} data points for market ${marketId}.`);

  // Ensure points are sorted by time (asc order should handle this, but double-check)
  allHistoryPoints.sort((a, b) => a.t - b.t);
  
  // Add the initial market probability as the first point if it's earlier than the first bet
  try {
      const initialMarketData = await fetchAndFormatSingleManifoldMarket(marketId);
      if (initialMarketData && initialMarketData.openDate && initialMarketData.currentProbability !== null) {
          const initialTimestamp = initialMarketData.openDate.getTime();
          const initialProb = initialMarketData.currentProbability;
          
          // Ensure initial timestamp and probability are valid finite numbers
          if (typeof initialTimestamp === 'number' && isFinite(initialTimestamp) && 
              typeof initialProb === 'number' && isFinite(initialProb)) {
              
              const initialPoint = { t: initialTimestamp, y: initialProb };
              
              // Only add if history is empty or the initial point is earlier than the first bet
              if (allHistoryPoints.length === 0 || initialPoint.t < allHistoryPoints[0].t) {
                  // Check for duplicates before adding
                  if (allHistoryPoints.length === 0 || allHistoryPoints[0].t !== initialPoint.t) {
                     allHistoryPoints.unshift(initialPoint);
                     // console.log(`[Manifold History] Added initial market probability point for ${marketId}.`);
                  }
              }
          } else {
             // console.warn(`[Manifold History] Initial market data for ${marketId} had invalid time (${initialTimestamp}) or prob (${initialProb}). Skipping initial point.`);
          }
      } else {
            // console.log(`[Manifold History] No valid initial market data found for ${marketId}.`);
      }
  } catch(err) {
      // console.warn(`[Manifold History] Could not fetch initial market data to add starting point for ${marketId}: ${err.message}`);
  }


  // Return in the format expected by the chart component
  return { "Probability": allHistoryPoints };
}


// test
// const contractId = 'wxAw9u2C6JtNS3ZJnhYT';
// const response = await getManifoldMarketProbHistory(contractId);
// console.log(response);


/**
 * Generates a simple ASCII chart visualization of probability history data
 * @param {Array} probHistory - Array of {x: timestamp (ms), y: probability} points
 * @param {number} width - Width of the chart in characters
 * @param {number} height - Height of the chart in characters
 * @returns {string} - ASCII chart representation or error message
 */
function generateASCIIChart(probHistory, width = 80, height = 20) {
  // 1. Input Validation
  if (!probHistory || !Array.isArray(probHistory)) {
    // Return empty string or similar for non-error case where chart can't be made
    return "[ASCII Chart] Invalid input: probHistory is not an array."; 
  }
  
  // 2. Filter Input for valid finite numbers
  const validHistory = probHistory.filter(p => 
      typeof p.x === 'number' && isFinite(p.x) && 
      typeof p.y === 'number' && isFinite(p.y)
  );

  if (validHistory.length === 0) {
    return "[ASCII Chart Error] No valid data points found after filtering.";
  }

  // Create the chart grid
  const grid = Array(height).fill().map(() => Array(width).fill(' '));
  
  // 3. Min/Max Calculation & Validation (using filtered data)
  const minTime = Math.min(...validHistory.map(p => p.x));
  const maxTime = Math.max(...validHistory.map(p => p.x));
  const minProb = 0; // Probability is always 0-1
  const maxProb = 1;
  
  if (!isFinite(minTime) || !isFinite(maxTime)) {
      return `[ASCII Chart Error] Invalid time range calculated: minTime=${minTime}, maxTime=${maxTime}`;
  }

  // Handle case where all timestamps are the same (after filtering)
  const timeRange = maxTime - minTime;
  if (timeRange === 0 && validHistory.length > 0) {
    console.warn("[ASCII Chart] All valid data points have the same timestamp. Plotting at center.");
  }

  // 4. Scale the data points to fit the grid (using filtered data)
  const scaledPoints = validHistory.map(point => {
    let scaledX;
    // Use timeRange check after ensuring min/maxTime are finite
    if (timeRange === 0) {
        scaledX = Math.floor((width -1) / 2); // Place in middle if time range is zero
    } else {
        scaledX = Math.floor(((point.x - minTime) / timeRange) * (width - 1));
    }
    let scaledY = Math.floor(height - 1 - ((point.y - minProb) / (maxProb - minProb)) * (height - 1));
    
    // Clamp values to grid boundaries
    scaledX = Math.max(0, Math.min(width - 1, scaledX));
    scaledY = Math.max(0, Math.min(height - 1, scaledY));

    return {
        x: scaledX,
        y: scaledY
    };
  });
  
  // 5. Draw the points and connect them with lines
  for (let i = 0; i < scaledPoints.length - 1; i++) {
    const p1 = scaledPoints[i];
    const p2 = scaledPoints[i + 1];
    
    // Draw the current point
    grid[p1.y][p1.x] = '●';
    
    // Draw a line to the next point using Bresenham's line algorithm
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);
    const sx = p1.x < p2.x ? 1 : -1;
    const sy = p1.y < p2.y ? 1 : -1;
    let err = dx - dy;
    
    let x = p1.x;
    let y = p1.y;
    
    let safetyCounter = 0;
    const maxSteps = width + height; // A reasonable upper bound

    while (x !== p2.x || y !== p2.y) {
      if (safetyCounter++ > maxSteps) {
             console.error(`[ASCII Chart] Safety break triggered in Bresenham loop for points (${p1.x},${p1.y}) to (${p2.x},${p2.y})`);
             break; // Prevent infinite loop
        }
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x += sx;
        }
        if (e2 < dx) {
          err += dx;
          y += sy;
        }
        
        if (x >= 0 && x < width && y >= 0 && y < height) {
          grid[y][x] = '·';
        }
    }
  }
  
  // Draw the last point
  if (scaledPoints.length > 0) {
    const lastPoint = scaledPoints[scaledPoints.length - 1];
    grid[lastPoint.y][lastPoint.x] = '●';
  }
  
  // Add axes labels
  const yAxisLabels = [
    '1.0 ┤',
    '0.8 ┤',
    '0.6 ┤',
    '0.4 ┤',
    '0.2 ┤',
    '0.0 ┤'
  ];
  
  const labelPositions = [0, height * 0.2, height * 0.4, height * 0.6, height * 0.8, height - 1];
  
  // Add y-axis labels
  for (let i = 0; i < yAxisLabels.length; i++) {
    const pos = Math.floor(labelPositions[i]);
    if (pos >= 0 && pos < height) {
      const label = yAxisLabels[i];
      for (let j = 0; j < label.length; j++) {
        if (j < 5) { // Only add labels, not overwrite the chart
          grid[pos][j] = label[j];
        }
      }
    }
  }
  
  // Convert grid to string
  return grid.map(row => row.join('')).join('\n');
}

// Test the visualization
const testMarketId = 'wxAw9u2C6JtNS3ZJnhYT';
const testAfterTime = null; // start date
const testBeforeTime = null; // end date

async function visualizeTestData() {
  /* // Comment out test code
  const testProbHistoryData = await getManifoldMarketProbHistory(testMarketId, testAfterTime, testBeforeTime);

  // Check if historyData is valid and contains the Probability array
  if (testProbHistoryData && testProbHistoryData.Probability && Array.isArray(testProbHistoryData.Probability)) {
    // Map to the {x, y} format expected by generateASCIIChart
    const probHistoryArray = testProbHistoryData.Probability.map(p => ({ x: p.t, y: p.y }));
    
    if (probHistoryArray.length > 0) {
      console.log("Probability History Data Points:", probHistoryArray.length);
      console.log("First point (raw):", probHistoryArray[0]);
      console.log("Last point (raw):", probHistoryArray[probHistoryArray.length - 1]);
      
      // Generate and display ASCII chart using the mapped array
      const chart = generateASCIIChart(probHistoryArray, 100, 25);
      console.log("\nProbability History Chart:");
      console.log(chart);
      
      // Add time range information using actual data min/max
      const actualMinTime = Math.min(...probHistoryArray.map(p => p.x));
      const actualMaxTime = Math.max(...probHistoryArray.map(p => p.x));
      
      let startDate = 'N/A';
      let endDate = 'N/A';
      if(isFinite(actualMinTime)) {
          startDate = new Date(actualMinTime).toISOString().split('T')[0];
      }
      if(isFinite(actualMaxTime)) {
          endDate = new Date(actualMaxTime).toISOString().split('T')[0];
      }
      console.log(`\nTime Range (Actual Data): ${startDate} to ${endDate}`);
    } else {
        console.log("Fetched history data, but the Probability array was empty.");
    }
  } else {
    console.log("No probability history data available");
  }
  */
}

// Run the visualization
// await visualizeTestData();

// console.log('done');
// process.exit(0);


// Export functions for external use
export {
  scrapeManifoldData,
  fetchAndFormatSingleManifoldMarket,
  formatManifoldScenario,
  getManifoldMarketProbability,
  getManifoldMarketProbHistory
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

// --- New Test for History ---
async function testHistoryFetching() {
    // Example Market ID (Replace with a relevant one if needed)
    // const testMarketId = 'f88f4tezUPjNVab3eT4T'; // Ukraine peace deal
     const testMarketId = 'D3l2N5I44EAZsbWh4D3i'; // Another example market

    // Optional: Define time range (Unix timestamps in milliseconds)
    // const afterTimestamp = new Date('2024-01-01T00:00:00Z').getTime();
    // const beforeTimestamp = new Date('2024-07-01T00:00:00Z').getTime();
    const afterTimestamp = null;
    const beforeTimestamp = null;


    console.log(`\n--- Testing getManifoldMarketProbHistory for Market ID: ${testMarketId} ---`);
    const historyData = await getManifoldMarketProbHistory(testMarketId, afterTimestamp, beforeTimestamp);

    if (historyData && historyData.Probability && historyData.Probability.length > 0) {
        console.log(`Fetched ${historyData.Probability.length} history points.`);
        console.log("First 5 points:", historyData.Probability.slice(0, 5));
        console.log("Last 5 points:", historyData.Probability.slice(-5));

        // Optional: Generate ASCII chart if needed (uncomment visualizeTestData call or integrate here)
        const chart = generateASCIIChart(historyData.Probability, 100, 25);
        console.log("\nProbability History Chart:");
        console.log(chart);
        
        const startDate = afterTimestamp ? new Date(afterTimestamp).toISOString().split('T')[0] : 'Start';
        const endDate = beforeTimestamp ? new Date(beforeTimestamp).toISOString().split('T')[0] : 'End';
        console.log(`\nTime Range: ${startDate} to ${endDate}`);


    } else if (historyData && historyData.Probability && historyData.Probability.length === 0) {
        console.log("Successfully fetched, but no history points found within the criteria.");
    } else {
        console.log("Failed to fetch history data or an error occurred.");
    }
}

// Run the history test
testHistoryFetching();
// --- End New Test ---