import mongoose from 'mongoose';
import Scenario from '../models/Scenario.model.js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const PLATFORM_NAME = 'Metaculus';
const METACULUS_API_BASE_URL = 'https://www.metaculus.com/api';
const METACULUS_POSTS_ENDPOINT = `${METACULUS_API_BASE_URL}/posts/`;


function extractPredictionData(question) {
    let currentProbability = null;

    const predictionSource = question.aggregations?.recency_weighted?.latest || question.aggregations?.metaculus_prediction?.latest;

    if (!predictionSource) {
        return { currentProbability };
    }
    if (question.type === 'binary') {
        try {
            if (predictionSource.centers && predictionSource.centers.length > 0) {
                currentProbability = parseFloat(predictionSource.centers[0]);
            } else if (predictionSource.forecast_values && predictionSource.forecast_values.length === 2) {
                currentProbability = parseFloat(predictionSource.forecast_values[1]);
            }
        } catch (error) {
            // Minimal error handling: reset value
            currentProbability = null;
        }
    }

    return { currentProbability };
}


function formatMetaculusScenario(post) {
  try {
    const question = post.question;
    // Only process if it's a binary question
    if (!question || typeof question !== 'object' || !question.title || !question.id || question.type !== 'binary') {
        return null;
    }

    // No need for switch statement, type is always BINARY
    const scenarioType = 'BINARY';

    const predictionData = extractPredictionData(question); // Now only returns { currentProbability }

    const statusSource = question.status || post.status;
    let resolutionStatus = 'UNKNOWN';
    const statusLower = statusSource ? statusSource.toLowerCase() : 'unknown';
    if (statusLower === 'open') resolutionStatus = 'OPEN';
    else if (statusLower === 'closed') resolutionStatus = 'CLOSED';
    else if (statusLower === 'resolved') resolutionStatus = 'RESOLVED';
    else if (statusLower === 'upcoming' || statusLower === 'pending') resolutionStatus = 'UPCOMING';

    const finePrint = question.fine_print ? '\nFine Print: ' + question.fine_print : '';
    const resolutionCriteria = question.resolution_criteria ? question.resolution_criteria + ' ' + finePrint : null;

    const resolutionData = {
      resolutionCriteria: resolutionCriteria,
      resolutionSource: null,
      resolutionSourceUrl: null,
      expectedResolutionDate: post.scheduled_resolve_time ? new Date(post.scheduled_resolve_time) : null,
      resolutionDate: question.actual_resolve_time ? new Date(question.actual_resolve_time) : null,
      resolutionCloseDate: question.actual_close_time ? new Date(question.actual_close_time) : null,
      resolutionValue: question.resolution,
    };

    let tags = [];
    // Simplified tag extraction - prioritize topics/categories if they exist
    if (post.projects) {
        if (post.projects.topic) tags = post.projects.topic.map(t => t.name);
        else if (post.projects.category) tags = post.projects.category.map(c => c.name);
        tags = [...new Set(tags)];
    }

    const pageUrl = `https://www.metaculus.com/questions/${post.id || question.id}/${post.slug || ''}`;

    const scenarioData = {
      question: question.title.trim(),
      questionNew: question.title.trim(), // metaculus has good question labels!
      description: question.description || null,
      platform: PLATFORM_NAME,
      platformScenarioId: post.id.toString(),
      platformQuestionId: question.id.toString(),
      conditionId: PLATFORM_NAME + '_' + (post.id.toString() ? post.id.toString() + '_' : '') + (question.id.toString() ? question.id.toString() : ''),
      tags: tags,
      openDate: post.open_time ? new Date(post.open_time) : null,
      publishDate: post.published_at ? new Date(post.published_at) : null,
      scenarioType: scenarioType, // Always BINARY
      status: resolutionStatus,
      currentProbability: predictionData.currentProbability,
      currentValue: null, // Not applicable for binary
      options: null,      // Not applicable for binary
      url: pageUrl,
      apiUrl: `${METACULUS_POSTS_ENDPOINT}${post.id}/`,
      embedUrl: `https://www.metaculus.com/questions/embed/${post.id}`,
      commentCount: post.comment_count || 0,
      volume: null,
      liquidity: null,
      numberOfTraders: post.nr_forecasters || 0,
      numberOfPredictions: post.forecasts_count || 0,
      votes: post.vote?.score,
      rationaleSummary: '',
      rationaleDetails: '',
      dossier: {},
      comments: [],
      resolutionData: resolutionData,
      relatedArticleIds: [],
      relatedScenarioIds: [],
      relatedSourceDocumentIds: [],
      scrapedDate: new Date(),
      // AI Vector Embedding fields removed as they are handled elsewhere
    };

    return scenarioData;
  } catch (error) {
    return null; // Minimal error handling: return null on any error
  }
}

