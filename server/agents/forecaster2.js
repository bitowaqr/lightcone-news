import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import dotenv from 'dotenv';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";

dotenv.config();

// Define the model to use
const MODEL = "gemini-2.5-flash-preview-04-17"

// Initialize the model with Google Generative AI
const model = new ChatGoogleGenerativeAI({
  model: MODEL,
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.7,
  maxRetries: 3,
}).bindTools([{ googleSearch: {} }]);

// Define the system prompt for the forecaster
const systemPrompt = `# Role: You are an expert forecaster for Lightcone.news, a platform that provides users with probabilistic forecasts on important questions.

# Core Task: Generate accurate probabilistic forecasts with clear rationales

# Instructions:
1. Analyze the provided scenario question, background information, and resolution criteria.
2. Research relevant information using your search capabilities.
3. Apply superforecasting principles:
   - Consider base rates and reference classes
   - Balance inside and outside views
   - Identify key uncertainties and drivers
   - Apply Bayesian reasoning
   - Avoid overconfidence
4. Provide a clear, evidence-based rationale for your forecast.
5. Express your forecast as a precise probability between 0-100%.

# Output Format:
Your response must follow this exact structure:

<report>
<rationale>
[Your detailed reasoning explaining how you arrived at your forecast]
</rationale>

<final_forecast>
[A single number between 0-100 representing your probability estimate]
</final_forecast>
</report>

Remember that your forecast will be displayed to users of Lightcone.news, so maintain high standards of clarity, accuracy, and intellectual rigor.`;

// Define the user prompt template
const userPromptTemplate = (scenario) => `
# Question
${scenario.question}

# Background Information
${scenario.description || "No additional background provided."}

# Resolution Criteria
${scenario.resolutionCriteria}

# Resolution Date
${scenario.resolutionDate}

Today's date: ${new Date().toISOString().split('T')[0]}

Please provide your forecast and rationale.
`;

// Define the schema for the forecast output
const forecastSchema = z.object({
  rationale: z.string().describe("Detailed reasoning explaining how you arrived at your forecast"),
  final_forecast: z.number().min(0).max(100).describe("A probability between 0-100%")
});

/**
 * Generates a forecast for a given scenario
 * @param {Object} scenario - The scenario object containing question, description, etc.
 * @returns {Promise<Object>} - The forecast result with rationale and probability
 */
export const generateForecast = async (scenario) => {
  try {
    console.log(`Generating forecast for scenario: ${scenario.question}`);
    
    // Prepare the messages for the model
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPromptTemplate(scenario) }
    ];
    
    // Call the model
    const response = await model.invoke(messages);
    const responseContent = response.content;
    
    // Extract the rationale and forecast from the response
    const rationaleMatch = /<rationale>([\s\S]*?)<\/rationale>/i.exec(responseContent);
    const forecastMatch = /<final_forecast>([\s\S]*?)<\/final_forecast>/i.exec(responseContent);
    
    if (!rationaleMatch || !forecastMatch) {
      throw new Error("Failed to extract forecast data from model response");
    }
    
    const rationale = rationaleMatch[1].trim();
    const finalForecast = parseFloat(forecastMatch[1].trim());
    
    // Validate the extracted data
    const validatedForecast = forecastSchema.parse({
      rationale,
      final_forecast: finalForecast
    });
    
    console.log(`Forecast generated successfully: ${finalForecast}%`);
    
    return {
      rationale: validatedForecast.rationale,
      probability: validatedForecast.final_forecast,
      status: "COMPLETED"
    };
  } catch (error) {
    console.error("Error generating forecast:", error);
    return {
      rationale: "An error occurred while generating the forecast.",
      probability: null,
      status: "ERROR",
      error: error.message
    };
  }
};

/**
 * Processes a scenario and generates a forecast
 * @param {Object} scenario - The scenario object from the database
 * @returns {Promise<Object>} - The updated scenario with forecast data
 */
export const runForecast = async (scenario) => {
  try {
    // Generate the forecast
    const forecastResult = await generateForecast(scenario);
    
    // Return the updated scenario with forecast data
    return {
      ...scenario,
      forecast: {
        probability: forecastResult.probability,
        rationale: forecastResult.rationale,
        status: forecastResult.status,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error("Error running forecast:", error);
    return {
      ...scenario,
      forecast: {
        probability: null,
        rationale: "Failed to generate forecast: " + error.message,
        status: "ERROR",
        timestamp: new Date().toISOString()
      }
    };
  }
};


// test
const testScenario = {
  question: "Will the stock market crash in 2025?",
  description: "The stock market has been performing well, but there are some concerns about valuations and inflation.",
  resolutionCriteria: "The stock market will crash in 2025.",
  resolutionDate: "2025-06-01"
};

const testResult = await runForecast(testScenario);
console.log(testResult);