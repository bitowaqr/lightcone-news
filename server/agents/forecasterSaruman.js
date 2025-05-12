import {
    getScenarioForAgent,
    findOrCreateForecaster,
    saveForecast,
    structureForecastOutputTool,
    generateSystemPrompt
} from '../utils/agentUtils.js';
import { ChatXAI } from '@langchain/xai';
import { exaSearch } from '../tools/exaSearch.js';
import { extractJsonFromString } from '../utils/extractJson.js';

const meta = {
    name: 'Saruman-bot v0.1',
    description: 'Grok 3 mini based forecaster with exaSearch tool',
    type: 'AI',
    status: 'ACTIVE',
    modelDetails: {
        family: 'Grok',
        version: 'grok-3-mini-beta',
        toolNotes: "exa search tool",
    },
};
    
const invoke = async (scenarioId, save = false, log = false, existingForecast = null) => {
    
    // 1. FIND OR CREATE FORECASTER
    // const meta = { // meta is now defined outside this function
    //     name: 'Saruman-bot v0.1',
    //     description: 'Grok 3 mini based forecaster with exaSearch tool',
    //     type: 'AI',
    //     status: 'ACTIVE',
    //     modelDetails: {
    //         family: 'Grok',
    //         version: 'grok-3-mini-beta',
    //         toolNotes: "exa search tool",
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


    // 3. GET CLIENT and tools
    
    const tools = [exaSearch, structureForecastOutputTool];

    const client = new ChatXAI({
        model: "grok-3-mini-beta",
        temperature: 1,
        apiKey: process.env.XAI_API_KEY,
      }).bindTools(tools);

    // 4. SYSTEM PROMPT
    const SYSTEM_PROMPT = generateSystemPrompt({
      roleDescription: 'You are a professional superforecaster with a stellar track record of accurate and well-calibrated probabilistic forecasts. Your tone and style is quite cynical and slightly dark.',
      personaDescription: 'Maintain a cynical and slightly dark, yet analytical and objective, tone. Show your working by referencing your research approach and findings.',
      researchToolDisplayName: 'your search tool (\`smart_search\`)',
      outputMethodConfiguration: { type: 'TOOL_CALL', toolName: structureForecastOutputTool.name },
      modelSpecificResearchGuidelines: 'IMPORTANT: Only perform one query at a time. If you submit multiple search queries, the function will throw an error. So you have to conduct you search queries consecutively, one after the other.'
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

Please review this existing forecast in light of your new research and decide whether to update or reaffirm it, following the "Handling Forecast Updates" guidelines in the system prompt, before calling the \`structure_forecast_output\` tool with your final assessment.`;
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
    let parsed;

    while (retryCount < maxRetries) {
        try {
            let researchOngoing = true;
            let lastMsg;

            while (researchOngoing) {
                if (log) console.log(`[${meta.name}] invoking LLM...`);
                lastMsg = await client.invoke(messages);
                messages.push(lastMsg);

                if (lastMsg.tool_calls && lastMsg.tool_calls.length > 0) {
                    let processedFinalSubmission = false;
                    for (const toolCall of lastMsg.tool_calls) {
                        if (toolCall.name === structureForecastOutputTool.name) {
                            if(log) console.log(`[${meta.name}] received final forecast via ${structureForecastOutputTool.name} tool.`);
                            parsed = toolCall.args;
                            researchOngoing = false;
                            processedFinalSubmission = true;
                            break; 
                        } else if (toolCall.name === exaSearch.name) {
                            if(log) console.log(`[${meta.name}] invoking exaSearch...`);
                            const toolResp = await exaSearch.invoke(toolCall.args);
                            const toolOutputDataObj = (toolResp && toolResp.messages && toolResp.messages.length > 0)
                                ? { ...toolResp.messages[0] }
                                : {};
    
                            delete toolOutputDataObj.image;
                            delete toolOutputDataObj.favicon;
                            delete toolOutputDataObj.author;
                            delete toolOutputDataObj.id;
    
                            messages.push({
                                role: 'tool',
                                content: JSON.stringify(toolOutputDataObj),
                                tool_call_id: toolCall.id || Math.random().toString(36).substring(2, 15)
                            });
                        } else {
                             if(log) console.warn(`[${meta.name}] received unhandled tool call: ${toolCall.name}`);
                             messages.push({
                                role: 'tool',
                                content: `Error: Tool '${toolCall.name}' is not supported or recognized in this context. Please use available tools: ${tools.map(t=>t.name).join(', ')}.`,
                                tool_call_id: toolCall.id
                             });
                        }
                    }
                    if (processedFinalSubmission) break;
                } else {
                    if(log) console.log(`[${meta.name}] LLM did not call a tool. Attempting to parse final response from content.`);
                    parsed = extractJsonFromString(lastMsg.content);
                    researchOngoing = false;
                }
            }

            if(log) console.log(`[${meta.name}] parsing response...`);
            
            if (!parsed || !parsed.response) {
                throw new Error(`[${meta.name}] Failed to obtain a valid structured forecast response. Ensure the 'structure_forecast_output' tool is called correctly with a 'response' object.`);
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

export const forecasterSaruman = {
    invoke,
    getName,
    getMeta,
};


// // test
// (async () => {
//   const { closeMongoConnection } = await import('../utils/agentUtils.js');
//   const scenarioId = '6816f8069a446c44b935505e'; // Replace with a valid scenario ID
//   try {
//     // const result = await forecasterSaruman.invoke(scenarioId, false, true); // For initial forecast
//     // console.log('Initial Forecast Result:', JSON.stringify(result, null, 2));

//     // Simulate an existing forecast for update
//     const existing = {
//       _id: "someMongoIdSaruman",
//       probability: 0.22,
//       rationalSummary: "Saruman's prior assessment leaned towards unlikely, citing shadowy portents.",
//       rationalDetails: "The Palantir showed conflicting futures, but the overall trend was negative...",
//       dossier: ["http://example.com/palantir_log_3E4.txt"],
//       timestamp: new Date(Date.now() - 5*24*60*60*1000).toISOString() // 5 days ago
//     };
//     const updateResult = await forecasterSaruman.invoke(scenarioId, false, true, existing);
//     console.log('Update Forecast Result Saruman:', JSON.stringify(updateResult, null, 2));

//   } catch (error) {
//     console.error('Error running Saruman example:', error);
//   } finally {
//     await closeMongoConnection();
//   }
// })();