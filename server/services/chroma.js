import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';
dotenv.config();

const SCENARIO_COLLECTION = 'scenario';

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
    console.log(1)
    await this.initialize();
    console.log(2)
      const metadatas = scenarios.map(scenario => this.getScenarioMetadata(scenario));

      const scenarioIds = scenarios.map((scenario) => scenario?._id?.toString() || scenario?.id?.toString());
      
      if(null in scenarioIds) {
        throw new Error('Scenario IDs array contains null values');
      }

    if(scenarioIds.length !== scenarios.length || scenarioIds.length !== embeddings.length) {
      throw new Error('Scenario IDs and embeddings arrays must have the same length');
    }
    
    await this.scenarioCollection.upsert({
        ids: scenarioIds,
        documents: storeScenarioDocs ? scenarios.map((scenario) => scenario.textForEmbedding) : undefined,
        metadatas: metadatas,
        embeddings: embeddings,
    });
    
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