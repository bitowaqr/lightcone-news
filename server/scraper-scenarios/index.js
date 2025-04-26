import { scrapePolymarketData } from './polymarket.js';
import { scrapeMetaculusData } from './metaculus.js';
import { scrapeManifoldData } from './manifold.js';
import dotenv from 'dotenv';
import Scenario from '../models/Scenario.model.js';
import { chromaService } from '../services/chroma.js';
import { embeddingService } from '../services/embedding.js';
import { scenariosLabeller } from '../agents/scenariosLabeller.js';
import { mongoService } from '../services/mongo.js';

dotenv.config();

// --- Constants ---
const EXCLUDE_TAGS_POLYMARKET = [
  'Sports', 'nba', 'basketball', 'mlb', 'nhl', 'nfl', 'formula 1',
  'soccer', 'epl', 'f1', 'baseball', 'nfl draft', 'gold', 'ufc', 'mma',
];
const GEMINI_BATCH_SIZE = 20;

// --- Helper Function ---
const scrapedScenarioToMd = (scenario) => {
  let text = [];
  if (scenario?.question) {
    text.push(`## Question
${scenario.question}`);
  }
  if (scenario?.description) {
    text.push(`## Description
${scenario.description}`);
  }
  if (scenario?.tags && scenario.tags.length > 0) {
    text.push(`## Tags\n${scenario.tags.join(', ')}`);
  }
  // Access resolution criteria from the nested object
  if (scenario?.resolutionData?.resolutionCriteria) {
    text.push(`## Resolution Criteria\n${scenario.resolutionData.resolutionCriteria}`);
  }
  // These fields might not exist directly on all scenario objects after formatting
  if (scenario?.rationaleSummary) {
    text.push(`## Rationale Summary\n${scenario.rationaleSummary}`);
  }
  if (scenario?.rationaleDetails) {
    text.push(`## Rationale Details\n${scenario.rationaleDetails}`);
  }
  // Include platform and probability/options for context
  text.push(`## Platform\n${scenario.platform}`);
  if (scenario.scenarioType === 'BINARY' && scenario.currentProbability !== null) {
    text.push(`## Current Probability\n${(scenario.currentProbability * 100).toFixed(1)}%`);
  } else if (scenario.scenarioType === 'CATEGORICAL' && scenario.options) {
    const optionsText = scenario.options.map(opt => `- ${opt.name}: ${(opt.probability * 100).toFixed(1)}%`).join('\n');
    text.push(`## Options\n${optionsText}`);
  }

  return text.join('\n\n').trim();
};

// --- Core Scenario Scraping Function ---
const scrapeScenarios = async () => {
  console.log("[ScrapeScenarios] Starting scenario scraping...");

  // --- Configuration Objects ---
  const polyMarketOpts = {
    maxItems: 10_000, // Increased limit, adjust as needed
    excludeTags: EXCLUDE_TAGS_POLYMARKET,
    // Consider adding filters like volume_num_min: 1 if desired
    active: true, // Focus on active markets
    // end_date_min: new Date().toISOString(), // Markets ending in the future
    sort: 'volume_num',
    order: 'desc', // Use 'desc' for descending order
  };

  const metaculusOpts = {
    maxItems: 10_000, // Increased limit
    statuses: ['open'], // Focus on open questions
    order_by: '-published_at',
    forecast_type: 'binary', // Stick to binary for now
    // Consider date filters like open_time__gt or scheduled_resolve_time__lt
    // e.g., open_time__gt: '2024-01-01', // Questions opened this year
    // e.g., scheduled_resolve_time__lt: '2035-01-01' // Resolving before 2035
  };

  const manifoldOpts = {
      maxItems: 10_000, // Increased limit
      filter: 'open', // Equivalent to Metaculus 'open' status
      sort: 'liquidity', // Sort by liquidity or 'close-date' or 'creation-date' etc.
      contractType: 'BINARY', // Stick to binary for now
      // minLiquidity: 100, // Optional: Filter by minimum liquidity
  };


  // --- Scraping Promises ---
  const promises = [];

  promises.push(
    scrapeMetaculusData(metaculusOpts, false) // false = don't return invalid/null probability ones? Check function def
      .catch(error => {
        console.error(`[ScrapeScenarios] Error scraping Metaculus:`, error.message);
        return []; // Return empty array on error
      })
  );

  promises.push(
    scrapePolymarketData(polyMarketOpts)
      .catch(error => {
        console.error(`[ScrapeScenarios] Error scraping Polymarket:`, error.message);
        return []; // Return empty array on error
      })
  );

   promises.push(
     scrapeManifoldData(manifoldOpts)
       .catch(error => {
         console.error(`[ScrapeScenarios] Error scraping Manifold:`, error.message);
         return []; // Return empty array on error
       })
   );

  // --- Await and Combine Results ---
  const results = await Promise.all(promises);
  let allScenarios = results.flat(); // Combine results from all platforms

  console.log(`[ScrapeScenarios] Raw scenarios scraped: Metaculus (${results[0]?.length || 0}), Polymarket (${results[1]?.length || 0}), Manifold (${results[2]?.length || 0})`);

  // Filter out any potential null/undefined entries from errors
  allScenarios = allScenarios.filter(s => s != null);

  // Add textForEmbedding to each valid scenario
  allScenarios.forEach(s => {
    s.textForEmbedding = scrapedScenarioToMd(s);
  });

  console.log(`[ScrapeScenarios] Total valid scenarios processed: ${allScenarios.length}`);
  return allScenarios;
};

