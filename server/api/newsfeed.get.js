import { defineEventHandler, createError, getQuery } from 'h3';
import Article from '../models/Article.model'; // Import Article model
import Scenario from '../models/Scenario.model'; // Import Scenario model
import { formatRelativeTime } from '../utils/formatRelativeTime';

const ARTICLES_LIMIT = 10;
const SCENARIOS_LIMIT = 5;
const FEATURED_SCENARIOS_CACHE_DURATION_MS = 60 * 30 * 1000; // 30 minutes
const newsfeedCache = new Map();

export default defineEventHandler(async (event) => { // Make handler async
  
  // Get page number from query params, default to 1
  const page = parseInt(getQuery(event).page) || 1;
  const skip = (page - 1) * ARTICLES_LIMIT;
  
  // Check cache for featuredScenarios first
  const cachedFeaturedScenariosItem = newsfeedCache.get('featuredScenariosList');
  let featuredScenarios;

  if (cachedFeaturedScenariosItem && (Date.now() - cachedFeaturedScenariosItem.timestamp < FEATURED_SCENARIOS_CACHE_DURATION_MS)) {
    featuredScenarios = cachedFeaturedScenariosItem.data;
  } else {
    // If not in cache or expired, generate and cache them (this will be done after fetching allScenarios)
    featuredScenarios = null; // Mark as null, will be populated later
  }

  try {
    // Fetch published articles, sorted by published date (newest first)
    const articles = await Article.find({ status: 'PUBLISHED' })
      .sort({ publishedDate: -1 })
      .skip(skip)
      .limit(ARTICLES_LIMIT)
      .lean(); 
    
    // Get total count for pagination
    const totalArticles = await Article.countDocuments({ status: 'PUBLISHED' });
    
    articles.sort((a, b) => {
      const aDate = new Date(a.publishedDate);
      const bDate = new Date(b.publishedDate);
      
      // Calculate time difference in milliseconds
      const timeDiff = Math.abs(aDate - bDate);
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      // If articles are published within 24 hours of each other
      if (hoursDiff <= 24) {
        // Sort by priority (lower priority value comes first)
        return (a.priority || 0) - (b.priority || 0);
      } else {
        // Sort by publishedDate (newer first)
        return bDate - aDate;
      }
    });

    // console.log('articles', articles.map(a => a.title.slice(0, 45) + '... ' + a.publishedDate.toISOString().slice(0, 10)));

    // Fetch recent open scenarios (adjust criteria as needed)
    // Potential alternative: Fetch scenarios explicitly linked to the articles above
    const scenarios = await Scenario.find({})
      .sort({ 'resolutionData.expectedResolutionDate': -1 })
       .limit(SCENARIOS_LIMIT)
       .lean();

    // Prepare Teaser Groups using fetched articles
    const teaserGroupsPromises = articles.map(async (article) => {
      // Fetch ALL related scenarios specifically for this article
      const relatedScenarios = await Scenario.find({
          _id: { $in: article.relatedScenarioIds || [] }
        })
        .lean();

      const formattedScenarios = relatedScenarios.map(scenario => ({
        scenarioId: scenario._id.toString(),
        name: scenario.questionNew || scenario.question, // Use 'question' from Scenario model
        // Use 'currentProbability' or calculate based on type
        chance: scenario.scenarioType === 'BINARY' ? scenario.currentProbability : null,
        platform: scenario.platform,
        platformScenarioId: scenario.platformScenarioId,
        // TODO: Add logic for CATEGORICAL/NUMERIC types if needed
      }));

      return {
        // Use article._id for groupId or generate a unique one if needed
        groupId: `article-${article._id.toString()}`,
        story: {
          articleId: article._id.toString(),
          slug: article.slug,
          title: article.title,
          precis: article.precis, // Assuming precis is the desired field
          // Use publishedDate directly or format it
          publishedDate: article.publishedDate ? formatRelativeTime(article.publishedDate) : 'N/A',
          sources: article.sources.map(s => ({ name: s.publisher, url: s.url })), // Adapt source format if needed
        },
        scenarios: formattedScenarios,
        // Placeholder - adapt if needed
        additionalInfo: `Related Scenarios: ${article.relatedScenarioIds?.length || 0}`,
        nScenarios: article.relatedScenarioIds?.length || 0,
        imageUrl: article.imageUrl
      };
    });

    const teaserGroups = await Promise.all(teaserGroupsPromises);
    // unique scenarios
    const allScenarios = [...new Set(teaserGroups.flatMap(group => group.scenarios).filter(s => s && s.scenarioId && s.chance > 0.05 && s.chance < 0.95))]; // Ensure scenarios are valid
    
    if (!featuredScenarios && allScenarios.length > 0) { // If not loaded from cache, generate and cache now
      // TODO: GENERATE BETTER FEATURED SCENARIOS
      const randomlySortedScenarios = [...allScenarios].sort(() => Math.random() - 0.5);
      featuredScenarios = randomlySortedScenarios.slice(0, 7);
      newsfeedCache.set('featuredScenariosList', { data: featuredScenarios, timestamp: Date.now() });
    }

    // Prepare Scenarios Feed using fetched scenarios
    const scenariosFeed = scenarios.map(scenario => ({
      scenarioId: scenario._id.toString(),
      name: scenario.question, // Use 'question' from Scenario model
      // Use 'currentProbability' or adapt based on type
      chance: scenario.scenarioType === 'BINARY' ? scenario.currentProbability : null,
      platform: scenario.platform,
      platformScenarioId: scenario.platformScenarioId,
      // TODO: Add logic for CATEGORICAL/NUMERIC types if needed
      // Add other relevant fields like closeDate if needed
      // closeDate: scenario.closeDate ? formatRelativeTime(scenario.closeDate) : 'N/A',
    }));

    return {
      teaserGroups,
      scenariosFeed,
      featuredScenarios,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalArticles / ARTICLES_LIMIT),
        totalArticles,
        hasMore: skip + articles.length < totalArticles
      }
    };

  } catch (error) {
    console.error('Error fetching newsfeed data:', error);
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching newsfeed' });
  }
}); 