import {
    getScenarioForAgent,
    findOrCreateForecaster,
    saveForecast,
    structureForecastOutputTool,
    generateSystemPrompt
} from '../utils/agentUtils.js';
import { ChatOpenAI } from '@langchain/openai';
import { exaSearch } from '../tools/exaSearch.js';
import { extractJsonFromString } from '../utils/extractJson.js';

const meta = {
    name: 'Moirae-bot v0.1',
    description: 'o3 based forecaster with exaSearch tool',
    type: 'AI',
    status: 'ACTIVE',
    modelDetails: {
        family: 'OpenAI',
        version: 'o3',
        toolNotes: "exa search tool",
    },
};

const invoke = async (scenarioId, save = false, log = false, existingForecast = null) => {
    
    // 1. FIND OR CREATE FORECASTER
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


    // 3. GET CLIENT and tools
    
    const tools = [exaSearch, structureForecastOutputTool];

    const client = new ChatOpenAI({
        model: "o3",
        temperature: 1,
        apiKey: process.env.OPENAI_API_KEY,
    }).bindTools(tools);

    // 4. SYSTEM PROMPT
    const SYSTEM_PROMPT = generateSystemPrompt({
      roleDescription: 'You are a professional superforecaster with a track record of accurate and well-calibrated probabilistic forecasts, and you have been tasked with forecasting the likelihood of an event occurring. Your tone and style is friendly, open, and accessible, you avoid jargon and are very much down to earth, but extremely accurate in your predictions.',
      personaDescription: 'Maintain the analytical, objective, and slightly cautious tone of Nate Silver.',
      researchToolDisplayName: 'your internal search tool (\`smart_search\`)',
      outputMethodConfiguration: { type: 'TOOL_CALL', toolName: structureForecastOutputTool.name },
      modelSpecificResearchGuidelines: 'The fewer words you use, the better. Long queries usually lead to poor results, unless you are searching for a very specific issue.'
    });

    // 5. USER PROMPT
    let userPromptContent = `# Scenario for Forecast:

## Question: 
${scenario.questionNew || scenario.question}

## Description:
${scenario.description || 'N/A'}

## Resolution Criteria:
${scenario.resolutionData?.resolutionCriteria || scenario.resolutionCriteria || 'N/A'}`;

    if (existingForecast) {
      userPromptContent += `

# Existing Forecast for Update:
You have previously forecasted this scenario. Your last assessment was:
\`\`\`json
${JSON.stringify(existingForecast, null, 2)}
\`\`\`
Please review this, conduct new research, and provide an updated or reaffirmed forecast as per the "Handling Forecast Updates" section in your system instructions.`;
    } else {
      userPromptContent += `
Please conduct deep research and generate an initial forecast for the scenario.`;
    }
    
    const userPrompt = userPromptContent;

    
    const messages = [
        {
            role: 'system',
            content: SYSTEM_PROMPT,
        },
        {
            role: 'user',
            content: userPrompt,
        },
    ]
    
    let maxRetries = 3;
    let retryCount = 0;
    let parsed;

    while (retryCount < maxRetries) {
        try {
            let researchOngoing = true;
            let lastLLMResponse;

            while (researchOngoing) {
                if(log) console.log(`[${meta.name}] invoking LLM...`);
                lastLLMResponse = await client.invoke(messages);
                messages.push(lastLLMResponse);

                if (lastLLMResponse.tool_calls && lastLLMResponse.tool_calls.length > 0) {
                    let processedFinalSubmission = false;
                    for (const toolCall of lastLLMResponse.tool_calls) {
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
                                tool_call_id: toolCall.id
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
                    parsed = extractJsonFromString(lastLLMResponse.content);
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
            if(log) console.error(`[${meta.name}] error during agent execution (attempt ${retryCount + 1}/${maxRetries}): `, error);
            retryCount++;
        }
    }
    throw new Error(`[${meta.name}] Failed to get a valid response after ${maxRetries} retries`);
};

const getName = () => meta.name;
const getMeta = () => meta;

export const forecasterMoirae = {
    invoke,
    getName,
    getMeta,
};


// test
// (async () => {
//   const { closeMongoConnection } = await import('../utils/agentUtils.js');
//   const scenarioId = '6816f8069a446c44b935505e'; // Replace with a valid scenario ID
//   try {
//     // const result = await forecasterMoirae.invoke(scenarioId, true, true); // For initial forecast
//     // console.log('Initial Forecast Result:', JSON.stringify(result, null, 2));

//     // Simulate an existing forecast for update
//     const existing = {
//       _id: "someMongoId123", // typically a MongoDB ObjectId string
//       probability: 0.45,
//       rationalSummary: "Prior assessment pointed to moderate likelihood based on available signals.",
//       rationalDetails: "Original detailed points from initial research...",
//       dossier: ["http://example.com/original_report.pdf"],
//       timestamp: new Date(Date.now() - 48*60*60*1000).toISOString() // 2 days ago
//     };
//     const updateResult = await forecasterMoirae.invoke(scenarioId, true, true, existing);
//     console.log('Update Forecast Result:', JSON.stringify(updateResult, null, 2));

//   } catch (error) {
//     console.error('Error running Moirae example:', error);
//   } finally {
//     await closeMongoConnection();
//   }
// })();

