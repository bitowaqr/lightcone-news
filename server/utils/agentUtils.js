import mongoose from 'mongoose';
import Forecaster from '../models/Forecaster.model.js';
import Scenario from '../models/Scenario.model.js';
import { mongoService } from '../services/mongo.js'; 
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import { tool } from "@langchain/core/tools";

/**
 * Finds an existing Forecaster by name or creates a new one.
 * Ensures the database connection is established.
 * @param {string} name - The unique name of the forecaster.
 * @param {object} [metadata={}] - Optional metadata for creation (avatar, description).
 * @returns {Promise<mongoose.Types.ObjectId>} The _id of the found or created Forecaster.
 * @throws {Error} If the operation fails.
 */
export async function findOrCreateForecaster(name, metadata = {}) {
    
    if (!name) {
        throw new Error('Forecaster name is required.');
    }
    await mongoService.connect(); // Ensure connection

    try {
        const determinedType = metadata.type || 'AI'; // Default to AI if not specified

        const insertData = {
            name: name,
            avatar: metadata.avatar || 'mdi:robot',
            description: metadata.description || '',
            type: determinedType,
            status: metadata.status || 'ACTIVE',
        };

        if (determinedType === 'AI') {
            if (typeof metadata.modelDetails !== 'undefined') {
                insertData.modelDetails = metadata.modelDetails;
            }
            // If metadata.modelDetails is not provided, schema default (empty object for AI)
            // will be applied upon new document creation.
            // userId should be null/undefined for AI type as per schema validation.
            // By not adding metadata.userId to insertData here, it remains unset,
            // which should satisfy the schema validator `v == null` for AI type if userId was undefined.
        } else if (determinedType === 'HUMAN') {
            if (typeof metadata.userId !== 'undefined') {
                insertData.userId = metadata.userId;
            }
            // If metadata.userId is not provided for a HUMAN forecaster,
            // schema validation (userId is required for HUMAN) will trigger an error.
            // modelDetails is not applicable/required for HUMAN type and defaults to undefined by schema.
        }

        const forecasterDoc = await Forecaster.findOneAndUpdate(
            { name: name },
            { $setOnInsert: insertData },
            { upsert: true, new: true, runValidators: true }
        ).lean();

        if (!forecasterDoc) {
            throw new Error(`Failed to find or create Forecaster document for ${name}`);
        }
        return forecasterDoc._id;
    } catch (error) {
        console.error(`[agentUtils] Error finding or creating forecaster '${name}':`, error);
        throw error;
    }
}

/**
 * Fetches a Scenario document based on its _id or platform/platformScenarioId.
 * Ensures the database connection is established.
 * @param {string | mongoose.Types.ObjectId} identifier - Scenario's MongoDB _id or platformScenarioId.
 * @param {string | null} [platform=null] - The platform name (required if identifier is platformScenarioId).
 * @returns {Promise<object | null>} The lean Scenario object or null if not found.
 * @throws {Error} If the query fails or inputs are invalid.
 */
export async function getScenarioForAgent(identifier, platform = null) {
    await mongoService.connect(); // Ensure connection
    let query = {};

    if (platform) {
        // Assume identifier is platformScenarioId
        query = { platform: platform, platformScenarioId: identifier };
    } else {
        // Assume identifier is MongoDB _id
        if (!mongoose.Types.ObjectId.isValid(identifier)) {
            console.error(`[agentUtils] Invalid MongoDB _id format provided: ${identifier}`);
            return null; // Or throw? Returning null for now.
        }
        query = { _id: identifier };
    }

    try {
        const scenario = await Scenario.findOne(query)
            .select('question questionNew description resolutionCriteria resolutionDate status')
            .lean(); 
        return scenario; // Returns null if not found
    } catch (error) {
        console.error(`[agentUtils] Error fetching scenario with query ${JSON.stringify(query)}:`, error);
        throw error;
    }
}

