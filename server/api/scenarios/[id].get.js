import { defineEventHandler, createError, getRouterParams } from 'h3';
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation
import Scenario from '../../models/Scenario.model'; // Adjusted path for Scenario model
import Article from '../../models/Article.model'; // Import Article model
import { formatRelativeTime } from '../../utils/formatRelativeTime'; // Optional: if date formatting is needed

export default defineEventHandler(async (event) => {
  // Make handler async

  const params = getRouterParams(event);
  const scenarioId = params.id;

  // Validate if the provided ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(scenarioId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Scenario ID format',
    });
  }

  try {
    // Fetch the scenario by ID
    const scenario = await Scenario.findById(scenarioId)
      // Populate related scenarios
      .populate({
        path: 'relatedScenarioIds',
        select:
          '_id question scenarioType currentProbability platform platformScenarioId clobTokenIds', // Adjust fields as needed
        model: Scenario, // Explicitly specify the model for self-reference
      })
      // Populate related articles
      .populate({
        path: 'relatedArticleIds',
        match: { status: 'PUBLISHED' }, // Only populate published articles
        select: '_id title slug precis publishedDate imageUrl' // Select needed fields
      })
      .lean();

    if (!scenario) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Scenario Not Found',
      });
    }

    // Optional: Check if scenario is 'OPEN' or meets other criteria for viewing
    // if (scenario.resolutionData.status !== 'OPEN' /* && !isAdmin(event.context.user) */) {
    //    throw createError({ statusCode: 403, statusMessage: 'Scenario not accessible' });
    // }

    // Format related scenarios from populated data
    const relatedScenarios = (scenario.relatedScenarioIds || []).map(
      (relScenario) => ({
        scenarioId: relScenario._id.toString(),
        name: relScenario.questionNew || relScenario.question,
        chance:
          relScenario.scenarioType === 'BINARY'
            ? relScenario.currentProbability
            : null,
        platform: relScenario.platform,
        platformScenarioId: relScenario.platformScenarioId,
        // TODO: Handle other scenario types if needed
      })
    );

    // Format related articles from populated data
    const relatedArticles = (scenario.relatedArticleIds || []).map(article => ({
      _id: article._id.toString(),
      slug: article.slug,
      title: article.title,
      precis: article.precis,
      publishedDate: article.publishedDate,
      imageUrl: article.imageUrl
    }));

    // Map Scenario model fields to the expected API response structure

    let resolutionDate = scenario?.resolutionData?.resolutionDate;
    let expectedResolutionDate =
      scenario?.resolutionData?.expectedResolutionDate;
    let closeDate = resolutionDate || expectedResolutionDate;
    try {
      if (closeDate) closeDate = formatRelativeTime(new Date(closeDate));
    } catch (error) {
      console.error('Error formatting close date:', error);
    }

    const response = {
      id: scenario._id.toString(),
      name: scenario.questionNew || scenario.question, 
      platform: scenario.platform, // Add platform if needed
      platformScenarioId: scenario.platformScenarioId,
      closeDate: closeDate,
      resolutionDate: resolutionDate,
      expectedResolutionDate: expectedResolutionDate,
      description: scenario.description,
      resolutionCriteria: scenario.resolutionCriteria,
      scenarioType: scenario.scenarioType,
      status: scenario?.status || 'UNKNOWN',
      resolutionValue: scenario.resolutionData?.resolutionValue,
      url: scenario.url,
      embedUrl: scenario.embedUrl,

      volume: scenario.volume,
      numberOfTraders: scenario.numberOfTraders,
      liquidity: scenario.liquidity,
      rationaleSummary: scenario.rationaleSummary,
      rationaleDetails: scenario.rationaleDetails,
      dossier: scenario.dossier,

      scenarios: relatedScenarios,
      relatedArticles: relatedArticles,
    };

    return response;
  } catch (error) {
    console.error(`Error fetching scenario ${scenarioId}:`, error);
    if (error.statusCode) throw error; // Re-throw H3 errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error fetching scenario',
    });
  }
});
