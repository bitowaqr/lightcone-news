import {
    getScenarioForAgent,
    findOrCreateForecaster,
    saveForecast,
    structureForecastOutputTool,
    generateSystemPrompt
} from '../utils/agentUtils.js';
import { ChatAnthropic } from '@langchain/anthropic';
import { exaSearch } from '../tools/exaSearch.js';
import { extractJsonFromString } from '../utils/extractJson.js';

const meta = {
    name: 'Galadriel-bot v0.1',
    description: 'Claude Sonnet 3.7 thinking (5,000 tokens) with exaSearch tool',
    type: 'AI',
    status: 'ACTIVE',
    modelDetails: {
        family: 'Claude',
        version: 'sonnet-3.7-latest',
        toolNotes: "exa search tool",
    },
};

const invoke = async (scenarioId, save = false, log = false, existingForecast = null) => {
    
    // 1. FIND OR CREATE FORECASTER
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

    const client = new ChatAnthropic({
        model: "claude-3-7-sonnet-latest",
        apiKey: process.env.ANTHROPIC_API_KEY,
        maxTokens: 20_000,
        thinking: { type: 'enabled', budget_tokens: 5_000 },
      }).bindTools(tools);

    // 4. SYSTEM PROMPT
    const SYSTEM_PROMPT = generateSystemPrompt({
      roleDescription: 'You are a professional superforecaster with a world leading track record of accurate and well-calibrated probabilistic forecasts, and you have been tasked with forecasting the likelihood of an event occurring. Your tone and style is slightly optimistic, warm, and human, but always professional, accurate, and extremely well-researched.',
      personaDescription: 'Maintain a slightly optimistic, warm, and human tone, while remaining professional, accurate, and well-researched. Show your working by referencing your research approach and findings.',
      researchToolDisplayName: 'your search tool (\`smart_search\`)',
      outputMethodConfiguration: { type: 'TOOL_CALL', toolName: structureForecastOutputTool.name },
      modelSpecificResearchGuidelines: 'IMPORTANT: Only perform one query at a time. If you submit multiple search queries, the function will throw an error. So you have to conduct you search queries consecutively, one after the other.'
    });

    // 5. USER PROMPT
    let userPromptContent = `# Scenario for Forecast:

## Question: 
${scenario.questionNew || scenario.question}

## Description:
${scenario.description || 'N/A'}

## Resolution Criteria:
${scenario.resolutionData?.resolutionCriteria || scenario.resolutionCriteria || 'N/A'} 
`; // Ensure resolutionCriteria is accessed safely

    if (existingForecast) {
      userPromptContent += `

# Existing Forecast for Update:
You have previously forecasted this scenario. Your last assessment was:
\`\`\`json
${JSON.stringify(existingForecast, null, 2)}
\`\`\`
Please review this, conduct new research, and provide an updated or reaffirmed forecast as per the "Handling Forecast Updates" section in your system instructions.
`;
    } else {
      userPromptContent += `
Please conduct deep research and generate an initial forecast for the scenario.
`;
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
            let lastMsg;

            if (log) console.log(`[${meta.name}] Invoking LLM... (Attempt ${retryCount + 1})`);
            // Initial invocation
            let currentInvocation = await client.invoke(messages);
            lastMsg = currentInvocation;
            if(log) console.log(`[${meta.name}] LLM first response:`, JSON.stringify(lastMsg, null, 2).substring(0,500));


            // Tool call loop
            while(researchOngoing && lastMsg?.tool_calls?.length > 0) {
                if (log) console.log(`[${meta.name}] Handling tool calls...`);
                messages.push(lastMsg); // Add AI's response (with tool calls) to messages

                for (const toolCall of lastMsg.tool_calls) {
                    if (log) console.log(`[${meta.name}] Tool call: ${toolCall.name}`);

                    const tool = tools.find(t => t.name === toolCall.name);
                    if (tool) {
                        try {
                            let toolResponse;
                            if (tool.name === 'structure_forecast_output') {
                                if (log) console.log(`[${meta.name}] structure_forecast_output called. Ending research loop.`);
                                researchOngoing = false; // End research after this tool call
                                // The 'toolResponse' for structure_forecast_output is essentially the arguments themselves,
                                // which we'll parse and save later. We still need to "respond" to the LLM.
                                // Forcing a specific JSON structure that the LLM might expect as confirmation
                                toolResponse = { success: true, message: "Forecast structure received and processed." };
                                parsed = toolCall.args; // THIS IS THE ACTUAL FORECAST
                            } else {
                                // For other tools like exaSearch
                                toolResponse = await tool.func(toolCall.args); // Assuming tool.func exists and is async
                            }
                            
                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify(toolResponse),
                            });
                             if (log) console.log(`[${meta.name}] Tool response for ${toolCall.name}:`, JSON.stringify(toolResponse, null, 2).substring(0,500));


                        } catch (toolError) {
                            console.error(`[${meta.name}] Error executing tool ${toolCall.name}:`, toolError);
                            messages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify({ error: true, message: toolError.message }),
                            });
                            // Potentially break or throw, depending on desired error handling
                        }
                    } else {
                        if (log) console.warn(`[${meta.name}] Tool ${toolCall.name} not found. Skipping.`);
                         messages.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify({ error: true, message: `Tool ${toolCall.name} not found.` }),
                        });
                    }
                }

                if (researchOngoing) { // Only continue if structure_forecast_output wasn't called
                    if (log) console.log(`[${meta.name}] Re-invoking LLM with tool responses...`);
                    currentInvocation = await client.invoke(messages);
                    lastMsg = currentInvocation;
                    if(log) console.log(`[${meta.name}] LLM subsequent response:`, JSON.stringify(lastMsg, null, 2).substring(0,500));
                }
            }
            
            // After loop, if 'parsed' is not set (e.g. LLM finished without calling structure_forecast_output)
            // This might indicate an error or unexpected LLM behavior.
            if (!parsed && lastMsg && lastMsg.content && typeof lastMsg.content === 'string') {
                 if (log) console.log(`[${meta.name}] No tool call for structure_forecast_output, attempting to parse final LLM content.`);
                try {
                    const extracted = extractJsonFromString(lastMsg.content);
                    if (extracted && extracted.response) { // Assuming the final content might directly be the JSON
                        parsed = extracted;
                         if (log) console.log(`[${meta.name}] Successfully parsed final LLM content as forecast.`);
                    } else {
                         if (log) console.warn(`[${meta.name}] Could not parse final LLM content as a valid forecast structure:`, lastMsg.content.substring(0,500));
                        // Fall through to throw error if still no 'parsed'
                    }
                } catch (e) {
                    if (log) console.warn(`[${meta.name}] Error parsing final LLM content:`, e);
                    // Fall through to throw error
                }
            }


            if (!parsed || !parsed.response) { // Check if structure_forecast_output was called and its args are valid
                console.error(`[${meta.name}] Error: structure_forecast_output tool was not called or did not provide valid response arguments. Last message from LLM:`, JSON.stringify(lastMsg, null, 2).substring(0,1000));
                throw new Error('Forecaster did not call structure_forecast_output tool with valid arguments or provide a final JSON output.');
            }
            
            if (log) console.log(`[${meta.name}] Forecast extracted: `, JSON.stringify(parsed.response, null, 2).substring(0,500));

            if (save) {
                if (log) console.log(`[${meta.name}] saving...`);
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
            console.error(`[${meta.name}] Error during forecast generation (attempt ${retryCount + 1}):`, error);
            retryCount++;
            if (retryCount >= maxRetries) {
                console.error(`[${meta.name}] Max retries reached. Failed to generate forecast for scenario ${scenarioId}.`);
                throw error; // Re-throw the last error
            }
            if (log) console.log(`[${meta.name}] Retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
        }
    }
};

const getName = () => meta.name;
const getMeta = () => meta;

export const forecasterGaladriel = {
    invoke,
    getName,
    getMeta,
};

// // test
// (async () => {
//   const { closeMongoConnection } = await import('../utils/agentUtils.js');
//   const scenarioId = '6816f8069a446c44b935505e'; // Replace with a valid scenario ID
//   try {
//     // const result = await forecasterGaladriel.invoke(scenarioId, true, true); // For initial forecast
//     // console.log('Initial Forecast Result:', JSON.stringify(result, null, 2));

//     // Simulate an existing forecast for update
//     const existing = {
//       _id: "someMongoIdGaladriel", 
//       probability: 0.75,
//       rationalSummary: "Initial assessment by Galadriel indicated strong likelihood.",
//       rationalDetails: "The light of the Valar shines brightly on this path...",
//       dossier: ["http://example.com/valinor_archives.html"],
//       timestamp: new Date(Date.now() - 24*60*60*1000).toISOString() // 1 day ago
//     };
//     const updateResult = await forecasterGaladriel.invoke(scenarioId, true, true, existing);
//     console.log('Update Forecast Result Galadriel:', JSON.stringify(updateResult, null, 2));

//   } catch (error) {
//     console.error('Error running Galadriel example:', error);
//   } finally {
//     await closeMongoConnection();
//   }
// })();