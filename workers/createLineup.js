import { scrapeFeeds } from '../server/scrapers/index.js';
import { curateSourcesPerPublisher } from '../server/agents/publisherCurator.js';
import { callLineupCreator } from '../server/agents/lineupCreator.js';
import { mongoService } from '../server/services/mongo.js';
import Article from '../server/models/Article.model.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();


export const createLineup = async (saveToMongo = true, maxStories = 10) => {
  
  console.log('Starting lineup creation...');
  await mongoService.connect();

  // 1. Scrape News Feeds 
  console.log('Scraping news feeds...');
  const allNewsItems = await scrapeFeeds([], true);
  console.log(`Feed items fetched: ${allNewsItems.length}`);

  // 1.5 Curate Sources Per Publisher
  console.log('Curating sources per publisher...');
  // The second argument is optional (maxItemsPerPublisher), defaults to 20 in the agent
  const curatedNewsItems = await curateSourcesPerPublisher(allNewsItems); 
  console.log(`Sources remaining after curation: ${curatedNewsItems.length}`);

  // 2. Fetch Existing Published Articles for Context
  console.log('Fetching existing published articles for context...');
  const existingArticles = await Article.find({ status: { $in: ['PUBLISHED', 'PENDING'] } })
    .sort({ publishedDate: -1 })
    .limit(50)
    .lean();
  console.log(`Fetched ${existingArticles.length} existing published articles.`);
  // fetch the last 50 ARCHIVED articles, but only title and precis
  const archivedArticles = await Article.find({ status: 'ARCHIVED' })
    .sort({ publishedDate: -1 })
    .limit(50)
    .select('title precis updatedAt status')
    .lean();
  console.log(`Fetched ${archivedArticles.length} archived articles.`);

  // 3. Call lineupCreator with Screened Items and Existing Articles
  console.log('Calling lineupCreator with new items and existing context...');
  let lineup;
  try {
    lineup = await callLineupCreator(curatedNewsItems, existingArticles, archivedArticles);
  } catch (error) {
    console.error('Error calling lineupCreator:', error);
    console.log('Retrying lineupCreator...');
    lineup = await callLineupCreator(curatedNewsItems, existingArticles, archivedArticles, maxStories);
  }
  if(!lineup) throw new Error('No lineup created');
  console.log('Lineup created with', lineup.stories?.length || 0, 'stories');

  
  // 4. Save Lineup to MongoDB
  if (!lineup.stories || lineup.stories.length === 0) {
    console.log('No stories in the generated lineup. Skipping save.');
    return [];
  }
  const lineupId = new Date().toISOString().split('T')[0];
  lineup.stories.forEach(story => {
    story.lineupId = lineupId;
  });
  console.log('Saving lineup with Id: ', lineupId , " to mongo");
  if(saveToMongo) await mongoService.saveStoryIdeas(lineup.stories);
  console.log('Lineup saved to MongoDB');

  return lineup.stories;
};


// const test = await createLineup(false);
// fs.writeFileSync('lineup.json', JSON.stringify(test, null, 2));
// Example usage (for testing):
// const runTest = async () => {
//   try {
//     const lineupData = await createLineup();
//     console.log('\n--- Generated Lineup ---');
//       // Ensure lineupData is not null/undefined before stringifying
//       if (lineupData) {
//           fs.writeFileSync('lineup.json', JSON.stringify(lineupData, null, 2));
//           console.log('Lineup data saved to lineup.json');
//       } else {
//           console.log('No lineup data was generated.');
//       }
//     console.log('------------------------');
//   } catch (error) {
//     console.error('Test run failed:', error);
//   } finally {
//     await mongoService.disconnect();
//   }
// };

// runTest(); // Uncomment to run the test when executing this file directly