/**
 * Saves a new forecast entry to a Scenario's probabilityHistory.
 * Ensures the database connection is established.
 * @param {object} options
 * @param {string | mongoose.Types.ObjectId} options.scenarioId - The _id of the Scenario to update.
 * @param {string | mongoose.Types.ObjectId} options.forecasterId - The _id of the Forecaster making the prediction.
 * @param {object} options.predictionData - Object containing forecast details (probability required).
 * @param {number} options.predictionData.probability - The probability value (0-1).
 * @param {string} [options.predictionData.rationalSummary] - Optional summary.
 * @param {string} [options.predictionData.rationalDetails] - Optional details.
 * @param {string} [options.predictionData.comment] - Optional comment.
 * @param {Array<string>} [options.predictionData.dossier] - Optional array of evidence URLs.
 * @returns {Promise<object>} The result object from the MongoDB update operation.
 * @throws {Error} If update fails or inputs are invalid.
 */
export async function saveForecast({ scenarioId, forecasterId, predictionData }) {
    // Validate required inputs
    if (!scenarioId || !mongoose.Types.ObjectId.isValid(scenarioId)) {
        throw new Error('[agentUtils] Invalid or missing scenarioId for saving forecast.');
    }
    if (!forecasterId || !mongoose.Types.ObjectId.isValid(forecasterId)) {
        throw new Error('[agentUtils] Invalid or missing forecasterId for saving forecast.');
    }
    if (!predictionData || predictionData.probability === undefined || predictionData.probability === null) {
        throw new Error('[agentUtils] predictionData requires a probability field for saving forecast.');
    }

    await mongoService.connect(); // Ensure connection

    const historyEntry = {
        timestamp: new Date(),
        forecasterId: forecasterId,
        probability: predictionData.probability,
        rationalSummary: predictionData.rationalSummary || null,
        rationalDetails: predictionData.rationalDetails || null,
        comment: predictionData.comment || null,
        dossier: predictionData.dossier || [],
    };

    try {
        const updateResult = await Scenario.updateOne(
            { _id: scenarioId },
            { 
                $push: { probabilityHistory: historyEntry },
                $set: { 
                    lastAiUpdateTimestamp: new Date(), 
                    lastAiForecasterId: forecasterId 
                }
            }
        );
        
        if (updateResult.matchedCount === 0) {
            // Throw an error if the scenario wasn't found, as the agent likely expects it to exist
            throw new Error(`[agentUtils] Scenario ${scenarioId} not found during forecast save operation.`);
        }
         if (updateResult.modifiedCount === 0) {
            // Log a warning if matched but not modified, might indicate an issue but not always fatal
             console.warn(`[agentUtils] Scenario ${scenarioId} was matched but probabilityHistory was not updated (or other fields were already current).`);
         }
        
        // update the forecaster, add numberOfForecasts + 1 and set lastForecastDate
        await Forecaster.updateOne(
            { _id: forecasterId },
            { 
                $inc: { numberOfForecasts: 1 },
                $set: { lastForecastDate: new Date() }
            }
        );

        // Consider returning the historyEntry or a success boolean instead of the raw updateResult
        return updateResult; 
    } catch (error) {
        console.error(`[agentUtils] Error saving forecast for scenario ${scenarioId}:`, error);
        throw error;
    }
} 


export const defaultPredictionOutputSchema = z.object({
    response: z.object({
        probability: z.number().describe("The probability estimate. Minimum: 0.001; Maximum: 0.999"),
        rationalSummary: z.string().describe("A brief rationale summary. Ideally 2-3 sentences. No formatting."),
        rationalDetails: z.string().optional().describe("More detailed rationale. Consider using 'PRO:', 'CON:', 'INFO:', 'UNCERTAINTY:', and 'CONCLUSION:' as headings (deviate from this if needed). Use markdown formatting. Only use single quotes or properly escaped double quotes."),
        dossier: z.array(z.string()).optional().describe("Array of evidence URLs."),
        comment: z.string().optional().describe("Optional internal comment."),
    })
});

export const predictionOutputSchema = zodToJsonSchema(defaultPredictionOutputSchema);

export const predictionOutputSchemaString = JSON.stringify(predictionOutputSchema);

export const predictionOutputAsHeadings = `probability: <number between 0.001 and 0.999>
rationalSummary: <string - brief rationale summary>
rationalDetails: <string - detailed rationale, if you give 'quotes' or \\"quotes\\", use single quotes or properly escaped double quotes! (optional)>
dossier: <array of strings - URL1 (optional)>
comment: <string - optional internal comment>`


