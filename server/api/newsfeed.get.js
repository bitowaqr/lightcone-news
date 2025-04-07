import { defineEventHandler, createError } from 'h3';
import Article from '../models/Article.model'; // Import Article model
import Scenario from '../models/Scenario.model'; // Import Scenario model
import { formatRelativeTime } from '../utils/formatRelativeTime';

// Determine how many articles/scenarios to fetch for the feed
const ARTICLES_LIMIT = 10;
const SCENARIOS_LIMIT = 5;
const RELATED_SCENARIOS_LIMIT_PER_ARTICLE = 3;

export default defineEventHandler(async (event) => { // Make handler async
  
  try {
    // Fetch published articles, sorted by published date (newest first)
    const articles = await Article.find({ status: 'PUBLISHED' })
      .sort({ publishedDate: -1 })
      .limit(ARTICLES_LIMIT)
      .lean(); // Use .lean() for performance if not modifying docs

    // Fetch recent open scenarios (adjust criteria as needed)
    // Potential alternative: Fetch scenarios explicitly linked to the articles above
    const scenarios = await Scenario.find({})
      .sort({ 'resolutionData.expectedResolutionDate': -1 })
       .limit(SCENARIOS_LIMIT)
       .lean();

    // Prepare Teaser Groups using fetched articles
    const teaserGroupsPromises = articles.map(async (article) => {
      // Fetch related scenarios specifically for this article
      const relatedScenarios = await Scenario.find({
          _id: { $in: article.relatedScenarioIds || [] }
        })
        .limit(RELATED_SCENARIOS_LIMIT_PER_ARTICLE)
        .lean();

      const formattedScenarios = relatedScenarios.map(scenario => ({
        scenarioId: scenario._id.toString(),
        name: scenario.question, // Use 'question' from Scenario model
        // Use 'currentProbability' or calculate based on type
        chance: scenario.scenarioType === 'BINARY' ? scenario.currentProbability : null,
        // TODO: Add logic for CATEGORICAL/NUMERIC types if needed
      }));

      return {
        // Use article._id for groupId or generate a unique one if needed
        groupId: `article-${article._id.toString()}`,
        story: {
          articleId: article._id.toString(),
          title: article.title,
          precis: article.precis, // Assuming precis is the desired field
          // Use publishedDate directly or format it
          publishedDate: article.publishedDate ? formatRelativeTime(article.publishedDate) : 'N/A',
          sources: article.sources.map(s => ({ name: s.publisher, url: s.url })), // Adapt source format if needed
        },
        scenarios: formattedScenarios,
        // Placeholder - adapt if needed
        additionalInfo: `Related Scenarios: ${article.relatedScenarioIds?.length || 0}`,
        nScenarios: article.relatedScenarioIds?.length || 0
      };
    });

    const teaserGroups = await Promise.all(teaserGroupsPromises);

    // Prepare Scenarios Feed using fetched scenarios
    const scenariosFeed = scenarios.map(scenario => ({
      scenarioId: scenario._id.toString(),
      name: scenario.question, // Use 'question' from Scenario model
      // Use 'currentProbability' or adapt based on type
      chance: scenario.scenarioType === 'BINARY' ? scenario.currentProbability : null,
      // TODO: Add logic for CATEGORICAL/NUMERIC types if needed
      // Add other relevant fields like closeDate if needed
      // closeDate: scenario.closeDate ? formatRelativeTime(scenario.closeDate) : 'N/A',
    }));

    return {
      teaserGroups,
      scenariosFeed
    };

  } catch (error) {
    console.error('Error fetching newsfeed data:', error);
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching newsfeed' });
  }
}); 