import {
    getScenarioForAgent,
    findOrCreateForecaster,
    saveForecast,
    generateSystemPrompt
} from '../utils/agentUtils.js';
import { extractJsonFromString } from '../utils/extractJson.js';

const meta = {
    name: 'Tiresias-bot v0.1',
    description: 'Perplexity-based reasoning agent',
    type: 'AI',
    status: 'ACTIVE',
    modelDetails: {
        family: 'Perplexity',
        version: 'sonar-reasoning-pro',
        toolNotes: "Perplexity's internal tools, search_context_size: high",
    },
};
    
const invoke = async (scenarioId, save = false, log = false, existingForecast = null) => {
    
    // 1. FIND OR CREATE FORECASTER
    // const meta = { // meta is now defined outside this function
    //     name: 'Tiresias-bot v0.1',
    //     description: 'Perplexity-based reasoning agent',
    //     type: 'AI',
    //     status: 'ACTIVE',
    //     modelDetails: {
    //         family: 'Perplexity',
    //         version: 'sonar-reasoning-pro',
    //         toolNotes: "Perplexity's internal tools, search_context_size: high",
    //     },
    // };
    
    const forecasterId = await findOrCreateForecaster(meta.name, meta);

    if(log) console.log(`[${meta.name}] starting...`);
    
    // 2. GET SCENARIO
    if (!scenarioId) {
        throw new Error(`[${meta.name}] Scenario ID is required`);
    }

    const scenario = await getScenarioForAgent(scenarioId);
    
    
    if (!scenario) {
        throw new Error(`[${meta.name}] Scenario not found`);
    }

    // 3. SYSTEM PROMPT
    const SYSTEM_PROMPT = generateSystemPrompt({
      roleDescription: 'You are a professional superforecaster with a track record of accurate and well-calibrated probabilistic forecasts. Your tone and style is academic and analytical. You tend to stick to the facts and give references and links to support your forecasts. You mainly think in terms of base rates and the outside view.',
      personaDescription: 'Maintain the analytical, objective, and slightly cautious tone of Nate Silver. Show your working by referencing your research approach and findings.',
      researchToolDisplayName: 'your internal search tool', // Prompt uses this, code uses Perplexity
      outputMethodConfiguration: { type: 'DIRECT_JSON' },
      modelSpecificResearchGuidelines: ''
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

Please review this existing forecast in light of your new research and decide whether to update or reaffirm it, following the "Handling Forecast Updates" guidelines in the system prompt. Your final output should be a JSON object reflecting this decision.`;
    }

    userPromptContent += `

Please generate a forecast for the scenario.`;

    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
        {
            role: 'user',
            content: userPromptContent,
        },
    ]
    
    
// const {
//     model = 'sonar-reasoning-pro',
//     systemPrompt = 'You are a helpful AI assistant',
//     contextSize = 'high',
//     prompt,
//   } = opts;
    
    let maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            

            const options = {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  // model: 'sonar-reasoning-pro',
                  // model: 'sonar-deep-research',
                  model: 'sonar-reasoning-pro',
                  messages,
                  return_related_questions: true,
                  web_search_options: { search_context_size: 'high' },
                  // max_tokens: 123,
                  // temperature: 0.2,
                  // top_p: 0.9,
                  // search_domain_filter: ['<any>'],
                  // return_images: false,
                  // search_recency_filter: '<string>',
                  // top_k: 0,
                  // stream: false,
                  // presence_penalty: 0,
                  // frequency_penalty: 1,
                  // response_format: {},
                }),
              };
            
            if(log) console.log(`[${meta.name}] invoking LLM...`);
            const response = await fetch(
                'https://api.perplexity.ai/chat/completions',
                options
              );
            const data = await response.json();
            const lastMsg = data.choices[0].message;
            
            if(log) console.log(`[${meta.name}] parsing response...`);
            const parsed = extractJsonFromString(lastMsg.content);
            
            if (!parsed || !parsed.response) {
                throw new Error(`[${meta.name}] Failed to parse JSON from LLM final response`);
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
            if(log) console.error(`[${meta.name}] error during agent execution (attempt ${retryCount + 1}/${maxRetries}):`, error);
            retryCount++;
        }
    }
    throw new Error(`[${meta.name}] Failed to get a valid response after ${maxRetries} retries`);
};

const getName = () => meta.name;
const getMeta = () => meta;

export const forecasterTiresias = {
    invoke,
    getName,
    getMeta,
};


// // // test
// (async () => {
//   const { closeMongoConnection } = await import('../utils/agentUtils.js');
//   const scenarioId = '6816f8069a446c44b935505e'; // Replace with a valid scenario ID
//   try {
//     // const result = await forecasterTiresias.invoke(scenarioId, false, true); // For initial forecast
//     // console.log('Initial Forecast Result:', JSON.stringify(result, null, 2));

//     // Simulate an existing forecast for update
//     const existing = {
//       _id: "someMongoIdTiresias",
//       probability: 0.62,
//       rationalSummary: "Tiresias's earlier prophecies indicated a favorable outcome.",
//       rationalDetails: "The entrails were clear, the birds flew auspiciously...",
//       dossier: ["http://example.com/tiresias_oracle_transcript.txt"],
//       timestamp: new Date(Date.now() - 3*24*60*60*1000).toISOString() // 3 days ago
//     };
//     const updateResult = await forecasterTiresias.invoke(scenarioId, false, true, existing);
//     console.log('Update Forecast Result Tiresias:', JSON.stringify(updateResult, null, 2));

//   } catch (error) {
//     console.error('Error running Tiresias example:', error);
//   } finally {
//     await closeMongoConnection();
//   }
// })();