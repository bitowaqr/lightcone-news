import { defineEventHandler, createError, getRouterParams } from 'h3';
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation
import Article from '../../models/Article.model'; // Adjusted path for Article model
import Scenario from '../../models/Scenario.model'; // Adjusted path for Scenario model
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { formatTimeline } from '../../utils/timelineDateFormatter';
export default defineEventHandler(async (event) => { // Make handler async
  // Authentication check
  
  const params = getRouterParams(event);
  const articleId = params.id;

  // Validate if the provided ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(articleId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Article ID format' });
  }

  try {
    // Fetch the article by ID and populate related scenarios
    const article = await Article.findById(articleId)
      // Populate related scenarios, selecting only necessary fields
      .populate({
        path: 'relatedScenarioIds',
        select: '_id question scenarioType currentProbability', // Adjust fields as needed
        model: Scenario // Explicitly specify the model
      })
      .lean(); // Use lean for performance

    if (!article) {
      throw createError({ statusCode: 404, statusMessage: 'Article Not Found' });
    }

    // Check if the article is published (or allow admins/authors to see drafts?)
    // For now, strictly requires PUBLISHED status for general users
    if (article.status !== 'PUBLISHED' /* && !isAdmin(event.context.user) */) {
       throw createError({ statusCode: 403, statusMessage: 'Article not published' });
    }

    // Format related scenarios from the populated data
    const relatedScenarios = (article.relatedScenarioIds || []).map(scenario => ({
      scenarioId: scenario._id.toString(),
      name: scenario.question, // Use 'question' from Scenario model
      // Determine chance based on scenario type
      chance: scenario.scenarioType === 'BINARY' ? scenario.currentProbability : null,
      // TODO: Handle other scenario types if needed
    }));

    // Format the response according to the spec/frontend expectations
    const response = {
      id: article._id.toString(),
      header: {
        title: article.title,
        author: article.author,
        publishedDate: article.publishedDate ? formatRelativeTime(article.publishedDate) : 'N/A',
        // category: article.category // Category/tags are in the main object in the model
        tags: article.tags || [],
      },
      precis: article.precis,
      summary: article.summary, // Add summary if available in model
      // Format sources according to expected structure
      sources: (article.sources || []).map(s => ({
          url: s.url,
          name: s.publisher, // Assuming 'publisher' maps to 'name'
          // publishedDate: s.publishedDate, // Add if needed
      })),
      prompts: {
        suggested: article.suggestedPrompts || []
      },
      // Format timeline events
      timeline: formatTimeline(article.timeline),
      scenarios: relatedScenarios,
      // fullContent: article.fullContent // Add fullContent if it exists in your model
      // imageUrl: article.imageUrl, // Add imageUrl if needed
    };

    return response;
  } catch (error) {
    // Handle potential population errors or other DB issues
    console.error(`Error fetching article ${articleId}:`, error);
    // Re-throw specific errors or return a generic 500
    if (error.statusCode) throw error; // Re-throw H3 errors
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching article' });
  }
}); 