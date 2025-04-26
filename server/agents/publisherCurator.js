import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-pro-preview-03-25'
const DEFAULT_MAX_ITEMS_PER_PUBLISHER = 25;

// --- Schema for Structured Output ---
const curatedPublisherUrlsSchema = z.object({
    keptUrls: z.array(z.string()).describe("An array of URLs for the news items selected for this publisher, ordered by perceived importance (most important first).")
});

// --- LLM Configuration ---
const model = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
  temperature: 0.3, // Moderate temperature for balanced judgment
  apiKey: process.env.GEMINI_API_KEY,
});

const structuredLlm = model.withStructuredOutput(curatedPublisherUrlsSchema);

// --- Publisher Curator Agent ---

/**
 * Curates news items from a single publisher based on relevance, significance,
 * and non-duplication, selecting the top N most important items.
 *
 * @param {Array<object>} newsItems - Array of news item objects from ONE publisher.
 * @param {string} publisherName - The name of the publisher for context.
 * @param {number} maxItems - The maximum number of items to return for this publisher.
 * @returns {Promise<Array<string>>} - A promise resolving to an array of kept URLs.
 */
const curatePublisherFeed = async (newsItems, publisherName, maxItems = DEFAULT_MAX_ITEMS_PER_PUBLISHER) => {
  if (!Array.isArray(newsItems) || newsItems.length === 0) return [];

  // Prepare input for LLM
  const formattedNewsList = newsItems
    .map((item, index) => `--- Item ${index + 1} ---
URL: ${item.url}
Title: ${item.title}
Description: ${item.description || 'N/A'}
Published Date: ${item.meta?.publishedDate || 'N/A'}`
    ).join('\n\n');


    const systemPrompt = `# Role: AI News Curator for Publisher Feed - ${publisherName}

# Context:
You are curating the news feed specifically from ${publisherName} for Lightcone.news. Lightcone focuses on **important global news** with potential long-term significance, aiming for **signal over noise** and providing deep context. We value unique insights and impactful stories, even if not widely covered initially. We never report on recipes, horoscopes, celebrity gossip, music, routine sports reports (only major scandals or events with wider societal implications are of interest, and maybe olympics opening and closing), regular pop culture news, shopping, lottery results, hyperlocal trivial news, other trivial news, unintelligible/broken items. We also usually do not cover commentary or opinion pieces (unless there is a meta-angle).

# Task:
Review the provided list of news items *exclusively from ${publisherName}*. Select the **top  most relevant and significant items** for Lightcone.news, applying the following filtering and selection logic:

1. **Initial Relevance Filter (Discard Obvious Noise):**
   * Immediately discard items that are CLEARLY IRRELEVANT to important global news: Recipes, horoscopes, celebrity gossip, routine sports reports (keep major events/scandals), shopping deals, lottery results, personal blogs (unless major figure on relevant topic), hyperlocal trivial news (minor local events, lost pets), unintelligible/broken items.

2. **Identify Core Events & Group Duplicates:**
   * Read through the *remaining* items. Identify items covering the *same core event or story*, even if titles/angles differ slightly.

3. **Select Best Representatives per Event:**
   * For each identified core event/story, select only the **single most comprehensive, recent, or significant article** covering it *from this list*. Discard the other duplicates/variants *from this publisher's list*.

4. **Final Selection:**
   * From the unique, relevant stories remaining after filtering and de-duplication, select **AT MOST ${maxItems} items** based on these criteria (prioritized):
       * **Global Significance & Impact:** Stories with wide-ranging or potentially large future consequences.
       * **Signal Over Noise:** Stories offering unique insights, important developments, or potentially overlooked angles. Prioritize substance.
       * **Foresight Value:** Stories relevant to understanding future trends or risks.
       * **Uniqueness:** Give weight to important stories that might be less covered by other outlets (though you only see ${publisherName}'s feed here, use your general knowledge).
       * **Recency:** Newer items are generally preferred, but significance overrides recency for major topics.
   * **Be Selective:** Do not feel obligated to return ${maxItems} if fewer items meet the significance threshold. Quality over quantity!

# IMPORTANT Constraints:
* **Filter Noise First:** Apply the relevance filter strictly.
* **De-duplicate Ruthlessly:** Only keep the best single item per core event *from this list*.
* **Prioritize Significance:** Apply the final selection criteria thoughtfully. Keep impactful stories, even if seemingly niche at first glance.
* **If Unsure (Borderline Relevance/Significance):** Lean towards keeping the item during the initial relevance filter, but be critical during the final Top-${maxItems} selection.

# Input Format:
A list of news items from ${publisherName}, each with URL, Title, Description, Published Date.

# Output Format: JSON Only
You **MUST** provide your response **ONLY** as a single, valid JSON object matching the schema. The object must contain a single key, \`keptUrls\`, which is an array of the **exact URLs** of the final selected news items. The array should be **ordered by perceived importance** (most important URL first).

**Strict JSON Schema:**
json
${JSON.stringify(zodToJsonSchema(curatedPublisherUrlsSchema), null, 2)}

Do not include explanations or text outside the JSON object.`;

  const userPrompt = `# News Items from ${publisherName} to Curate:\n${formattedNewsList}\n\n# Instruction:\nPlease curate these items according to all instructions. Return **ONLY** the JSON object containing the final ordered array of kept URLs (max ${maxItems}), conforming strictly to the schema.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  try {
      const response = await structuredLlm.invoke(messages);

    if (response && Array.isArray(response.keptUrls)) {
      const originalUrls = new Set(newsItems.map(item => item.url));
      const validatedUrls = response.keptUrls.filter(url => {
          if (!originalUrls.has(url)) {
              console.warn(`[PublisherCurator] LLM for ${publisherName} returned a URL not in the original input: ${url.substring(0, 50)}...`);
              return false;
          }
          return true;
      });
       if (validatedUrls.length > maxItems) {
           console.warn(`[PublisherCurator] LLM for ${publisherName} returned more URLs (${validatedUrls.length}) than requested (${maxItems}). Truncating.`);
           return validatedUrls.slice(0, maxItems);
       }
      return validatedUrls;
    } else {
      console.error(`[PublisherCurator] Invalid response structure from LLM for ${publisherName}:`, response);
      return []; // Return empty on invalid structure
    }
  } catch (error) {
    console.error(`[PublisherCurator] Error during LLM invocation for ${publisherName}:`, error);
    return [];
  }
};


/**
 * Groups news items by publisher and applies curation to each group.
 *
 * @param {Array<object>} allNewsItems - All fetched news items.
 * @param {number} maxItemsPerPublisher - Max items to keep per publisher.
 * @returns {Promise<Array<object>>} - Filtered and curated list of news items.
 */
export const curateSourcesPerPublisher = async (allNewsItems, maxItemsPerPublisher = DEFAULT_MAX_ITEMS_PER_PUBLISHER) => {
    const itemsByPublisher = allNewsItems.reduce((acc, item) => {
        const key = item.publisherKey || 'unknown'; // Use publisherKey added during scraping
        if (!acc[key]) {
            acc[key] = { publisherName: item.publisher || 'Unknown Publisher', items: [] };
        }
        acc[key].items.push(item);
        return acc;
    }, {});

    const curatedItemsMap = new Map(); // Use map to preserve original items easily
    const curationTasks = [];

    // Prepare curation tasks for each valid publisher
    for (const key in itemsByPublisher) {
        const { publisherName, items } = itemsByPublisher[key];
        if (key === 'unknown' || !publisherName || publisherName === 'Unknown Publisher') {
             console.warn(`[CuratePerPublisher] Skipping curation for items with unknown publisher key/name: ${key}`);
             continue;
        }
        curationTasks.push({
            publisherName,
            items,
            promise: curatePublisherFeed(items, publisherName, maxItemsPerPublisher)
        });
    }

    // Execute all curation tasks in parallel and wait for them to settle
    const settledResults = await Promise.allSettled(curationTasks.map(task => task.promise));

    // Process the results of each settled promise
    settledResults.forEach((result, index) => {
        const task = curationTasks[index]; // Get the corresponding task metadata
        const { publisherName, items } = task;

        if (result.status === 'fulfilled') {
            const keptUrls = result.value;
            if (Array.isArray(keptUrls)) {
                const keptUrlsSet = new Set(keptUrls);
                items.forEach(item => {
                    if (keptUrlsSet.has(item.url)) {
                        curatedItemsMap.set(item.url, item);
                    }
                });
            } else {
                // Handle unexpected fulfillment value (should ideally be array based on curatePublisherFeed)
                console.error(`[CuratePerPublisher] Unexpected successful result type for ${publisherName}:`, keptUrls);
                 console.warn(`[CuratePerPublisher] Curation may have failed for ${publisherName}. Adding all its original items as fallback.`);
                 items.forEach(item => curatedItemsMap.set(item.url, item));
            }
        } else { // status === 'rejected'
            console.error(`[CuratePerPublisher] Error processing publisher ${publisherName}:`, result.reason);
            // Fallback: Add all original items for this publisher if curation failed
            console.warn(`[CuratePerPublisher] Curation failed for ${publisherName}. Adding all its original items as fallback.`);
            items.forEach(item => {
                curatedItemsMap.set(item.url, item);
            });
        }
    });


    const finalCuratedItems = Array.from(curatedItemsMap.values());
    return finalCuratedItems;
};

// test curateSourcesPerPublisher
const testCurateSourcesPerPublisher = async () => {
    // import scrapeFeeds    using await import
    const {scrapeFeeds} = await import('../scrapers/index.js');

  const allNewsItems = await scrapeFeeds(['tagesschau', 'cbc'], true);
  const curatedItems = await curateSourcesPerPublisher(allNewsItems);
  console.log(`Curated items: ${curatedItems.length}`);
};
// testCurateSourcesPerPublisher();