import { defineSitemapEventHandler } from '#imports';
import Article from '../../models/Article.model'; // Adjust path as necessary
import Scenario from '../../models/Scenario.model'; // Import Scenario model

export default defineSitemapEventHandler(async () => {
  try {
    // Fetch Articles
    const articles = await Article.find({ status: 'PUBLISHED' })
      .select('slug publishedDate updatedAt')
      .lean();

    const articleUrls = articles.map(article => {
      const lastmod = article.updatedAt || article.publishedDate;
      return {
        loc: `/articles/${article.slug}`,
        lastmod: lastmod ? lastmod.toISOString() : new Date().toISOString(),
      };
    });

    // Fetch Scenarios
    const scenarios = await Scenario.find({
      platform: 'Lightcone', // Assuming this is the correct value from your model/data
      status: { $in: ['OPEN', 'RESOLVED', 'UPCOMING'] }, // Include relevant statuses
      visibility: 'PUBLIC' // Ensure only public scenarios are included
    })
      .select('_id updatedAt createdAt') // Select _id for URL and timestamps for lastmod
      .lean();

    const scenarioUrls = scenarios.map(scenario => {
      const lastmod = scenario.updatedAt || scenario.createdAt;
      return {
        loc: `/scenarios/${scenario._id}`,
        lastmod: lastmod ? lastmod.toISOString() : new Date().toISOString(),
      };
    });

    // Combine and return all URLs
    return [...articleUrls, ...scenarioUrls];

  } catch (error) {
    console.error('Error generating sitemap URLs:', error);
    return [];
  }
}); 