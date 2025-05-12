import {
    getScenarioForAgent,
    findOrCreateForecaster,
    saveForecast,
    generateSystemPrompt
} from '../utils/agentUtils.js';
import { extractJsonFromString } from '../utils/extractJson.js';

const meta = {
    name: 'Manhattan-bot v0.1',
    description: 'Perplexity-based deep research agent',
    type: 'AI',
    status: 'ACTIVE',
    modelDetails: {
        family: 'Perplexity',
        version: 'sonar-deep-research',
        toolNotes: "Perplexity's internal tools, search_context_size: high",
    },
};
    
const invoke = async (scenarioId, save = false, log = false, existingForecast = null) => {
    
    // 1. FIND OR CREATE FORECASTER
    // const meta = { // meta is now defined outside this function
    //     name: 'Manhattan-bot v0.1',
    //     description: 'Perplexity-based deep research agent',
    //     type: 'AI',
    //     status: 'ACTIVE',
    //     modelDetails: {
    //         family: 'Perplexity',
    //         version: 'sonar-deep-research',
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


    

    // 4. SYSTEM PROMPT
    const SYSTEM_PROMPT = generateSystemPrompt({
      roleDescription: 'You are a professional superforecaster with a track record of accurate and well-calibrated probabilistic forecasts. You follow superforcasting best practices to the letter up to the point where it almost becomes rigid. You often think in terms of base rates and you like to consider many different sides: \'on the one hand\', \'on the other hand\', \'if this happens\', \'if that happens\', \'if this other thing happens\', \'if this other thing doesn\'t happen\', etc.',
      personaDescription: 'Maintain the analytical, objective, and slightly cautious tone of Nate Silver. Show your working by referencing your research approach and findings.',
      researchToolDisplayName: 'your internal search tool',
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
                  model: 'sonar-deep-research',
                  messages,
                  return_related_questions: true,
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

export const forecasterManhattan = {
    invoke,
    getName,
    getMeta,
};


// // test
// (async () => {
//   const { closeMongoConnection } = await import('../utils/agentUtils.js');
//   const scenarioId = '6816f8069a446c44b935505e'; // Replace with a valid scenario ID
//   try {
//     // const result = await forecasterManhattan.invoke(scenarioId, false, true); // For initial forecast
//     // console.log('Initial Forecast Result:', JSON.stringify(result, null, 2));

//     // Simulate an existing forecast for update
//     const existing = {
//       _id: "someMongoIdManhattan",
//       probability: 0.99,
//       rationalSummary: "Manhattan project's previous calculations were highly confident.",
//       rationalDetails: "All variables aligned, physics dictated the outcome...",
//       dossier: ["http://example.com/classified_manhattan_report.pdf"],
//       timestamp: new Date(Date.now() - 30*24*60*60*1000).toISOString() // 30 days ago
//     };
//     const updateResult = await forecasterManhattan.invoke(scenarioId, false, true, existing);
//     console.log('Update Forecast Result Manhattan:', JSON.stringify(updateResult, null, 2));

//   } catch (error) {
//     console.error('Error running Manhattan example:', error);
//   } finally {
//     await closeMongoConnection();
//   }
// })();