import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema'; // Import for schema generation
import { scrapeFeeds } from '../scrapers/index.js';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_MODEL = 'gemini-2.0-flash'; // Fast and efficient for screening

// Define a schema for the expected news item structure for validation
const newsItemSchema = z.object({
  title: z.string(),
  url: z.string(),
  description: z.string().optional(),
  meta: z.object({
    publisher: z.string().optional(),
    publishedDate: z.string().optional(),
  }),
});

// --- Schema for Structured Output ---
const screenedUrlsSchema = z.object({
    keptUrls: z.array(z.string()).describe("An array of URLs for the news items that should be kept (passed screening).")
});

// --- LLM Configuration ---

const model = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
  temperature: 0.2, // Low temperature for conservative filtering
  apiKey: process.env.GEMINI_API_KEY,
});

// --- Source Screener Agent ---

/**
 * Filters a list of news items using an AI agent to remove clearly irrelevant ones.
 * Aims to reduce noise for downstream agents like lineupCreator.
 * Logic is conservative: when in doubt, keep the item.
 *
 * @param {Array<object>} newsItems - An array of news item objects conforming to newsItemSchema.
 * @returns {Promise<Array<object>>} - A promise resolving to the filtered array of potentially relevant news items.
 */
export const sourceScreener = async (newsItems) => {
  if (!Array.isArray(newsItems) || newsItems.length === 0) {
    console.warn('sourceScreener: Input is not a non-empty array. Returning empty list.');
    return [];
  }

  // Basic validation of input items and create a map for quick lookup
  const originalUrlMap = new Map();
  newsItems.forEach(item => originalUrlMap.set(item.url, item)); 

  // Prepare input for LLM, include index for reference in prompt if needed
  const formattedNewsList = newsItems
    .map(
      (item, index) => `
--- Item ---\nURL: ${item.url} \nTitle: ${item.title}\nDescription: ${item.description || 'N/A'}\nPublisher: ${item.meta?.publisher || 'N/A'}\nPublished Date: ${item.meta?.publishedDate || 'N/A'}`
    )
    .join('\n');

  const systemPrompt = `# Role: News Screener AI for Lightcone.news

# Context:
Lightcone.news focuses on **important global news** with potential long-term significance. We provide deep context (past, present, future) and aim for **signal over noise**. Our audience is intelligent and seeks substance.

# Task:
You will receive a list of news items, each identified by its URL. Your task is to identify and **discard items that are CLEARLY IRRELEVANT** to Lightcone's focus. Your goal is *only* to filter out obvious noise before a more sophisticated editor reviews the rest.

# Criteria for Irrelevance (Discard if item falls into these categories):
*   **Non-News:** Recipes, cooking, horoscopes, celebrity gossip, entertainment news (unless a major cultural event with wider implications), shopping deals, lottery results, personal blogs (unless by a significant figure on a relevant topic).
*   **Hyperlocal/Trivial:** Minor local events (community fairs, small accidents, local council minutiae unless setting major precedent), neighborhood watch reports, lost pets.
*   **Pure Sports:** Routine match reports, game recaps, fantasy league news. **Keep** major international events (Olympics, World Cup), significant sports-related scandals or political issues involving sports.
*   **Clickbait/Low Substance:** Articles with sensationalist titles and very little informational content (e.g., "You Won't Believe What Happened Next!", vague life hacks).
*   **Unintelligible/Broken:** Items with missing titles, nonsensical descriptions, or clearly broken formatting.

# IMPORTANT Constraint: CONSERVATIVE FILTERING
*   **If you are unsure whether an item is relevant or not, KEEP IT.**
*   **Only discard items that you are *highly confident* are irrelevant based on the criteria above.**
*   It is better to let a slightly irrelevant item through than to discard a potentially important one.

# Input Format:
A list of news items, each with URL, Title, Description, and Publisher.

# Output Format: JSON Only
You **MUST** provide your response **ONLY** as a single, valid JSON object. This object must contain a single key, \`keptUrls\`, whose value is an array of strings. Each string in the array must be the exact URL of a news item that you decided to **KEEP** (i.e., those that were *not* clearly irrelevant).

**Strict JSON Schema:**
\`\`\`json
${JSON.stringify(zodToJsonSchema(screenedUrlsSchema), null, 2)}
\`\`\`

Do not include any explanations or text outside of this JSON object. Only output the URLs of the items to keep.`;

  const userPrompt = `# News Items to Screen:\n${formattedNewsList}\n\n# Instruction:\nPlease screen these items based on the criteria. Be conservative. Return **ONLY** the JSON object containing the array of URLs for the items to keep, conforming strictly to the provided schema.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  // Use structured output
  const structuredLlm = model.withStructuredOutput(screenedUrlsSchema);

  try {
    const response = await structuredLlm.invoke(messages);

    // Process the structured response (array of URLs)
    if (response && Array.isArray(response.keptUrls)) {
      const keptUrlsSet = new Set(response.keptUrls);
      const finalScreenedItems = [];

      // Filter original validated items based on the returned URLs
      newsItems.forEach(item => {
          if (keptUrlsSet.has(item.url)) {
              finalScreenedItems.push(item);
          }
      });

      // Log warnings for any URLs returned by AI that weren't in the original list
      response.keptUrls.forEach(url => {
          if (!originalUrlMap.has(url)) {
              console.warn(`sourceScreener: AI returned non-matching URL "${url?.substring(0, 15)}..."`);
          }
      });

      // console.log(`sourceScreener: AI screening complete. Kept ${finalScreenedItems.length} of ${newsItems.length} valid items.`);
      return finalScreenedItems;
    } else {
      console.warn('sourceScreener: AI did not return the expected structured output (object with keptUrls array). Returning original validated list.', response);
      return newsItems; // Fallback if AI response format is wrong
    }
  } catch (error) {
    console.error('sourceScreener: Error during AI call: ', error);
    console.warn('sourceScreener: Returning original validated list due to error.');
    return newsItems; // Fallback on error
  }
};



export const sourceScreenerBatch = async (newsItems) => {
  const batchSize = 50;
  const screenedItems = [];
  for (let i = 0; i < newsItems.length; i += batchSize) {
    const batch = newsItems.slice(i, i + batchSize);
    let screenedBatch;
    let retries = 3;
    while (retries > 0) {
      try {
        screenedBatch = await sourceScreener(batch);
        break; // If successful, break out of the retry loop
      } catch (error) {
        console.error(`sourceScreenerBatch: Error screening batch (retries remaining: ${retries}):`, error);
        retries--;
        if (retries === 0) {
          console.warn('sourceScreenerBatch: Max retries reached. Including original batch.');
          screenedBatch = batch; // On final retry failure, keep the original batch
        }
      }
    }
    screenedItems.push(...screenedBatch);
  }
  return screenedItems;
};

// // Test the sourceScreener
// const testSourceScreener = async () => {
//     const newsItems = await scrapeFeeds(['heute'], true);
//     console.log("in: ", newsItems.length);
//   const screenedItems = await sourceScreener(newsItems);
//     console.log("out: ", screenedItems.length);
//     // check which have been filtered out
//     const filteredOut = newsItems.filter(item => !screenedItems.includes(item));
//     console.log("filtered out: ", filteredOut);
// }

// testSourceScreener();