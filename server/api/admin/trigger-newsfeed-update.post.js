import { defineEventHandler, createError, readBody } from 'h3';
import { createNewsfeed } from '~~/workers/createNewsfeed.js';

// Default values and constraints
const DEFAULT_UPDATE_SCENARIOS = true;
const DEFAULT_MAX_STORIES = 10;
const MIN_MAX_STORIES = 0;
const MAX_MAX_STORIES = 20;

export default defineEventHandler(async (event) => {
  // This endpoint should be protected by the admin middleware already configured for /api/admin/*

  let updateScenarios = DEFAULT_UPDATE_SCENARIOS;
  let maxNewStories = DEFAULT_MAX_STORIES;

  try {
    // Read body only if the request method is POST/PUT/etc. and has content
    if (event.node.req.method !== 'GET' && event.node.req.method !== 'HEAD') {
      const body = await readBody(event);

      // Safely access and validate updateScenarios
      if (body && typeof body.updateScenarios === 'boolean') {
        updateScenarios = body.updateScenarios;
      }

      // Safely access and validate maxNewStories
      if (body && typeof body.maxNewStories === 'number') {
        maxNewStories = Math.max(MIN_MAX_STORIES, Math.min(MAX_MAX_STORIES, Math.floor(body.maxNewStories)));
      } else if (body && body.maxNewStories !== undefined) {
        console.warn(`[API] Invalid maxNewStories value received: ${body.maxNewStories}. Using default ${DEFAULT_MAX_STORIES}.`);
      }
    }
  } catch (error) {
    // Handle potential errors during body parsing (e.g., invalid JSON)
    console.error(`[API] Error reading request body:`, error);
    // Optionally return an error response, though for this fire-and-forget endpoint,
    // proceeding with defaults might be acceptable.
    // throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid request body.' });
    console.warn(`[API] Proceeding with default parameters due to body parsing error.`);
  }

  console.log(`[API] Received request to trigger newsfeed update at ${new Date().toISOString()} with options: updateScenarios=${updateScenarios}, maxNewStories=${maxNewStories}`);

  // Execute createNewsfeed asynchronously with validated/defaulted parameters
  createNewsfeed(updateScenarios, maxNewStories)
    .then(() => {
      console.log(`[API] createNewsfeed process started successfully in the background with options: updateScenarios=${updateScenarios}, maxNewStories=${maxNewStories}.`);
      // Optional: Log completion somewhere persistent if needed
    })
    .catch(err => {
      console.error(`[API] Error initiating createNewsfeed process:`, err);
      // Optional: Log error somewhere persistent
    });

  // Immediately return a response to the client
  return {
    statusCode: 202, // Accepted
    statusMessage: 'Accepted',
    message: `Newsfeed update process initiated in the background with options: Scenarios Update=${updateScenarios}, Max New Stories=${maxNewStories}.`,
  };

  // Note: No try/catch around the async call itself because we want to return immediately.
  // The error handling is within the .catch() of the promise.
  // If the *initiation* fails synchronously (e.g., import error), h3's default error handling will take over.
}); 