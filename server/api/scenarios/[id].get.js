import { defineEventHandler, createError, getRouterParams } from 'h3';
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation
import Scenario from '../../models/Scenario.model'; // Adjusted path for Scenario model
// Import Article model if needed for populating related articles
// import Article from '../../models/Article.model';
import { formatRelativeTime } from '../../utils/formatRelativeTime'; // Optional: if date formatting is needed

export default defineEventHandler(async (event) => { // Make handler async

  const params = getRouterParams(event);
  const scenarioId = params.id;

  // Validate if the provided ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Scenario ID format' });
  }

  try {
    // Fetch the scenario by ID
    const scenario = await Scenario.findById(scenarioId)
      // Populate related scenarios
      .populate({
        path: 'relatedScenarioIds',
        select: '_id question scenarioType currentProbability', // Adjust fields as needed
        model: Scenario // Explicitly specify the model for self-reference
      })
      // Optionally populate related articles
      // .populate({
      //   path: 'relatedArticleIds',
      //   select: '_id title status publishedDate', // Select relevant article fields
      //   model: Article,
      //   match: { status: 'PUBLISHED' } // Only populate published articles
      // })
      .lean();

    if (!scenario) {
      throw createError({ statusCode: 404, statusMessage: 'Scenario Not Found' });
    }

    // Optional: Check if scenario is 'OPEN' or meets other criteria for viewing
    // if (scenario.resolutionData.status !== 'OPEN' /* && !isAdmin(event.context.user) */) {
    //    throw createError({ statusCode: 403, statusMessage: 'Scenario not accessible' });
    // }

    // Format related scenarios from populated data
    const relatedScenarios = (scenario.relatedScenarioIds || []).map(relScenario => ({
      scenarioId: relScenario._id.toString(),
      name: relScenario.question,
      chance: relScenario.scenarioType === 'BINARY' ? relScenario.currentProbability : null,
      // TODO: Handle other scenario types if needed
    }));

    // Optionally format populated related articles
    // const relatedArticles = (scenario.relatedArticleIds || []).map(article => ({
    //   articleId: article._id.toString(),
    //   title: article.title,
    //   publishedDate: article.publishedDate ? formatRelativeTime(article.publishedDate) : 'N/A',
    // }));

    // Map Scenario model fields to the expected API response structure
    const response = {
      id: scenario._id.toString(),
      header: {
        name: scenario.question, // Use 'question' for the main name/title
        platform: scenario.platform, // Add platform if needed
        // Add other relevant header fields like closeDate, maybe formatted
        closeDate: scenario.closeDate ? formatRelativeTime(scenario.closeDate) : 'TBD',
        // lastUpdate: scenario.lastUpdatedFromSource ? formatRelativeTime(scenario.lastUpdatedFromSource) : 'N/A'
      },
      description: scenario.description,
      resolutionCriteria: scenario.resolutionCriteria,
      scenarioType: scenario.scenarioType,
      status: scenario.resolutionData?.status || 'UNKNOWN',
      resolutionDate: scenario.resolutionData?.resolutionDate,
      resolutionValue: scenario.resolutionData?.resolutionValue,
      url: scenario.url,
      embedUrl: scenario.embedUrl,

      // Current Data (adapt based on type)
      currentProbability: scenario.scenarioType === 'BINARY' ? scenario.currentProbability : undefined,
      currentValue: scenario.scenarioType === 'NUMERIC' || scenario.scenarioType === 'DATE' ? scenario.currentValue : undefined,
      options: scenario.scenarioType === 'CATEGORICAL' ? scenario.options : undefined,

      // Context / Related items
      // TODO: Decide how to present scenarioData, sources, prompts if they exist in the model
      // sources: scenario.sources, // Adapt format if needed
      // suggestedPrompts: scenario.suggestedPrompts || [] ,
      // timeline: scenario.timeline, // Adapt format if needed
      detailedData: {
          // Map relevant fields from model to detailedData if needed
          // e.g., volume, numberOfTraders, history etc.
          volume: scenario.volume,
          numberOfTraders: scenario.numberOfTraders,
          // History might be too large for a detail view, consider separate endpoint
          // probabilityHistory: scenario.probabilityHistory,
      },
      scenarios: relatedScenarios, // Related scenarios
      // articles: relatedArticles, // Add related articles if populated
    };

    return response;

  } catch (error) {
    console.error(`Error fetching scenario ${scenarioId}:`, error);
    if (error.statusCode) throw error; // Re-throw H3 errors
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching scenario' });
  }
}); 