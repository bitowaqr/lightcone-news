import {
  getScenarioForAgent,
  findOrCreateForecaster,
  predictionOutputSchemaString,
  saveForecast,
  generateSystemPrompt,
  predictionOutputSchema,
  predictionOutputAsHeadings,
} from '../utils/agentUtils.js';
import { GoogleGenAI } from '@google/genai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
const meta = {
  name: 'Muaddib-bot v0.1',
  description: 'gemini-2.5-pro with grounding',
  type: 'AI',
  status: 'ACTIVE',
  modelDetails: {
    family: 'Gemini',
    version: 'gemini-2.5-pro-preview-05-06',
    toolNotes: 'grounding',
  },
};

const invoke = async (
  scenarioId,
  save = false,
  log = false,
  existingForecast = null
) => {
  // 1. FIND OR CREATE FORECASTER
  // const meta = { // meta is now defined outside this function
  //   name: 'Muadib-bot v0.1',
  //   description: 'gemini-2.5-pro with grounding',
  //   type: 'AI',
  //   status: 'ACTIVE',
  //   modelDetails: {
  //     family: 'Gemini',
  //     version: 'gemini-2.5-pro-preview-05-06',
  //     toolNotes: 'grounding',
  //   },
  // };

  const forecasterId = await findOrCreateForecaster(meta.name, meta);

  if (log) console.log(`[${meta.name}] starting...`);

  // 2. GET SCENARIO
  if (!scenarioId) {
    throw new Error(`[${meta.name}] Scenario ID is required`);
  }

  const scenario = await getScenarioForAgent(scenarioId);

  if (!scenario) {
    throw new Error(`[${meta.name}] Scenario not found`);
  }

  // 3. CLIENT
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // 4. SYSTEM PROMPT
  const SYSTEM_PROMPT = generateSystemPrompt({
    roleDescription:
      'You are a professional superforecaster with a track record of accurate and well-calibrated probabilistic forecasts, and you have been tasked with forecasting the likelihood of an event occurring. Your tone and style is authoritative, scholarly, and analytical, but always professional, accurate, and extremely well-researched.',
    personaDescription:
      'Maintain the analytical, objective, and slightly cautious tone of Nate Silver. Show your working by referencing your research approach and findings.',
    researchToolDisplayName: 'your internal search tool',
    outputMethodConfiguration: `Structure your response in the following format: ${predictionOutputAsHeadings}`,
    modelSpecificResearchGuidelines:
      'The fewer words you use, the better. Long queries usually lead to poor results, unless you are searching for a very specific issue.', // This was part of Muadib's original prompt and is good general advice
  });

  // 5. USER PROMPT
  let userPromptContent = `# Question: 
${scenario.questionNew || scenario.question}

# Description:
${scenario.description || 'N/A'}

# Resolution Criteria:
${scenario.resolutionCriteria}`;

  if (existingForecast) {
    userPromptContent += `

# Existing Forecast for Review:
You have previously forecasted on this scenario. Here is your prior assessment:
- Probability: ${existingForecast.probability}
- Rationale Summary: ${existingForecast.rationalSummary}
- Rationale Details: ${existingForecast.rationalDetails || 'N/A'}
- Dossier: ${
      existingForecast.dossier && existingForecast.dossier.length > 0
        ? existingForecast.dossier.join(', ')
        : 'N/A'
    }
- Timestamp: ${
      existingForecast.timestamp
        ? new Date(existingForecast.timestamp).toISOString()
        : 'N/A'
    }

Please review this existing forecast in light of your new research and decide whether to update or reaffirm it, following the "Handling Forecast Updates" guidelines in the system prompt.`;
  }

  userPromptContent += `

Please generate a forecast for the scenario.`;

  const messages = [
    {
      role: 'user',
      parts: [
        {
          text: userPromptContent,
        },
      ],
    },
  ];

  let maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      let lastMsg;
      if (log) console.log(`[${meta.name}] invoking LLM...`);

      lastMsg = await client.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: messages,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ googleSearch: {} }],
          thinkingConfig: {
            thinkingBudget: 1024,
          },
        },
      });

      // console.log(JSON.stringify(lastMsg, null, 2));

      if (log) console.log(`[${meta.name}] parsing response...`);
      let parts = lastMsg.candidates?.[0]?.content?.parts;
      if (!parts || !parts.length > 0)
        throw new Error('No parts found in lastMsg');
      if (log) console.log('Invoking parsing assistant...');
      const client2 = new ChatGoogleGenerativeAI({
        model: 'gemini-2.5-flash-preview-04-17',
        apiKey: process.env.GEMINI_API_KEY,
      });

      const structuredLlm = client2.withStructuredOutput(
        predictionOutputSchema
      );

      const messages2 = [
        {
          role: 'system',
          content: 'Extract the JSON from the following text: ',
        },
        {
          role: 'user',
          content: lastMsg.candidates?.[0]?.content?.parts[0].text,
        },
      ];
      const parsed = await structuredLlm.invoke(messages2);

      if (!parsed || !parsed.response) {
        throw new Error(
          `[${meta.name}] Failed to parse JSON from LLM final response`
        );
      }

      if (save) {
        if (log) console.log(`[${meta.name}] saving...`);
        await saveForecast({
          scenarioId,
          forecasterId,
          predictionData: parsed.response,
          existingForecastId: existingForecast?._id, // Pass existing forecast ID if available
        });
      }
      if (log) console.log(`[${meta.name}] done!`);
      return {
        forecaster: meta.name,
        scenarioId,
        forecasterId,
        predictionData: parsed.response,
      };
    } catch (error) {
      if (log)
        console.error(
          `[${meta.name}] error during agent execution (attempt ${
            retryCount + 1
          }/${maxRetries}):`,
          error
        );
      retryCount++;
    }
  }
  throw new Error(
    `[${meta.name}] Failed to get a valid response after ${maxRetries} retries`
  );
};

const getName = () => meta.name;
const getMeta = () => meta;

export const forecasterMuaddib = {
  invoke,
  getName,
  getMeta,
};

// // test
// (async () => {
//   const { closeMongoConnection } = await import('../utils/agentUtils.js');
//   const scenarioId = '681c1f33d173119b5f84b5d2';  // OLD // Replace with a valid scenario ID
//   // const scenarioId = '6816f8069a446c44b935505e'; // N/A
//   try {
//     const result1 = await forecasterMuaddib.invoke(scenarioId, false, true); // For initial forecast
//     console.log('Initial Forecast Result:', JSON.stringify(result1, null, 2));

//     // Simulate an existing forecast for update
//     const existing = {
//       _id: "681c1f33d173119b5f84b5d2", // typically a MongoDB ObjectId string
//       probability: 0.72,
//       rationalSummary: "Earlier assessment indicated high probability based on known factors.",
//       rationalDetails: "Detailed rationale from previous research...",
//       dossier: ["http://example.com/muadib_initial_source.html"],
//       timestamp: new Date(Date.now() - 72*60*60*1000).toISOString() // 3 days ago
//     };
//     const updateResult = await forecasterMuaddib.invoke(scenarioId, false, true, existing);
//     console.log('Update Forecast Result Muadib:', JSON.stringify(updateResult, null, 2));

//   } catch (error) {
//     console.error('Error running Muadib example:', error);
//   } finally {
//     await closeMongoConnection();
//   }
// })();
