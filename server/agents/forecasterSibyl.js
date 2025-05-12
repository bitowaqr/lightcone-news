import {
    getScenarioForAgent,
    findOrCreateForecaster,
    saveForecast,
    generateSystemPrompt
} from '../utils/agentUtils.js';
import { AzureChatOpenAI } from '@langchain/openai';
import { exaSearch } from '../tools/exaSearch.js';
import { extractJsonFromString } from '../utils/extractJson.js';

const meta = {
    name: 'Sibyl-bot v0.1',
    description: 'o4-mini with exaSearch tool',
    type: 'AI',
    status: 'ACTIVE',
    modelDetails: {
        family: 'OpenAI',
        version: 'o4-mini',
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
    
    const tools = [exaSearch];

    const client = new AzureChatOpenAI({
        model: "o4-mini",
        temperature: 1,
        maxTokens: undefined,
        maxRetries: 2,
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIApiVersion: "2024-12-01-preview",
        azureOpenAIApiInstanceName: "o4-mini",
        azureOpenAIApiDeploymentName: "o4-mini",
        azureOpenAIApiEndpoint: process.env.AZURE_GPT45_URL,
    }).bindTools(tools);

    // 4. SYSTEM PROMPT
    const SYSTEM_PROMPT = generateSystemPrompt({
      roleDescription: 'You are an AI Forecasting Agent. Your expertise lies in synthesizing complex information, often gleaned from thorough research, into clear, justifiable, extremely accurate probabilistic assessments.',
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
            let researchOngoing = true;
            let lastLLMResponse;

            while (researchOngoing) {
                if(log) console.log(`[${meta.name}] invoking LLM...`);
                lastLLMResponse = await client.invoke(messages);

                if (lastLLMResponse.tool_calls && lastLLMResponse.tool_calls.length > 0) {
                    messages.push(lastLLMResponse);

                    const toolCall = lastLLMResponse.tool_calls[0];

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
                    messages.push(lastLLMResponse);
                    researchOngoing = false;
                }
            }

            if(log) console.log(`[${meta.name}] parsing response...`);
            const parsed = extractJsonFromString(lastLLMResponse.content);
            if (!parsed || !parsed.response) {
                throw new Error('Failed to parse JSON from LLM final response');
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

export const forecasterSibyl = {
    invoke,
    getName,
    getMeta,
};


// test
// (async () => {
//   const { closeMongoConnection } = await import('../utils/agentUtils.js');
//   const scenarioId = '6816f8069a446c44b935505e';
//   const result = await forecasterSibyl(scenarioId, false);
//   console.log(result);
//   await closeMongoConnection();
// })();