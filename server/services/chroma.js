import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';
dotenv.config();

const SCENARIO_COLLECTION = 'scenario';
const BATCH_SIZE = 50;

class ChromaService {
  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000',
    });
    this.scenarioCollection = null;
  }

  async initialize() {
    this.scenarioCollection = await this.client.getOrCreateCollection({
        name: SCENARIO_COLLECTION,
    });
  }
    
  async getScenarioMetadata(scenario) {
      await this.initialize();
        return {
            platformScenarioId: scenario.platformScenarioId,
            platform: scenario.platform,
            tags: scenario.tags?.join(','),
            openDate: scenario.openDate,
            expectedResolutionDate: scenario.resolutionData?.expectedResolutionDate,
            resolutionDate: scenario.resolutionData?.resolutionDate,
            status: scenario.status,
        }
    }

  async addScenarios(scenarios, embeddings, storeScenarioDocs = false) {
    
    await this.initialize();
    
    if (!this.scenarioCollection) {
      console.error('ChromaDB collection not available.');
      return;
    }
    if (!scenarios || scenarios.length === 0) {
      console.log('No scenarios provided to add.');
      return;
    }

    console.log(`Adding/updating ${scenarios.length} scenarios in batches of ${BATCH_SIZE}...`);

    for (let i = 0; i < scenarios.length; i += BATCH_SIZE) {
      const batch = scenarios.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${i / BATCH_SIZE + 1} (${batch.length} items)`);

      try {
        const metadatas = batch.map(scenario => this.getScenarioMetadata(scenario));
        const scenarioIds = batch.map((scenario) => scenario?._id?.toString() || scenario?.id?.toString());
        
        if(null in scenarioIds) {
          throw new Error('Scenario IDs array contains null values');
        }

        if(scenarioIds.length !== batch.length || scenarioIds.length !== embeddings.length) {
          throw new Error('Scenario IDs and embeddings arrays must have the same length');
        }
        
        await this.scenarioCollection.upsert({
          ids: scenarioIds,
          documents: storeScenarioDocs ? batch.map((scenario) => scenario.textForEmbedding) : undefined,
          metadatas: metadatas,
          embeddings: embeddings,
        });
        
        console.log(`Batch ${i / BATCH_SIZE + 1} upserted successfully.`);

      } catch (error) {
        console.error(`Error upserting batch starting at index ${i}:`, error);
        // Decide how to handle errors: continue, stop, retry?
        // For now, just log and continue to the next batch
      }

      // Optional: Add a small delay between batches if needed
      // await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('Finished processing all scenario batches.');
    
    return scenarioIds;
  }
    
  async getScenarios(embeddings, nResults = 10, filter = {}) {
    await this.initialize();
  const results = await this.scenarioCollection.query({
    queryEmbeddings: embeddings,
    nResults: nResults,
    where: Object.keys(filter).length > 0 ? filter : undefined,
  });
  return results;
}
  
  
  async scenariosNotInCollection(scenarios = []) {
    await this.initialize();
    const results = await this.scenarioCollection.get({
      ids: scenarios.map((scenario) => scenario?._id?.toString() || scenario?.id?.toString()),
      include: [],
    });
    return scenarios.filter(scenario => !results.ids.includes(scenario?._id?.toString() || scenario?.id?.toString()));
  }

  async isNew(id) {
    await this.initialize();
    const results = await this.scenarioCollection.get({
      ids: [id],
    });
    return results.ids.length === 0;
  }
}

export const chromaService = new ChromaService();