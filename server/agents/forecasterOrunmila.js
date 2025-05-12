import {
    getScenarioForAgent,
    findOrCreateForecaster,
  saveForecast,
    predictionOutputSchemaString,
    generateSystemPrompt
} from '../utils/agentUtils.js';
import OpenAI from 'openai';
import { extractJsonFromString } from '../utils/extractJson.js';

const meta = {
  name: 'Orunmila-bot v0.1',
  description: 'A simple GPT-4o based forecaster using OpenAI\'s search API',
  type: 'AI',
  status: 'ACTIVE',
  modelDetails: {
    family: 'OpenAI',
    version: 'gpt-4o-search-preview',
    toolNotes: "OpenAI's search API",
  },
};

const invoke = async (scenarioId, save = false, log = false, existingForecast = null) => {
  
  
  if(log) console.log(`[${meta.name}] starting...`);
  
  const forecasterId = await findOrCreateForecaster(meta.name, meta);
  
  // 2. GET SCENARIO
  if (!scenarioId) {
    throw new Error(`[${meta.name}] Scenario ID is required`);
  }

    const scenario = await getScenarioForAgent(scenarioId);
    
    
  if (!scenario) {
    throw new Error(`[${meta.name}] Scenario not found`);
  }


  // 3. GET CLIENT
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // 4. SYSTEM PROMPT
  const SYSTEM_PROMPT = generateSystemPrompt({
    roleDescription: 'You are to adopt the persona of Nate Silver, a renowned forecaster known for his data-driven, analytical, and nuanced approach to predictions. Your expertise lies in synthesizing complex information, often gleaned from thorough research, into clear, justifiable probabilistic assessments.',
    personaDescription: 'Maintain the analytical, objective, and slightly cautious tone of Nate Silver. Show your working by referencing your research approach and findings.',
    researchToolDisplayName: 'your internal search tool',
    outputMethodConfiguration: { type: 'DIRECT_JSON' },
    modelSpecificResearchGuidelines: '' // No specific guidelines in original beyond common ones
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
- Dossier: ${existingForecast.dossier && existingForecast.dossier.length > 0 ? existingForecast.dossier.join(', ') : 'N/A'}
- Timestamp: ${existingForecast.timestamp ? new Date(existingForecast.timestamp).toISOString() : 'N/A'}

Please review this existing forecast in light of your new research and decide whether to update or reaffirm it, following the "Handling Forecast Updates" guidelines in the system prompt.

Remember: your response MUST be a valid JSON object with a "response" property. If you respond in any other format, the system will not be able to parse your response and will throw an error! The JOSN MUST be in the following format: ${predictionOutputSchemaString}`;
  }

  userPromptContent += `

Please generate a forecast for the scenario.`;

  let maxRetries = 3;
  let retryCount = 0;
  while (retryCount < maxRetries) {
    try {
      if(log) console.log(`[${meta.name}] invoking LLM...`);
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-search-preview',
        web_search_options: {
          search_context_size: 'high',
        },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPromptContent },
        ],
      });
      if (log) console.log(`[${meta.name}] parsing response...`);
      const parsed = extractJsonFromString(
        completion.choices[0].message.content
      );
        if(!parsed || !parsed.response) {
            throw new Error('Failed to parse JSON');
        }
      if (save) {
        if(log) console.log(`[${meta.name}] saving...`);
            await saveForecast({ scenarioId, forecasterId, predictionData: parsed.response, existingForecastId: existingForecast?._id });
      } 
      
      if(log) console.log(`[${meta.name}] done!`);

      return {
        forecaster: meta.name,
        scenarioId,
        forecasterId,
        predictionData: parsed.response,
      };
    } catch (error) {
      console.error(`[${meta.name}] error parsing JSON.`);
      retryCount++;
    }
  }
  throw new Error(`[${meta.name}] Failed after ${maxRetries} retries`);
};

const getName = () => meta.name;
const getMeta = () => meta;

export const forecasterOrunmila = {
    invoke,
    getName,
    getMeta,
};


// test
// (async () => {
//   const { closeMongoConnection } = await import('../utils/agentUtils.js');
//   const scenarioId = '6816f8069a446c44b935505e'; // Replace with a valid scenario ID
//   try {
//     // const result = await forecasterOrunmila.invoke(scenarioId, true, true); // For initial forecast
//     // console.log('Initial Forecast Result:', JSON.stringify(result, null, 2));

//     // Simulate an existing forecast for update
//     const existing = {
//       _id: "someMongoIdOrunmila",
//       probability: 0.33,
//       rationalSummary: "Previous analysis suggested low probability due to market conditions.",
//       rationalDetails: "Further details from Orunmila's initial forecast...",
//       dossier: ["http://example.com/orunmila_source.txt"],
//       timestamp: new Date(Date.now() - 96*60*60*1000).toISOString() // 4 days ago
//     };
//     const updateResult = await forecasterOrunmila.invoke(scenarioId, true, true, existing);
//     console.log('Update Forecast Result Orunmila:', JSON.stringify(updateResult, null, 2));

//   } catch (error) {
//     console.error('Error running Orunmila example:', error);
//   } finally {
//     await closeMongoConnection();
//   }
// })();