async function fetchAndFormatSingleMetaculusPost(postId) { // Renamed function
  if (!postId) return null;

  const url = `${METACULUS_POSTS_ENDPOINT}${postId}/`;
  try {
    const headers = {Authorization: `Token ${process.env.METACULUS_API_TOKEN}`};

    const resp = await fetch(url, { headers });
    if (!resp.ok) {
        console.error(`Failed Metaculus fetch for ${postId}: Status ${resp.status}`); // Minimal error log
        return null;
    }

    const postData = await resp.json();
    if (!postData) return null;

    return formatMetaculusScenario(postData);

  } catch (error) {
    console.error(`Error fetching/processing post ${postId}:`, error.message); // Minimal error log
    return null;
  }
}

async function scrapeMetaculusData(options = {}, returnAll = false) {
  const config = {
    limit: options.limit || 100,
    maxItems: options.maxItems || 10_000,
    statuses: options.statuses || ['open'],
    open_time__gt: options.open_time__gt === undefined ? '2020-01-01' : options.open_time__gt,
    scheduled_resolve_time__lt: options.scheduled_resolve_time__lt === undefined ? '2035-01-01' : options.scheduled_resolve_time__lt,
    order_by: options.order_by || '-published_at',
    forecast_type: 'binary', // Always fetch only binary questions
    // Add other simple filters directly if needed, e.g. project: options.project
  };

  const queryParams = new URLSearchParams();
  queryParams.set('limit', config.limit.toString());
  queryParams.set('with_cp', 'false');
  queryParams.set('order_by', config.order_by);
  queryParams.set('forecast_type', config.forecast_type); 
  if(config.open_time__gt)
    queryParams.set('open_time__gt', config.open_time__gt);
  if(config.scheduled_resolve_time__lt)
    queryParams.set('scheduled_resolve_time__lt', config.scheduled_resolve_time__lt);
  if (config.statuses && Array.isArray(config.statuses)) {
      config.statuses.forEach(status => queryParams.append('statuses', status));
  }
   
  const basePostsUrl = METACULUS_POSTS_ENDPOINT;
  const headers = {Authorization: `Token ${process.env.METACULUS_API_TOKEN}`};

  let nextUrl = `${basePostsUrl}?${queryParams.toString()}`;
  let processedCount = 0;
  const formattedScenarios = [];
  let overallBatchNum = 0; // Track batch number across all pages
  let totalPostsCount = null; // Store total posts count from API

  while (nextUrl && processedCount < config.maxItems) {
    try {
      const resp = await fetch(nextUrl, { headers });
      if (!resp.ok) {
          console.error(`Metaculus fetch failed: Status ${resp.status}`); 
          break; // Stop if list fetch fails
      }

      const responseData = await resp.json();
      if (!responseData || !responseData.results || responseData.results.length === 0) {
          break; // No more results
      }

      const batchSize = 100; // Declare batchSize earlier

      // Store total count from the first response if available
      if (totalPostsCount === null && responseData.count !== undefined) {
          totalPostsCount = responseData.count;
      }
      // Use maxItems as fallback for total if count not available
      const totalEstimate = totalPostsCount !== null ? Math.min(totalPostsCount, config.maxItems) : config.maxItems;
      const totalBatchesEstimate = Math.ceil(totalEstimate / batchSize);

      const posts = responseData.results;

      for (let i = 0; i < posts.length; i += batchSize) {
        if (processedCount >= config.maxItems) break;

        overallBatchNum++; // Increment overall batch number
        // console.log(`Processing batch ${overallBatchNum}...`); // Log overall progress

        const batchPosts = posts.slice(i, Math.min(i + batchSize, posts.length));
        
        // Process all posts in the batch concurrently
        const batchPromises = batchPosts.map(postOverview => 
          fetchAndFormatSingleMetaculusPost(postOverview.id)
        );
        
        
        // Wait for all batch requests to complete
        const batchResults = await Promise.all(batchPromises);
        
        // Add valid results to our collection
        for (const scenarioData of batchResults) {
          if (scenarioData && processedCount < config.maxItems) {
            formattedScenarios.push(scenarioData);
            processedCount++;
          }
        }
        
        // Small delay between batches to be nice to the API
        if (i + batchSize < posts.length && processedCount < config.maxItems) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } // End batch processing loop

      nextUrl = responseData.next;

    } catch (error) {
      console.error(`Error during Metaculus scrape loop:`, error.message); // Minimal error log
      break; // Stop on loop error
    }
  }

  return returnAll ? formattedScenarios : formattedScenarios.filter(post => post !== null && (post.currentProbability != null || post.currentValue != null));
}


// --- Example Usage ---

