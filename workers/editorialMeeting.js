import { scrapeFeeds } from '../server/scrapers/index.js';
import { sourceScreenerBatch } from '../server/agents/sourceScreener.js';
import { callLineupCreator } from '../server/agents/lineupCreator.js';
import { mongoService } from '../server/services/mongo.js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();


export const createLineup = async () => {
  
  console.log('Starting lineup creation...');
  await mongoService.connect();

  // 1. Scrape News Feeds 
  console.log('Scraping news feeds...');
  const allNewsItems = await scrapeFeeds([], true);
  console.log(`Feed items fetched: ${allNewsItems.length}`);

  // 1.5 Screen Sources for Relevance
  console.log('Screening sources for relevance...');
  const screenedNewsItems = await sourceScreenerBatch(allNewsItems);
  console.log(`Sources remaining after screening: ${screenedNewsItems.length}`);

  // 2. Call lineupCreator with Screened Items
  console.log('Calling lineupCreator...');
  const lineup = await callLineupCreator(screenedNewsItems);
  console.log('Lineup created with', lineup.stories.length, 'stories');

  
  // 3. Save Lineup to MongoDB
  const lineupId = new Date().toISOString().split('T')[0];
  lineup.stories.forEach(story => {
    story.lineupId = lineupId;
  });
  console.log('Saving lineup with Id: ', lineupId , " to mongo");
  await mongoService.saveStoryIdeas(lineup.stories);
  console.log('Lineup saved to MongoDB');

  return lineup.stories;
};

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
