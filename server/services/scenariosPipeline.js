import { scrapePolymarketData } from '../scrapers/polymarket.js';
import { chromaService } from './chroma.js';
import { mongoService } from './mongo.js';
import { embeddingService } from './embedding.js';

const MAX_ITEMS = undefined; // limit market data to scrape for testing
const EXCLUDE_TAGS = ['Sports', 'nba', 'basketball', 'mlb', 'nhl', 'nfl', 'formula 1', 'soccer', 'epl', 'f1', 'baseball', 'nfl draft', 'gold', 'ufc', 'mma'];
const END_DATE_MIN = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

export async function scenariosPipeline() {
  
  let scenarios = [];

  // 1. Scrape Predictions Markets
  const polyMarketOptions = {
    maxItems: MAX_ITEMS,
    endDateMin: END_DATE_MIN,
    excludeTags: EXCLUDE_TAGS,
  }

  try {
    const polyMarketScenarios = await scrapePolymarketData(polyMarketOptions);
    scenarios = [...scenarios, ...polyMarketScenarios];
  } catch (error) {
    console.error('Error scraping Polymarket:', error);
  }


  // 2. Process Scenarios -> get text for embedding
  scenarios.forEach(s => {
    s.textForEmbedding = embeddingService.scenarioToMd(s);
  });


  // 3. Save to MongoDB
  let savedScenarios;
  if (scenarios.length > 0) {
    try {
      savedScenarios = await mongoService.saveScenarios(scenarios);
      console.log('Scenarios saved to MongoDB');
    } catch (error) {
      return console.error('Error saving scenarios to MongoDB:', error);
    }
  } else {
    return console.error('No scenarios retrieved');
  }
  
  // 4. filter out new scenarios
  const newScenarios = savedScenarios.filter(s => s.isNew);

  if (newScenarios.length == 0) {
    return console.log('No new scenarios to embed');
  }

  // 5. Embed Scenarios
  const embeddings = await embeddingService.generate(newScenarios.map(s => s.textForEmbedding), true);
  

  // 4. Add to Chroma
  if (scenarios.length > 0) {
    try {
      await chromaService.addScenarios(savedScenarios, embeddings, false);
      console.log('Scenarios added to Chroma');
    } catch (error) {
      console.error('Error adding scenarios to Chroma:', error);
    }
  } else {
    return console.error('No scenarios retrieved');
  }

  return console.log('Scenarios pipeline completed');
}



await scenariosPipeline();

// Explicitly close connections to allow the process to exit
try {
    await mongoService.disconnect(); // Assuming mongoService has a disconnect method
    console.log('MongoDB connection closed.');
    // If chromaService also needs closing, add it here, e.g.:
    // await chromaService.disconnect(); 
    // console.log('ChromaDB connection closed.');
} catch (error) {
    console.error('Error closing connections:', error);
} finally {
    process.exit(0); // Force exit as a fallback
}
