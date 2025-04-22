import { scrapeScenarios } from '../server/scrapers/index.js';
import Scenario from '../server//models/Scenario.model.js';
import { mongoService } from '../server/services/mongo.js';
import { embeddingService } from '../server/services/embedding.js';
import { chromaService } from '../server/services/chroma.js';
import { scenariosLabeller } from '../server/agents/scenariosLabeller.js';
const GEMINI_BATCH_SIZE = 20; // max ~50
import fs from 'fs';

export async function updateScenarios() {
  console.log("updating scenarios");
  
  
  // 1. Scrape Predictions Markets
  console.log("scraping predictions markets");
  const scenarios = await scrapeScenarios();
  console.log("-> scraped ", scenarios.length, " scenarios");
  
  console.log("Saving/updating scenarios: ", scenarios.length);
  const savedScenarios = [];
  const scenariosToLabel = [];
  for (const scenario of scenarios) {
    const savedScenario = await Scenario.findOneAndUpdate({ platformScenarioId: scenario.platformScenarioId }, scenario, { new: true, upsert: true });
    if (!savedScenario.questionNew) {
      scenariosToLabel.push(savedScenario);
    }
    savedScenarios.push(savedScenario);
  }

  console.log("Scenarios missing questionNew: ", scenariosToLabel.length);
  // generate 'questionNew' if missing and update scenarios
  if (scenariosToLabel.length > 0) {
    console.log("labelling scenarios: ", scenariosToLabel.length);
    const scenarioToLabelBatches = [];
    scenariosToLabel.forEach((s, i) => {
      const batchIndex = Math.floor(i / GEMINI_BATCH_SIZE);
      if(!scenarioToLabelBatches[batchIndex]) {
        scenarioToLabelBatches[batchIndex] = [];
      }
      scenarioToLabelBatches[batchIndex].push(s);
    });

    // call labeller for each batch in parallel
    console.log("Calling labeller for ", scenarioToLabelBatches.length, " batches and ", scenariosToLabel.length, " scenarios");
    const questionsResults = await Promise.all(scenarioToLabelBatches.map(batch => scenariosLabeller(batch)));
    const newlyLabelledScenarios = questionsResults.flat();

    // update scenarios with new questions
    for (const q of newlyLabelledScenarios) {
      await Scenario.findOneAndUpdate({ _id: q._id }, { questionNew: q.questionNew });
    }
    console.log("->", newlyLabelledScenarios.filter(q => q.questionNew !== q.questionOld).length, " new question labels");
  }

  // open scenarios 
  console.log("identifying open scenarios");
  const openScenarios = savedScenarios.filter(s => {
    if(s.status === 'RESOLVED' || s.status === "CANCELED") {
      return false;
    }
    if (s.scenarioType === 'BINARY') {
      return s.currentProbability > 0.0001 && s.currentProbability < 0.9999;
    }
    return true;
  });
  console.log("-> of ", savedScenarios.length, " saved scenarios, ", openScenarios.length, " are open");

  // 2. Identify scenarios needing embedding
  console.log("identifying scenarios needing embedding");
  const scenarioIdsToEmbed = await chromaService.areNew(openScenarios.map(s => s._id));
  console.log('-> Scenarios to embed: ', scenarioIdsToEmbed.length);

  if (scenarioIdsToEmbed.length > 0) {
    const scenariosToEmbed = await Scenario.find({ _id: { $in: scenarioIdsToEmbed } });

    const textsForEmbedding = scenariosToEmbed.map((s) => embeddingService.scenarioToMd(s));

    const embeddings = await embeddingService.generate(
      textsForEmbedding, 
      true
    );
    

    // add to chroma
    console.log("saving to chroma: ", scenariosToEmbed.length);
    const chromedScenarios = await chromaService.addScenarios(
      scenariosToEmbed,
      embeddings
    );
    console.log('Scenarios chromed:', chromedScenarios.length);
  }

  console.log("identifying resolved scenarios");
  
  // all savedScenarios that are in openScenarios
  const openScenarioIds = openScenarios.map(s => s._id);
  const resolvedScenarios = savedScenarios.filter(s => !openScenarioIds.includes(s._id));
  console.log("->", resolvedScenarios.length, " resolved scenarios flagged for deletion");

  if(resolvedScenarios.length > 0) {
    console.log("deleting closed scenarios from chroma: ", resolvedScenarios.length);
    await chromaService.deleteScenarios(resolvedScenarios.map(s => s._id));
    console.log("closed scenarios deleted from chroma");
  }

  // done.
  return console.log('Scenarios pipeline completed');
}

// try {
//   await mongoService.connect();
//   await updateScenarios();
//   console.log('MongoDB connection closed.');
// } catch (error) {
//   console.error('Error closing connections:', error);
// } finally {
//   await mongoService.disconnect();
// }
