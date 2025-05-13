import { defineEventHandler, createError, getRouterParams } from 'h3';
import mongoose from 'mongoose'; // Import mongoose for ObjectId validation
import Scenario from '../../models/Scenario.model'; // Adjusted path for Scenario model
import { formatRelativeTime } from '../../utils/formatRelativeTime'; // Optional: if date formatting is needed
import User from '../../models/User.model'; // Add User model import

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
          '_id question questionNew scenarioType currentProbability platform platformScenarioId clobTokenIds resolutionCriteria', // Adjust fields as needed
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

    // --- Log viewed scenario to user (with count logic) ---
    if (event.context.user && scenario?._id) {
      try {
        const userId = event.context.user.id;
        const scenarioQuestion = scenario.questionNew || scenario.question; // Get question

        // Find user and check if scenario is already in viewedScenarios
        const user = await User.findById(userId);
        if (user) {
          const viewedEntryIndex = user.viewedScenarios.findIndex(entry => entry.scenario.equals(scenarioId));

          if (viewedEntryIndex > -1) {
            // Scenario exists, increment count and update lastViewedAt
            await User.updateOne(
              { _id: userId, 'viewedScenarios.scenario': scenarioId },
              {
                $inc: { 'viewedScenarios.$.viewCount': 1 },
                $set: { 'viewedScenarios.$.lastViewedAt': new Date() }
              }
            );
          } else {
            // Scenario not viewed before, push new entry
            await User.findByIdAndUpdate(userId, {
              $push: {
                viewedScenarios: {
                  scenario: scenarioId,
                  scenarioQuestion: scenarioQuestion,
                  viewCount: 1,
                  firstViewedAt: new Date(),
                  lastViewedAt: new Date()
                }
              }
            });
          }
        }
      } catch (updateError) {
        console.error('Error updating user viewedScenarios:', updateError);
        // Non-critical
      }
    }

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
        resolutionCriteria: relScenario.resolutionCriteria,
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

    let resolutionDate = scenario?.resolutionData?.resolutionCloseDate;
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
      resolutionCriteria: scenario.resolutionData?.resolutionCriteria ?? scenario.description,
      resolutionDate: resolutionDate,
      expectedResolutionDate: expectedResolutionDate,
      description: scenario.description,
      scenarioType: scenario.scenarioType,
      status: scenario?.status || 'UNKNOWN',
      resolutionValue: scenario.resolutionData?.resolutionValue,
      url: scenario.url,
      embedUrl: scenario.embedUrl,

      volume: scenario.volume,
      numberOfTraders: scenario.numberOfTraders,
      liquidity: scenario.liquidity,


      // rationale history:
      probabilityHistory: scenario.platform === 'Lightcone' ? scenario.probabilityHistory : [],
      valueHistory: scenario.platform === 'Lightcone' ? scenario.valueHistory : [],
      optionHistory: scenario.platform === 'Lightcone' ? scenario.optionHistory : [],

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