// --- Scenario Processing and Embedding Function ---
const updateAndEmbedScenarios = async () => {
  console.log("[ScenarioUpdater] Starting scenario update process...");

  // 1. Scrape Predictions Markets
  const scenarios = await scrapeScenarios(); // Uses the function above
  console.log(`[ScenarioUpdater] Scraped ${scenarios.length} scenarios from platforms.`);

  // 2. Save/Update in MongoDB and Identify Labeling Needs
  console.log(`[ScenarioUpdater] Saving/updating ${scenarios.length} scenarios in MongoDB...`);
  const savedScenarios = [];
  const scenariosToLabel = [];
  // Process sequentially to avoid overwhelming DB? Or use Promise.all with batching?
    // Let's stick to sequential for now for simplicity.
    await mongoService.connect();
  for (const scenario of scenarios) {
    try {
      const savedScenario = await Scenario.findOneAndUpdate(
        { platformScenarioId: scenario.platformScenarioId },
        scenario,
        { new: true, upsert: true }
      );
      if (savedScenario) {
        if (!savedScenario.questionNew) {
          scenariosToLabel.push(savedScenario);
        }
        savedScenarios.push(savedScenario);
      }
    } catch (error) {
      console.error(`[ScenarioUpdater] Error saving scenario ${scenario.platformScenarioId}:`, error.message);
    }
  }
  console.log(`[ScenarioUpdater] ${savedScenarios.length} scenarios saved/updated.`);

  // 3. Generate 'questionNew' labels if missing
  if (scenariosToLabel.length > 0) {
    console.log(`[ScenarioUpdater] Labelling ${scenariosToLabel.length} scenarios requiring 'questionNew'...`);
    const scenarioToLabelBatches = [];
    for (let i = 0; i < scenariosToLabel.length; i += GEMINI_BATCH_SIZE) {
        scenarioToLabelBatches.push(scenariosToLabel.slice(i, i + GEMINI_BATCH_SIZE));
    }

    try {
      const labellingPromises = scenarioToLabelBatches.map(batch => scenariosLabeller(batch));
      const questionsResults = await Promise.all(labellingPromises);
      const newlyLabelledScenarios = questionsResults.flat();

      const updatePromises = newlyLabelledScenarios.map(q =>
        Scenario.updateOne({ _id: q._id }, { $set: { questionNew: q.questionNew } })
      );
      await Promise.all(updatePromises);
      console.log(`[ScenarioUpdater] Labelled ${newlyLabelledScenarios.length} scenarios.`);
    } catch (error) {
      console.error("[ScenarioUpdater] Error during scenario labelling:", error.message);
    }
  }

  // 4. Identify Open Scenarios for Embedding/Deletion
  console.log("[ScenarioUpdater] Identifying open and closed scenarios...");
  const openScenarios = savedScenarios.filter(s => {
    if (s.status === 'RESOLVED' || s.status === "CANCELED") return false;
    if (s.scenarioType === 'BINARY') {
      return s.currentProbability > 0.0001 && s.currentProbability < 0.9999;
    }
    return true; // Keep open non-binary or non-resolved
  });
  const openScenarioIds = new Set(openScenarios.map(s => s._id.toString())); // Use Set for faster lookup
  const closedScenarios = savedScenarios.filter(s => !openScenarioIds.has(s._id.toString()));
  console.log(`[ScenarioUpdater] -> Open: ${openScenarios.length}, Closed: ${closedScenarios.length}`);

  // 5. Identify Scenarios Needing Embedding (from open ones)
  console.log("[ScenarioUpdater] Identifying scenarios needing embedding...");
  const openScenarioMongoIds = openScenarios.map(s => s._id);
  let scenarioIdsToEmbed = [];
  try {
     scenarioIdsToEmbed = await chromaService.areNew(openScenarioMongoIds);
     console.log(`[ScenarioUpdater] -> ${scenarioIdsToEmbed.length} scenarios require embedding.`);
  } catch (error) {
      console.error("[ScenarioUpdater] Error checking ChromaDB for new scenarios:", error.message);
  }


  // 6. Generate and Add Embeddings
  if (scenarioIdsToEmbed.length > 0) {
    console.log(`[ScenarioUpdater] Generating embeddings for ${scenarioIdsToEmbed.length} scenarios...`);
    try {
        const scenariosToEmbed = await Scenario.find({ _id: { $in: scenarioIdsToEmbed } });
        const textsForEmbedding = scenariosToEmbed.map(s => embeddingService.scenarioToMd(s));

        // Consider batching embedding generation if needed
        const embeddings = await embeddingService.generate(textsForEmbedding, true);

        console.log(`[ScenarioUpdater] Adding ${scenariosToEmbed.length} scenarios with embeddings to ChromaDB...`);
        const addedCount = await chromaService.addScenarios(scenariosToEmbed, embeddings);
        console.log(`[ScenarioUpdater] -> ${addedCount?.length} scenarios added/updated in ChromaDB.`);
    } catch (error) {
        console.error("[ScenarioUpdater] Error generating or adding embeddings:", error.message);
    }
  }

  // 7. Delete Closed Scenarios from ChromaDB
  if (closedScenarios.length > 0) {
    console.log(`[ScenarioUpdater] Deleting ${closedScenarios.length} closed scenarios from ChromaDB...`);
    try {
        const deletedCount = await chromaService.deleteScenarios(closedScenarios.map(s => s._id));
        console.log(`[ScenarioUpdater] -> ${deletedCount} scenarios deleted from ChromaDB.`);
    } catch (error) {
        console.error("[ScenarioUpdater] Error deleting closed scenarios from ChromaDB:", error.message);
    }
  }

  console.log("[ScenarioUpdater] Scenario update process completed.");
};

export {
  scrapeScenarios,
  scrapedScenarioToMd,
  updateAndEmbedScenarios
};
