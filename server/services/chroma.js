import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';
import { embeddingWithLimiter, processScenarioForEmbedding } from './embedding';
dotenv.config();

const chromaClient = new ChromaClient({
  path: process.env.CHROMA_URL || 'http://localhost:8000',
});

export const scenarioCollection = await chromaClient.getOrCreateCollection({
  name: 'scenario',
  embeddingFunction: embeddingWithLimiter,
});

export const addScenarios = async (scenarios) => {
    const processedScenarios = scenarios.map(s => processScenarioForEmbedding(s))
  await scenarioCollection.add({
    ids: scenarios.map((scenario) => scenario._id || scenario.id),
    documents: processedScenarios,
  });
};
