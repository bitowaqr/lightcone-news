import { defineEventHandler, readBody } from 'h3';
import { evaluateRequest } from '../../agents/requestEvalutor.js'; 
import { mongoService } from '../../services/mongo.js'; 
import { createError } from 'h3'; 
import { generateForecastsSequential } from '../../services/generateForecasts.js';
import User from '../../models/User.model.js'; // Import User model



async function callForecastingAgents(scenarioData) {
  console.log(`Triggering forecasting agents for scenario: ${scenarioData._id || scenarioData.question}`);
  if (!scenarioData._id) {
    console.error('Cannot trigger forecast without scenario _id.');
    return false;
  }
  try {
    Promise.resolve().then(() => generateForecastsSequential(scenarioData._id)).catch(err => {
      console.error(`Error in background forecast for ${scenarioData._id}:`, err);
    });
    console.log(`Forecast generation initiated for ${scenarioData._id}.`);
    return true; // Indicate initiation success
  } catch (err) {
    console.error(`Failed to initiate forecast generation for ${scenarioData._id}:`, err);
    return false;
  }
}

export default defineEventHandler(async (event) => {
  let scenarioDataForLog = null; // Variable to hold data for logging attempts
  let userId = null; // User ID for logging

  try {
    const body = await readBody(event);
    const isRevisionConfirmation = body?.isRevisionConfirmation === true;
    const articleId = body?.articleId; // Extract potential articleId
    let scenarioData = { ...body }; 
    const user = event.context.user;
    userId = user?.id; // Assign userId here

    if (!userId) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized: only logged in users can submit requests.' });
    }

    // Remove helper flags from the data to be processed/saved
    if ('isRevisionConfirmation' in scenarioData) delete scenarioData.isRevisionConfirmation;
    if ('articleId' in scenarioData) delete scenarioData.articleId; // Don't save articleId within scenario

    // Keep a copy for potential logging of failed attempts
    scenarioDataForLog = { ...scenarioData }; 

    // --- Input Validation (Basic) ---
    if (!scenarioData || typeof scenarioData !== 'object') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' });
    }
    if (!scenarioData.question || !scenarioData.resolutionCriteria || !scenarioData.resolutionDate) {
      // Log validation failure attempt
      if (userId && scenarioDataForLog) {
        User.findByIdAndUpdate(userId, {
          $push: { attemptedForecastRequests: {
            question: scenarioDataForLog.question,
            resolutionCriteria: scenarioDataForLog.resolutionCriteria,
            resolutionDate: scenarioDataForLog.resolutionDate,
            status: 'VALIDATION_FAILED',
            reason: 'Missing required fields',
            attemptedAt: new Date()
          }}}).catch(err => console.error('Error logging validation failed attempt:', err));
      }
      throw createError({ statusCode: 400, statusMessage: 'Request is missing required fields: question, resolution criteria, or resolution date.' });
    }

    let evaluationResult;
    let articleContext = null;

    // Fetch article context if ID is provided
    if (articleId) {
        try {
            const article = await mongoService.getArticleById(articleId);
            if (article) {
                articleContext = {
                    title: article.title,
                    publishedDate: article.publishedDate,
                    precis: article.precis,
                    summary: article.summary,
                    timeline: article.timeline,
                };
                console.log(`Fetched context for articleId: ${articleId}`);
            } else {
                console.warn(`Article context not found for articleId: ${articleId}. Proceeding without it.`);
            }
        } catch (err) {
            console.error(`Error fetching article context for ${articleId}:`, err);
            // Decide if this is fatal. For now, log and continue without context.
        }
    }

    if (isRevisionConfirmation) {
      // If user confirmed revision, bypass agent evaluation and treat as confirmed
      console.log('Received confirmed revision. Proceeding directly to save.');
      // Use the submitted data directly, assuming it's the revised version
      evaluationResult = { status: 'CONFIRMED', data: scenarioData, message: 'Revised request accepted.' };
    } else {
      // --- Agent Evaluation for initial submissions ---
      evaluationResult = await evaluateRequest(scenarioData, articleContext);
    }

    // --- Handle Evaluation Result ---
    switch (evaluationResult.status) {
      case 'CONFIRMED':
        try {
            // Prepare data for saving (use original data if confirmed, potentially revised data if confirmed after revision)
            let randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const dataToSave = {
              ...scenarioData, // Use the data that was confirmed
              platform: 'Lightcone',
              status: 'OPEN',
              conditionId: randomId,
              platformScenarioId: 'lightcone-' + randomId,
              openDate: new Date(),
              scenarioType: 'BINARY', 
              resolutionData: {
                  resolutionCriteria: scenarioData.resolutionCriteria,
                  expectedResolutionDate: scenarioData.resolutionDate ? new Date(scenarioData.resolutionDate) : null,
              }, 
              visibility: scenarioData.visibility || 'PUBLIC',
              owners: [userId],
              // url:  ??

          };

          console.log('Saving confirmed scenario data:', dataToSave);
          const savedScenario = await mongoService.saveScenario(dataToSave);

          // --- Log Successful Forecast Request --- 
          if (userId && savedScenario) {
            User.findByIdAndUpdate(userId, {
              $push: { successfulForecastRequests: { 
                  scenario: savedScenario._id,
                  scenarioQuestion: savedScenario.question, // Use question from saved scenario
                  requestedAt: new Date()
              }}
            }).catch(err => console.error('Error logging successful forecast request:', err));
          }

          // Trigger forecasting agents with the *saved* scenario data (contains _id)
          const agentsCalled = await callForecastingAgents(savedScenario);
          if (!agentsCalled) {
            console.error('Failed to trigger forecasting agents for scenario:', savedScenario._id);
            // Potentially add compensation logic or logging
          }

          // Return success status, message, AND the ID of the created scenario
          return {
              status: 'success',
              message: evaluationResult.message || 'Request confirmed and submitted for forecasting.',
              scenarioId: savedScenario._id // Include the ID
          };

        } catch (saveError) {
            console.error('Error saving confirmed scenario:', saveError);
            throw createError({ statusCode: 500, statusMessage: `Failed to save scenario: ${saveError.message}` });
        }

      case 'REVISION_NEEDED':
        // --- Log Revision Needed Attempt --- 
        if (userId && scenarioDataForLog) {
           User.findByIdAndUpdate(userId, {
             $push: { attemptedForecastRequests: {
               question: scenarioDataForLog.question,
               resolutionCriteria: scenarioDataForLog.resolutionCriteria,
               resolutionDate: scenarioDataForLog.resolutionDate,
               status: 'REVISION_NEEDED',
               reason: evaluationResult.explanation,
               attemptedAt: new Date()
             }}
           }).catch(err => console.error('Error logging revision needed attempt:', err));
        }
        return {
          status: 'revision_needed',
          revisedData: evaluationResult.revisedData,
          explanation: evaluationResult.explanation
        };

      case 'REJECTED':
        // --- Log Rejected Attempt --- 
        if (userId && scenarioDataForLog) {
           User.findByIdAndUpdate(userId, {
             $push: { attemptedForecastRequests: {
               question: scenarioDataForLog.question,
               resolutionCriteria: scenarioDataForLog.resolutionCriteria,
               resolutionDate: scenarioDataForLog.resolutionDate,
               status: 'REJECTED',
               reason: evaluationResult.message,
               attemptedAt: new Date()
             }}
           }).catch(err => console.error('Error logging rejected attempt:', err));
        }
        console.log('Request rejected by evaluator:', evaluationResult.message);
        return { status: 'rejected', message: evaluationResult.message };

      default:
        // This case indicates an unexpected status from the evaluator agent itself
        console.error('Unexpected evaluation status from agent:', evaluationResult.status);
        throw createError({ statusCode: 500, statusMessage: 'Internal server error during evaluation.' });
    }

  } catch (error) {
    // Log the detailed error
    console.error('Error processing forecast request API call:', error);

    // Determine status code and message
    const statusCode = error.statusCode || 500;
    // Use the specific message if available (from createError or agent error), otherwise generic
    const message = error.statusMessage || error.message || 'An unexpected error occurred.';

    // Ensure the status code is set correctly on the response
    if (!event.node.res.headersSent) {
        event.node.res.statusCode = statusCode;
    }

    // Log a generic failure if details weren't logged above
    if (userId && scenarioDataForLog && !error.statusCode) {
       User.findByIdAndUpdate(userId, {
         $push: { attemptedForecastRequests: {
           question: scenarioDataForLog.question,
           status: 'ERROR', // Generic error status
           reason: error.message || 'Unknown API error',
           attemptedAt: new Date()
         }}
       }).catch(err => console.error('Error logging generic failed attempt:', err));
    }

    // Return a structured error response in the body
    return { status: 'error', message: message };
  }
});
