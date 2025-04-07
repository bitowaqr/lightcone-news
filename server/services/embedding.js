import { AzureOpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

export const embeddingFunction = async (input = []) => {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = '2024-04-01-preview';
  const deployment = 'text-embedding-3-large';
  const options = { endpoint, apiKey, deployment, apiVersion };
  const client = new AzureOpenAI(options);
  const modelName = 'text-embedding-3-large';
  const response = await client.embeddings.create({
    input,
    modelName,
  });
  return response.data?.map((item) => item.embedding) || [];
};

export const embeddingWithLimiter = async (inputs = []) => {
  // max token: 8191, 1 token ~ 4 chars, using 3 for safety
  const MAX_SINGLE_INPUT_LENGTH = 8191 * 3;
  // 2048 is the max tokens for azure openai, -10 for safety
  const MAX_INPUTS = 2048 - 10;

  // Process inputs that are too long
  const processedInputs = inputs.map((input, index) => {
    if (input.length > MAX_SINGLE_INPUT_LENGTH) {
      console.warn(
        `Warning: Input at index ${index} exceeds maximum length. Truncating.`
      );
      const topPortion = Math.floor(MAX_SINGLE_INPUT_LENGTH * 0.75);
      const bottomPortion = Math.floor(MAX_SINGLE_INPUT_LENGTH * 0.25);
      return (
        input.substring(0, topPortion) +
        input.substring(input.length - bottomPortion)
      );
    }
    return input;
  });

  // Split into batches and process
  let batch = [];
  const results = [];

  const numBatches = Math.ceil(processedInputs.length / MAX_INPUTS);
  console.warn('Multiple batches are going to be ran:', numBatches);
  for (let i = 0; i < processedInputs.length; i++) {
    batch.push(processedInputs[i]);
    if (batch.length === MAX_INPUTS) {
      let out = await embeddingFunction(batch);
      results.push(...out);
      batch = [];
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  if (batch.length > 0) {
    let out = await embeddingFunction(batch);
    results.push(...out);
  }
  return results;
};

export const processScenarioForEmbedding = (scenario) => {
  // Ensure scenario and nested objects exist before accessing properties
  const question = scenario?.question || '';
  const description = scenario?.description || '';
  const tags = (scenario?.tags || []).join(', '); // Join tags into a single string
  const resolutionCriteria = scenario?.resolutionData?.resolutionCriteria || '';
  const rationaleSummary = scenario?.scenarioData?.rationaleSummary || '';
  const rationaleDetails = scenario?.scenarioData?.rationaleDetails || '';

  // Combine the relevant text fields into a single string
  // Using labels might help the embedding model distinguish parts, but simple concatenation is often effective too.
  const text = [
    `Question: ${question}`,
    `Description: ${description}`,
    `Tags: ${tags}`,
    `Resolution Criteria: ${resolutionCriteria}`,
    `Rationale Summary: ${rationaleSummary}`,
    `Rationale Details: ${rationaleDetails}`,
  ]
  .filter(part => part && part.split(': ')[1]) // Filter out empty sections
  .join('\n'); // Separate sections clearly

  return text;
};

// test with a scenario
const scenario = {
  question: 'What is the capital of France?',
  description: 'France is a country in Western Europe.',
  tags: ['France', 'Europe', 'Capital'],
  resolutionData: { resolutionCriteria: 'The capital of France is Paris.' },
};

console.log(processScenarioForEmbedding(scenario));