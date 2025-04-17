import { AzureOpenAI, OpenAI } from 'openai';
import dotenv from 'dotenv';
dotenv.config();

class EmbeddingService {
    constructor() {
      this.apiKey = process.env.AZURE_OPENAI_API_KEY;
      this.endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      this.apiVersion = '2024-04-01-preview';
      this.deployment = 'text-embedding-3-large';
      this.modelName = 'text-embedding-3-large';
      this.client = new AzureOpenAI({ endpoint: this.endpoint, apiKey: this.apiKey, deployment: this.deployment, apiVersion: this.apiVersion });
      this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } 

  async embeddingFunction(input = [], useOpenAI = false) {

      if (useOpenAI) {
          const response = await this.openaiClient.embeddings.create({
            input,
            model: this.modelName,
          });
          return response.data?.map((item) => item.embedding) || [];
      } else {
          const response = await this.client.embeddings.create({
            input,
            modelName: this.modelName,
          });
          return response.data?.map((item) => item.embedding) || [];
      }
  }

  async embeddingWithLimiter(inputs = [], useOpenAI = false) {
    // max token: 8191, 1 token ~ 4 chars, using 3 for safety
    const MAX_SINGLE_INPUT_LENGTH = 8191 * 3;
    // 2048 is the max tokens for azure openai, -10 for safety
    // const MAX_INPUTS = 2048 - 10;
      const MAX_INPUTS = 1000;

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
    if (numBatches > 1) console.warn('N Batches = ', numBatches);
    for (let i = 0; i < processedInputs.length; i++) {
      batch.push(processedInputs[i]);
        if (batch.length === MAX_INPUTS) {
          console.log('Batch size = ', batch.length, ". Embedding...");
            let out = await this.embeddingFunction(batch, useOpenAI);
            console.log('Batch size = ', batch.length, ". Embedding done.");
        results.push(...out);
        batch = [];
        await new Promise((resolve) => setTimeout(resolve, useOpenAI ? 500 : 60_000)); // AZURE has crazy rate limits...
      }
    }
    if (batch.length > 0) {
      let out = await this.embeddingFunction(batch, useOpenAI);
      results.push(...out);
    }
    return results;
  }

  scenarioToMd(scenario) {
      // Ensure scenario and nested objects exist before accessing properties
      let text = []
      if(scenario?.question) {
        text.push(`# Question\n${scenario.question}`);
      }
      if(scenario?.description) {
        text.push(`# Description\n${scenario.description}`);
      }
      if(scenario?.tags) {
        text.push(`# Tags\n${scenario.tags.join(', ')}`);
      }
      if(scenario?.resolutionCriteria) {
        text.push(`# Resolution Criteria\n${scenario.resolutionCriteria}`);
      }
      if(scenario?.rationaleSummary) {
        text.push(`# Rationale Summary\n${scenario.rationaleSummary}`);
      }
      if(scenario?.rationaleDetails) {
        text.push(`# Rationale Details\n${scenario.rationaleDetails}`);
      }

      return text.join('\n\n').trim();
  }
    
processArticleForEmbedding(article) {
    let text = [];
    if (article?.title) {
        text.push(`# Title
${article.title}`);
    }
    if (article?.precis) {
        text.push(`# Precis
${article.precis}`);
    }
    if (article?.summary) {
        text.push(`# Summary
${article.summary}`);
    }
    if (article?.tags?.length > 0) {
        text.push(`# Tags
${article.tags.join(', ')}`);
    }
    return text.join('\n\n').trim();
}

  async generate(inputs = [], useOpenAI = false) {
    return await this.embeddingWithLimiter(inputs, useOpenAI);
  }
}

export const embeddingService = new EmbeddingService();


// // test with a scenario
// const scenario = {
//   question: 'Will Han Dong-hoon be the People\'s Power Party candidate for president?',
//   description: 'An early presidential election will be held in South Korea on 3 June 2025. This market will resolve according to the candidate selected to represent the The People Power Party (PPP; Korean: 국민의힘) for President of South Korea. If a candidate which is not listed is selected, this market will resolve to “Other”. If no candidate is selected by June 3, 2025, 11:59 PM ET, this market will resolve to “Other”. The resolution source for this market will be the first official announcement of the chosen candidate by the The People Power Party, however a consensus of credible reporting may also be used.',
//   tags: ["South Korea", "World", "Yoon", "Politics"],
//   resolutionData: { resolutionCriteria: "" },
// };

// const step1 = await embeddingService.scenarioToMd(scenario)
// console.log(step1)

// const step2 = await embeddingService.embeddingWithLimiter([step1])
// console.log(step2)