async function runMetaculusTests() {
    
    const recentOpenBinary = await scrapeMetaculusData({
        maxItems: 10_000,
        statuses: ['open'],
        order_by: '-published_at',
        forecast_type: 'binary',
        open_time__gt: '2025-01-01',
        scheduled_resolve_time__lt: '2035-01-01'
    }, false);
    console.log(`[Metaculus] Fetched ${recentOpenBinary.length} posts.`);
    // fs store to file
    fs.writeFileSync('recentOpenBinary.json', JSON.stringify(recentOpenBinary, null, 2));
    
    // Test 2: Fetch a specific post by ID (use a known BINARY post ID, e.g., 14184)
    console.log("\n--- Test 2: Fetching single post by ID (e.g., 14184 -somethign about Canadian Prime Minister) ---");
    const specificPostIdBinary = 36677; // Post ID for "Will the WHO declare that mpox..."
    const singlePostBinary = await fetchAndFormatSingleMetaculusPost(specificPostIdBinary);
    if (singlePostBinary) {
        console.log(`Fetched Post ${specificPostIdBinary}: ${singlePostBinary.question}`);
        console.log(`Type: ${singlePostBinary.scenarioType}, Status: ${singlePostBinary.status}, Probability: ${singlePostBinary.currentProbability}`);
        // console.log("Full data:", singlePostBinary);
    } else {
        console.log(`Could not fetch or format post ${specificPostIdBinary}. Check ID and METACULUS_API_TOKEN if it's private.`);
    }

    // Test 3: Fetch a different type of question (e.g., numeric/continuous, use Post ID 14333)
     console.log("\n--- Test 3: Fetching single NUMERIC post by ID (e.g., 14333 - something old person) ---");
     const specificPostIdNumeric = 14333; // Post ID for "How many nuclear weapons..."
     const singlePostNumeric = await fetchAndFormatSingleMetaculusPost(specificPostIdNumeric);
     if (singlePostNumeric) {
         console.log(`Fetched Post ${specificPostIdNumeric}: ${singlePostNumeric.question}`);
         console.log(`Type: ${singlePostNumeric.scenarioType}, Status: ${singlePostNumeric.status}, Median Value: ${singlePostNumeric.currentValue}`);
         // console.log("Full data:", singlePostNumeric);
     } else {
         console.log(`Could not fetch or format post ${specificPostIdNumeric}. Check ID and METACULUS_API_TOKEN if it's private.`);
     }

    // Test 4: Fetch 3 recently resolved posts
    console.log("\n--- Test 4: Fetching 3 recently resolved posts ---");
    const resolvedPosts = await scrapeMetaculusData({
        maxItems: 3,
        statuses: ['resolved'],
        order_by: '-resolution_set_time' // Sort by actual resolution time if available, fallback to scheduled? Check API docs. Let's try -published_at for safety.
        // order_by: '-actual_resolve_time' // Ideal, but might not be directly available as sort key? Check API Docs. Let's use -published_at as a proxy for recent resolved.
        // UPDATE: The post object doesn't have actual_resolve_time directly. Sorting by published_at might work.
        // Let's try sorting by post status change time implicitly via order_by=-published_at and filter statuses=resolved
        // Alternatively, fetch more and sort locally if exact resolve time sort is needed.
         // Trying '-published_at' as a proxy for recent resolved posts.
         // order_by: '-published_at'
    });
    console.log(`Fetched ${resolvedPosts.length} resolved posts.`);
    if (resolvedPosts.length > 0) {
        console.log(`Resolved Post 1 (ID ${resolvedPosts[0].platformScenarioId}): "${resolvedPosts[0].question}" -> Resolution: ${resolvedPosts[0].resolutionData.resolutionValue}`);
        // console.log("Full data:", resolvedPosts[0]);
    }

    // Test 5: Fetch posts from a specific project (Example: AI Alignment project ID 4991, needs check)
    // const projectId = 4991; // Find a real project ID from Metaculus website URL (e.g., /projects/ai-alignment-4991/)
    // console.log(`\n--- Test 5: Fetching 2 posts from Project ID ${projectId} ---`);
    // const projectPosts = await scrapeMetaculusData({
    //     maxItems: 2,
    //     project: projectId,
    //     statuses: ['open', 'resolved'], // Get open or resolved from this project
    //     order_by: '-published_at'
    // });
    // console.log(`Fetched ${projectPosts.length} posts from project ${projectId}.`);
    // if (projectPosts.length > 0) {
    //      console.log(`Project Post 1 (ID ${projectPosts[0].platformScenarioId}): "${projectPosts[0].question}"`);
    // }


    console.log("\n--- Metaculus Testing Complete ---");
}

// Export functions for external use
export {
  scrapeMetaculusData,
  fetchAndFormatSingleMetaculusPost, // Renamed export
  formatMetaculusScenario,
  // Add other exports if needed
};

// runMetaculusTests().catch(console.error);

