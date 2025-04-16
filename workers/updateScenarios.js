import { scrapeScenarios } from '../server/scrapers/index.js';
import { mongoService } from '../server/services/mongo.js';
import { embeddingService } from '../server/services/embedding.js';
import { chromaService } from '../server/services/chroma.js';
import { scenariosLabeller } from '../server/agents/scenariosLabeller.js';
const MAX_ITEMS = undefined; // use for testing only!
const EXCLUDE_TAGS = [
  'Sports',
  'nba',
  'basketball',
  'mlb',
  'nhl',
  'nfl',
  'formula 1',
  'soccer',
  'epl',
  'f1',
  'baseball',
  'nfl draft',
  'gold',
  'ufc',
  'mma',
];

export async function updateScenarios() {
  console.log('Updating scenarios...');

  // 1. Scrape Predictions Markets
  const scenarios = await scrapeScenarios({
    maxItems: MAX_ITEMS,
    excludeTags: EXCLUDE_TAGS,
    startDateMin: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  });
  console.log(scenarios.length, ' scenarios scraped');

  // 2. Save/update to MongoDB
  const savedScenarios = await mongoService.saveScenarios(scenarios);
  console.log(savedScenarios.length, ' scenarios saved to MongoDB');

  // 3. Call Labeller
  const chunkSize = 50;
  const newScenarioQuestions = [];

    for (let i = 0; i < savedScenarios.length; i += chunkSize) {
      console.log(`Processing chunk ${i / chunkSize + 1} of ${Math.ceil(savedScenarios.length / chunkSize)}`);
    const chunk = savedScenarios.slice(i, i + chunkSize);
    const questions = await scenariosLabeller(chunk);
    newScenarioQuestions.push(...questions);
  }

    // 4. Update MongoDB with new questions
    console.log(newScenarioQuestions.filter(q => q.questionNew !== q.questionOld).length, ' new scenario questions generated');
    for (const q of newScenarioQuestions) {
      if(!q._id || q.questionNew === q.questionOld) continue;
      await mongoService.updateScenario({
        _id: q._id,
        questionNew: q.questionNew,
      });
    }

  // 3. Only process new scenarios
  const newScenarios = await chromaService.scenariosNotInCollection(
    savedScenarios
  );

  if (newScenarios.length == 0)
    return console.log('No new scenarios for Chroma');

  // 4. Generate embeddings
  const embeddings = await embeddingService.generate(
    newScenarios.map((s) => s.textForEmbedding),
    true
  );
  console.log(embeddings.length, ' embeddings generated.');

  // 5. Add to Chroma
  const chromedScenarios = await chromaService.addScenarios(
    newScenarios,
    embeddings
  );
  console.log(chromedScenarios.length, ' scenarios added to Chroma');

  // done.
  return console.log('Scenarios pipeline completed');
}

try {
  await updateScenarios();
  await mongoService.disconnect();
  console.log('MongoDB connection closed.');
} catch (error) {
  console.error('Error closing connections:', error);
}