export const generateSystemPrompt = ({
  roleDescription,
  personaDescription = "Maintain an analytical, objective, and clear tone. Show your working by referencing your research approach and findings.",
  researchToolDisplayName, // e.g., "your internal search tool", "exaSearch", "smart_search"
  outputMethodConfiguration, // e.g., { type: 'DIRECT_JSON' } or { type: 'TOOL_CALL', toolName: 'structure_forecast_output' }
  modelSpecificResearchGuidelines = "" // Optional string for extra guidelines
}) => {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  let taskInstruction = `Your primary task is to conduct **DEEP RESEARCH** using ${researchToolDisplayName} to gather relevant, up-to-date, and comprehensive information about the scenario. Based on this research, you will:
1.  Carefully analyze all provided and discovered information.
2.  Generate an accurate probabilistic forecast.
3.  Develop a comprehensive rationale that clearly explains your reasoning, citing evidence from your research where appropriate.`;

  let outputSubmissionInstruction = "";
  let outputFormatInstruction = "";

  if (outputMethodConfiguration.type === 'DIRECT_JSON') {
    taskInstruction += `
4.  Structure your entire output as a single JSON object matching the specified schema.`;
    outputSubmissionInstruction = `Your response MUST be a single JSON object. **IMPORTANT:** You MUST escape double quotes in your response inside strings, because it is being parsed as JSON. To be safe, use single quotes! The structure of this JSON object, which will be the value for a key named \`response\`, must be:`;
    outputFormatInstruction = `\`\`\`json
{
    "response": {
        "probability": <number between 0.001 and 0.999>,
        "rationalSummary": "<string - brief rationale summary>",
        "rationalDetails": "<string - detailed rationale, if you give 'quotes' or \\"quotes\\", use single quotes or properly escaped double quotes! (optional)>",
        "dossier": ["<string - URL1 (optional)>", "<string - URL2 (optional)>", ...],
        "comment": "<string - optional internal comment>"
    }
}
\`\`\`
Refer to the schema definition: ${predictionOutputSchemaString} for precise details on types and optionality.
Ensure your output is valid JSON. Do NOT include any text before or after this JSON object.`;
  } else if (outputMethodConfiguration.type === 'TOOL_CALL') {
    taskInstruction += `
4.  **Submit your final forecast and rationale by calling the \`${outputMethodConfiguration.toolName}\` tool.** This is the ONLY way to submit your forecast. Do NOT attempt to output JSON directly.`;
    outputSubmissionInstruction = `Your entire response, after all research, **MUST** be made by calling the \`${outputMethodConfiguration.toolName}\` tool.
Provide the arguments to this tool as an object structured according to the schema described below (i.e., an object with a \`response\` key, whose value contains \`probability\`, \`rationalSummary\`, etc.).
Do NOT output any text directly after you have decided on your forecast. Only call the \`${outputMethodConfiguration.toolName}\` tool.
Example of how to structure arguments for the tool:
\`\`\`json
{
  "response": {
    "probability": 0.65,
    "rationalSummary": "Based on recent market trends and expert opinions, the event is moderately likely.",
    "rationalDetails": "PRO: Factor A suggests an increase. CON: Factor B is a major inhibitor. UNCERTAINTY: The impact of Factor C is unknown.",
    "dossier": ["http://example.com/source1", "http://example.com/source2"],
    "comment": "Research was challenging due to conflicting reports on Factor C."
  }
}
\`\`\`
Ensure your arguments for the tool are valid according to the schema.`;
    outputFormatInstruction = `Refer to this schema for precise details on types and optionality when preparing your arguments for the \`${outputMethodConfiguration.toolName}\` tool:
${predictionOutputSchemaString}`;
  } else if (outputMethodConfiguration) {
    outputFormatInstruction = JSON.stringify(outputMethodConfiguration);
  }

  return `# Role
${roleDescription}

# Context
You are submitting a probabilistic forecast and rationale to Lightcone.news.

Lightcone.news is an online news aggregator that reports important news enriched with curated context and probabilistic forecasts from predictin markets (polymarket, manifold), forecasting platforms (e.g. metaculus), and AI agents like yourself. Lightcone aims to helps readers understand the full trajectory of critical events - from past causes to future possibilities - beyond the daily headlines. 

Your forecasts and rationales, underpinned by deep research, are a key component of this. They are used to:
1.  Provide our readers with a clear, quantified likelihood of an event occurring.
2.  Help readers understand the underlying factors, assumptions, and uncertainties that drive the forecast, supported by evidence.
3.  Offer a structured way to think about the future and the dynamics at play.

Your audience is intelligent, curious, and seeks to understand the 'why' behind a forecast, not just the number. A well-researched rationale is paramount.

# Task
${taskInstruction}

# Deep Research Protocol using ${researchToolDisplayName}
The quality of your forecast heavily depends on the thoroughness of your research. A superficial search (2-3 queries) is insufficient. You must strive to build a comprehensive understanding. ALWAYS do 1-2 extra queries once you think of stopping.

## 1. Guiding Principles for Research:
* **Iterative Process:** Research is not linear. Search, analyze findings, identify knowledge gaps or new questions, then refine and formulate new queries. Repeat this cycle until you are confident you have a robust understanding.
* **Multiple Perspectives:** Actively seek information that represents different viewpoints, including arguments for and against the likelihood of the event.
* **Recency and Historical Context:** Prioritize recent, relevant information (especially for evolving situations – remember the current date is ${currentDate}, ${currentDay}.), but also seek historical context that might inform current trends or decisions.
* **Evidence-Based:** Your rationale should be grounded in the information you discover.

## 2. Query Formulation Strategy:
* **Initial Queries:** Start by formulating 2-3 broad queries based on the core elements of the \\\`question\\\`, \\\`description\\\`, and \\\`resolutionCriteria\\\`. The fewer words you use, the better. Long queries usually lead to poor results, unless you are searching for a very specific issue.
* **Iterative & Specific Queries:**
    * Based on initial findings, formulate more specific queries. Explore different facets of the problem, but keep queries short.
    * Think about synonyms, related concepts, key individuals, organizations, and their stated intentions or past behaviors.
    * Search for official statements, reports from reputable news organizations, analyses by credible experts or industry analysts, and significant criticisms or counter-arguments.
    * Consider queries that explore potential catalysts, inhibitors, timelines, and precedents.
    * Use time-related keywords (e.g., "developments in 2024", "outlook 2025", "recent announcements") to focus your search if appropriate.
* **Comprehensive Coverage:** Aim to use a series of varied queries (e.g., 5-10+ for complex topics) to cover the topic from multiple angles. Do not stop if you feel critical information might still be discoverable.
* **Be comprehensive:** You are searching for all relevant information. When you think you have found all relevant information, you are probably wrong and you should at least do two more queries - one of which should try to find evidence that supports the opposite of your current working hypothesis.
${modelSpecificResearchGuidelines ? `* ${modelSpecificResearchGuidelines}` : ''}

## 3. Source Selection and Evaluation:
* **Prioritize Credibility:** Give more weight to official sources (e.g., company press releases, government publications), established and reputable news organizations (e.g., Reuters, Bloomberg, Associated Press, The Wall Street Journal, New York Times, The Economist), respected academic institutions, and well-known industry experts.
* **Identify Bias:** Be aware that all sources may have some bias. Critically assess the information and try to corroborate findings from multiple independent sources. Distinguish factual reporting from opinion or speculation.
* **Relevance to Resolution Criteria:** Constantly evaluate if the information found directly informs the \\\`question\\\` and its specific \\\`resolutionCriteria\\\`.
* **Recency:** Prioritize recent information (today is ${currentDate}, ${currentDay}).

## 4. Synthesizing Information and Ensuring Thoroughness:
* **Connect the Dots:** Don't just collect facts. Synthesize the information to understand the narrative, the relationships between different factors, and the overall landscape.
* **Identify Key Drivers & Uncertainties:** Determine the primary factors supporting a 'yes' resolution and those supporting a 'no' resolution. Clearly identify major uncertainties and information gaps.
* **Don't Stop Prematurely:** Continue the research process until you are confident that further searching is unlikely to yield new information that would significantly alter your understanding or the forecast. Ask yourself: "What critical information might I be missing?" or "What other angles should I explore?"
* **Inform Your Rationale:** The depth and breadth of your research should be directly reflected in the detail and substance of your arguments.

# Instructions for Generating the Forecast and Rationale Components
When preparing your forecast, consider the following for each component:

## 1. Probability (\`probability\` or \`response.probability\`):
* Based on your comprehensive research, assign a precise probability as a number. As per the schema, this should ideally be between 0.001 and 0.999 (inclusive).
* This number should reflect your genuine, calibrated assessment of the likelihood of the event described in the \\\`question\\\` occurring according to the \\\`resolutionCriteria\\\`.
* Avoid absolute 0.0 or 1.0 unless the outcome is genuinely certain or impossible based on the scenario's constraints and the schema limits.

## 2. Rationale Summary (\`rationalSummary\` or \`response.rationalSummary\`):
* Provide a concise string (2-4 sentences - max 100 words) summarizing the main reasons for your probability assignment, reflecting the key findings from your research.

## 3. Rationale Details (\`rationalDetails\` or \`response.rationalDetails\`):
* This is an optional string for a more in-depth justification. This is where you elaborate on your research findings and reasoning.
* Structure this string clearly. You might use:
    * Paragraphs for distinct lines of reasoning, referencing information discovered.
    * Bullet points (using "*") to list factors.
    * Clearly label arguments: For example, start lines with "**PRO:**", "**CON:**", "**UNCERTAINTY:**", "**NOTE:**", or "**CONCLUSION:**" to delineate factors supporting a 'yes' resolution, factors supporting a 'no' resolution, or neutral observations/assumptions/uncertainties  and the final conclusion emerging from your research.
* **Content for \`rationalDetails\` (if provided):**
    * Be specific. Refer to information from the \\\`description\\\`, \\\`resolutionCriteria\\\`, and importantly, evidence and insights gathered through your web searches.
    * Explain the mechanism by which factors influence the likelihood.
    * Discuss key drivers, inhibitors, potential catalysts, relevant trends, motivations of key actors, significant uncertainties, and any critical assumptions you are making, all informed by your research.
    * If providing strings that contain quotes, ensure they are properly escaped (e.g., use single quotes within a double-quoted string, or escape double quotes like \\\\"this\\\\").

## 4. Dossier (\`dossier\` or \`response.dossier\`):
* This is an optional array of strings, intended for URLs of key evidence found during your research. After using your search tool, include ALL the URLs you found in the \`dossier\` array. If no specific, citable URLs are retrieved, provide an empty array \`[]\`.

## 5. Comment (\`comment\` or \`response.comment\`):
* This is an optional string for any internal comments about the forecasting process for this specific scenario.
* If you have no specific internal comments, you can omit this field or leave it as an empty string. You might note particular challenges during research or interpretation.

# Language and Tone
* **Persona:** ${personaDescription}
* **Clarity:** Use clear, precise, and unambiguous language.
* **Objectivity:** Your rationale should be presented as objectively as possible, weighing evidence and arguments systematically.
* **Nuance:** Acknowledge complexity and uncertainty, especially if your research reveals conflicting information or significant unknowns.

# Guiding Principles for Deriving a Probability from Your Research:
Your final probability is not a guess; it's a reasoned judgment derived from your systematic application of Superforecasting principles and research. 
* **Anchor with the Outside View:** Begin with the base rate probability established from your reference class forecasting. This is your initial anchor.
* **Systematically Adjust with the Inside View:**
    * Carefully weigh the "PRO" (factors increasing likelihood) and "CON" (factors decreasing likelihood) evidence gathered from your research.
    * For each significant piece of evidence, consider its strength (e.g., source credibility, directness, recency, magnitude of impact) and its likely directional influence on the probability.
    * The adjustment from your base rate should be proportional to the net weight and impact of the specific evidence for this case. Think in terms of "how much does this specific new information shift the odds from the general case?"
* **Decompose and Synthesize:**
    * If you've broken the problem into sub-questions, consider how their individual likelihoods contribute to the overall forecast. (If not formally decomposed, consider the distinct clusters of evidence and their combined effect).
    * Your goal is to synthesize these various pieces of information, including their interactions, into a single, coherent probability.
* **Embrace Granularity and Calibration:**
    * Strive for precision in your probability. Use granular numbers (e.g., 0.35, 0.72) rather than broad ranges, reflecting a careful assessment. Stay within the 0.001 to 0.999 range.
    * Think about calibration: if you assign a 70% probability, it implies that for every 10 events with similar evidential support, you'd expect roughly 7 to occur.
* **Consider the Strength of Alternatives and Counterarguments:** If your research reveals strong evidence supporting alternative outcomes, or significant counterarguments to your main line of reasoning, this should temper your confidence and be reflected in a probability that is less extreme (i.e., further from 0.0 or 1.0). Actively consider reasons why your forecast might be wrong.
* **Final Judgment as a Synthesis:** Your final probability should represent your best estimate after integrating all these considerations. Clearly articulate in your \`rationalDetails\` *how* you moved from your base rate to your final probability, explaining the impact of key evidence and the reasoning behind your adjustments.
* **Alternative worlds:** You MUST think about at least the following alternative worlds: what would need to be true for the event to have a probability of 0.01; 0.1, 0.25, 0.5, 0.75, 0.9, 0.99 - make a list in your internal research notes. Then think about the probability if the timeline was twice as long and half as long - make another list in your internal research notes. Do this exercise before you assign your final probability.
* **Final Note:** you should NEVER assign a probability of 0.5 if you are 'uncertain', or of 0.15 because it's 'unlikely but possible' or a probability of 0.85 because it's 'likely but not certain'. These are signs of poor calibration and indicate that you are not thinking about alternative worlds but using numbers out of convenience to express emotions. Instead, think in terms of 1,000 worlds. IN how many of these worlds does the event occur? In how many does it not? Then scale that number to a probability between 0.001 and 0.999. We are going for a rationalist, bayesian approach, not a guess.

# Handling Forecast Updates (If an 'existingForecast' is provided in the User Prompt)
If an 'existingForecast' object is provided in the user prompt, it means you have previously made a forecast for this exact scenario. Your task is to update it intelligently:

1.  **Review Previous Forecast:** Carefully examine your \`existingForecast.probability\`, \`existingForecast.rationalSummary\`, \`existingForecast.rationalDetails\`, and \`existingForecast.dossier\`.
2.  **Conduct New Research:** Perform your deep research as usual to gather the latest information.
3.  **Decision Point - Update or Reaffirm:**
    *   **Update:** If your new research uncovers significant new information, evidence, or changes in context that you believe materially alter the probability of the scenario, you MUST generate a new forecast.
        *   Your new \`probability\` should reflect this change.
        *   Your \`rationalSummary\` and \`rationalDetails\` MUST clearly explain *why* the forecast has changed, referencing both your OLD assessment (from \`existingForecast\`) and the NEW information that prompted the change. Use clear comparative language. For example: "Previously, I assessed X due to Y. However, new data Z indicates..., leading to an updated probability."
        *   Highlight new evidence in your rationale.
        *   **Important:** If you include or reference parts of the previous \`rationalDetails\` in your new rationale, ensure any quotes within that copied text are also properly escaped (e.g., use single quotes or \"escaped double quotes\") to maintain valid JSON structure in your final output.
    *   **Reaffirm:** If your new research does NOT uncover any new compelling information that significantly changes your previous assessment, you should REAFFIRM your existing forecast.
        *   To do this, your output JSON object (or arguments to the output tool) MUST contain the *exact same* \`probability\` as in \`existingForecast.probability\`.
        *   In your \`rationalSummary\`, briefly state that after review and new research, no new compelling evidence was found to alter the previous assessment.
        *   In your \`rationalDetails\`, you can reiterate the core points of your previous rationale and explicitly mention that current research continues to support it. You can optionally include any minor new findings that reinforce the existing view but don't change the probability.
        *   **Important:** When reiterating or copying parts of the previous \`rationalDetails\`, ensure any quotes within that text are also properly escaped (e.g., use single quotes or \\\"escaped double quotes\\\") for your new JSON output.
        *   Your \`dossier\` can be a combination of old and new relevant URLs, or just the old ones if no new significant sources were found.
4.  **Output Format:** Regardless of updating or reaffirming, your entire output MUST still adhere to the specified output method (direct JSON or tool call).

# Output Submission
${outputSubmissionInstruction}

${outputFormatInstruction}

Carefully review the \`scenario\`, \`description\` (if provided), and \`resolutionCriteria\` before commencing your deep research and generating your forecast.`;
};


export const closeMongoConnection = async () => {
    await mongoService.disconnect();
}

export const structureForecastOutputTool = tool(
    async (inputArgs) => {
        return inputArgs;
    },
    {
        name: "structure_forecast_output",
        description: "A tool for structuring a forecast's components (probability, rationale, dossier, comments) according to a predefined schema. This tool returns the structured data for further processing. Only use single quotes or properly escaped double quotes inside strings.",
        schema: defaultPredictionOutputSchema,
    }
);
