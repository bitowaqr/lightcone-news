import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import dotenv from 'dotenv';
import Scenario from '../models/Scenario.model.js';
import { mongoService } from '../services/mongo.js';
dotenv.config();

const GEMINI_MODEL = 'gemini-2.0-flash';
// const GEMINI_MODEL = 'gemini-2.5-pro-exp-03-25';

// Define the expected output schema
const zodSchema = z.array(z.object({
    _id: z.string().describe("The ID of the scenario to be labelled"),
    questionOld: z.string().describe("The old Scenario Question/Title"),
    questionNew: z.string().describe("The new Scenario Question/Title"),
}));

export const scenariosLabeller = async (scenarios = []) => {

  const scenariosKeyInfo = scenarios.map((s, i) => ({_id: s._id, questionOld: s.question, oldDescription: s.description, resolutionCriteria: s.resolutionCriteria, tags: s.tags}));


    const model = new ChatGoogleGenerativeAI({
        model: GEMINI_MODEL,
        temperature: 0.2,
        apiKey: process.env.GEMINI_API_KEY,
      });

  // 2. Define LLM Prompts
  const systemPrompt = `# Role: AI Scenario Labeller for Lightcone.news

# Context:
You are an AI agent tasked with improving the labelling of future scenarios - these are prediction markets or probabilisitic forecasts - scraped from a variety of platforms (polymarket, metaculus, etc).

The scenarios will be displayed on a news aggregator website, next to related news articles. The scenarios are supposed to provide additional context and information to the news articles. In many cases, the scenario questions/titles are a bit too short, too vague, or can only be understood in the context of a collection of other forecasts.Thus, they need to be improved to be more informative and helpful.


# Task:
- Read scenario texts and write a new question/title that are more informative and helpful, IF needed (in some cases, the original question/title are already good enough and don't need to be changed).
- The reader should be able to understand what the forecast is about from the newQuestion alone, ie without reading the description or any other text.
- The newQuestion should still be extremely concise and accurate.
- Example 1:
  - questionOld: "Market fall 10% by Wednesday"
  - questionNew: "Will the S&P 500 fall 10% by Wednesday, 16 April 2025?"
- Example 2:
      - questionOld: "Sinners" Rotten Tomatoes score >95?"
      - questionNew: "Will the movie 'Sinners' get a Rotten Tomatoes score above 95%?"
- Example 3:
      - questionOld: "Trump trade deal in April?"
      - questionNew: "Will the US and China sign a trade deal in April 2025?"

## NOTE
- In most cases, the description provides enough information to understand what the forecast is about. If the description does not provide enough information for you to write a new question, or there are significant uncertainties, you must provide the old question as the new question without any changes - the editorial team will pick up on this and fix it manually.


# Input:
You will receive a collection of Scenarios with their _id and a description of the scenario including the (old) question and description.

# Output: JSON Format

Generate the new question for each scenario. Format your entire response as a single, valid JSON object.

The JSON object must strictly adhere to the following structure:

\`\`\`json
${JSON.stringify(zodToJsonSchema(zodSchema), null, 2)}
\`\`\`

**Key fields explained:**
* \`_id\`: The ID of the scenario to be labelled.
* \`questionOld\`: The old Scenario Question.
* \`questionNew\`: The new Scenario Question.`;

  const userPrompt = `# Scenarios for re-labelling:
${JSON.stringify(scenariosKeyInfo, null, 2)}

# Task:
Please read and analyze these scenarios, and generate new, extremely concise, more informative questions. Provide the result **only** as a single JSON object conforming to the specified structure.`;

  console.log('Calling LLM to generate new scenario questions...');

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

  const structuredLlm = model.withStructuredOutput(zodSchema);
  const response = await structuredLlm.invoke(messages);
  return response;

};

// // // Example Usage (requires a sample story object)
// const runTest = async () => {
//   // import scrapeArticles

//   await mongoService.connect();
//   const fewScenarios = await Scenario.find({}).limit(100);
//   console.log(fewScenarios.length, 'scenarios found');
//     const response = await callScenariosLabeller(fewScenarios);
//     console.log(response);
//     await mongoService.disconnect();
// }

// runTest();