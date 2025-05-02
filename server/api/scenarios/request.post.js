import { defineEventHandler, readBody } from 'h3';

// Dummy function simulating an AI agent evaluating the request
async function questionEvalAgent(formData) {
  console.log('Evaluating formData:', formData);
  // Basic validation (example)
  if (!formData.question || !formData.resolutionCriteria || !formData.resolutionDate) {
    return { status: 'rejected', message: 'Missing required fields: Question, Resolution Criteria, or Resolution Date.' };
  }

  // Simulate different outcomes randomly for now
    let rand = Math.random();
    rand = 0.1
  if (rand < 0.5) { // 50% chance of confirmation
    console.log('Agent decision: Confirmed');
    return { status: 'confirmed', data: formData };
  } else if (rand < 0.8) { // 30% chance of needing revision
    console.log('Agent decision: Revision Needed');
    const revisedData = {
      ...formData,
      question: formData.question + " (revised for clarity)",
      resolutionCriteria: formData.resolutionCriteria + "\n(Clarification: Source must be one of [List sources])",
    };
    return {
      status: 'revision_needed',
      revisedData: revisedData,
      explanation: 'The question or resolution criteria could be more specific. Please review the suggested changes.'
    };
  } else { // 20% chance of rejection
    console.log('Agent decision: Rejected');
    return { status: 'rejected', message: 'The question is too ambiguous or unforecastable in its current form.' };
  }
}

// Dummy function simulating triggering forecasting bots
async function callForecastingAgents(scenarioData) {
  console.log('Triggering forecasting agents for:', scenarioData.question);
  // In a real scenario, this would interact with background workers or other services
  return true; // Simulate success
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const isRevisionConfirmation = body?.isRevisionConfirmation === true;
    const articleId = body?.articleId; // Extract potential articleId
    let scenarioData = { ...body };

    // Remove helper flags from the data to be processed/saved
    if (isRevisionConfirmation) {
      delete scenarioData.isRevisionConfirmation;
    }
    // Don't delete articleId, we want to potentially use it
    // if (articleId) {
    //   delete scenarioData.articleId; // Keep it in scenarioData
    // }

    console.log('Received forecast request:', {
      isRevision: isRevisionConfirmation,
      hasArticleId: !!articleId,
      articleId: articleId, // Log the ID if present
      data: scenarioData
    });

    // --- Input Validation (Basic) ---
    if (!scenarioData || typeof scenarioData !== 'object') {
      throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' });
    }
    // Add more specific validation as needed based on Scenario model
    if (!scenarioData.question || !scenarioData.resolutionCriteria || !scenarioData.resolutionDate) {
       // Still validate essential fields even on confirmation
        throw createError({ statusCode: 400, statusMessage: 'Confirmed data is missing required fields.' });
    }

    let evaluationResult;

    if (isRevisionConfirmation) {
      // If user confirmed revision, bypass agent evaluation and treat as confirmed
      console.log('Received confirmed revision. Proceeding directly.');
      evaluationResult = { status: 'confirmed', data: scenarioData };
    } else {
      // --- Agent Evaluation for initial submissions ---
      evaluationResult = await questionEvalAgent(scenarioData);
    }

    // --- Handle Evaluation Result ---
    switch (evaluationResult.status) {
      case 'confirmed':
        // Include articleId when logging the data to be saved
        console.log('Saving scenario data (mock):', evaluationResult.data ); // data already includes articleId if provided

        // Trigger forecasting agents (dummy call)
        // Pass the full data including articleId
        const agentsCalled = await callForecastingAgents(evaluationResult.data);
        if (!agentsCalled) {
          // Handle failure to trigger agents if necessary
          console.error('Failed to trigger forecasting agents.');
          // Potentially return an error or a specific status
        }

        return { status: 'success', message: 'Request confirmed and submitted for forecasting.' };

      case 'revision_needed':
        return {
          status: 'revision_needed',
          revisedData: evaluationResult.revisedData,
          explanation: evaluationResult.explanation
        };

      case 'rejected':
        // Return 200 OK but indicate rejection in the body
        console.log('Returning 200 OK with rejected status in body');
        return { status: 'rejected', message: evaluationResult.message };

      default:
        // This case indicates an actual server-side issue
        console.error('Unexpected evaluation status:', evaluationResult.status);
        // Use createError to send a 500 status
        throw createError({ statusCode: 500, statusMessage: 'Internal server error during evaluation.' });
    }

  } catch (error) {
    // This catch block now handles validation errors from createError or truly unexpected server errors
    console.error('Error processing forecast request:', error);
    const statusCode = error.statusCode || 500;
    const message = error.statusMessage || 'An unexpected error occurred.';
    // Ensure the status code is set for actual errors
    if (!event.node.res.headersSent) {
        event.node.res.statusCode = statusCode;
    }
    return { status: 'error', message: message }; // Return error status in body
  }
});
