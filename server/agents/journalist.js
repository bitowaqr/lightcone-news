import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { scrapedSourceToMd } from '../scrapers/index.js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

// const GEMINI_MODEL = 'gemini-2.0-flash';
// const GEMINI_MODEL = 'gemini-2.5-pro-exp-03-25';
// const GEMINI_MODEL = 'gemini-2.5-pro-preview-03-25';
// const OPENAI_MODEL = 'gpt-4.1';
const MODEL = process.env.WORKER_MODEL || 'gemini-2.5-pro-preview-03-25'

// --- Zod Schema for Structured Output ---
const articleSchema = z.object({
  title: z
    .string()
    .describe('A concise, engaging, neutral title for the generated article.'),
  precis: z
    .string()
    .describe(
      '2-3 sentence objective but intriguing summary, to be shown as teaser for the article in the main feed.'
    ),
  summary: z
    .string()
    .describe(
      '2-5 paragraphs synthesizing the key information from the provided sources. Written in an extremely clear, concise language, following the Lightcone Style Guide.'
    ),
  notes: z
    .string()
    .describe(
      'Optional notes for the editor and additional information for the editorial team and colleagues who will review the report and edit it.'
    )
    .optional(),
  sourceUrls: z
    .array(z.string())
    .describe(
      "A list of the original source article URLs that were substantially used to generate this report's summary. Only include sources that directly contributed information."
    ),
});

export const callJournalist = async (story, sourceArticles = []) => {
  if (!story || !story.title) {
    throw new Error('Story must have a title');
  }
  if (!sourceArticles || sourceArticles.length === 0) {
    throw new Error('Story must have at least one source');
  }

  // --- LLM Configuration ---
  // const model = new ChatOpenAI({
  //     model: OPENAI_MODEL,
  //     temperature: 0.3,
  //     apiKey: process.env.OPENAI_API_KEY,
  // });
  const model = new ChatGoogleGenerativeAI({
    model: MODEL,
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.3,
  });

  // Configure for structured output
  const structuredLlm = model.withStructuredOutput(articleSchema);

  // Prepare source content
  const sourcesMd = sourceArticles
    .map((s, index) => scrapedSourceToMd(s, index))
    .join('\n\n');

  // --- Prompts ---
  const systemPrompt = `# Role: AI Journalist for Lightcone.news 

# Context:
You are an AI agent tasked with creating a draft article for Lightcone.news. Our platform focuses on **significant global stories**, providing **extreme clarity, conciseness, factual accuracy, journalistic neutrality, and intellectual honesty**. We prioritize **signal over noise** for an intelligent audience seeking deep understanding.

# CORE DIRECTIVES (MANDATORY):
1.  **ABSOLUTE FACTUALITY:** Base your report **strictly and exclusively** on the information explicitly present within the usable 'Scraped Source Articles' provided. Synthesize facts directly from the available text.
2.  **ZERO HALLUCINATION:** **DO NOT** invent, assume, infer, or extrapolate any information, details, quotes, figures, names, causes, consequences, or connections not directly stated in the usable sources. If the information isn't there, don't include it.
3.  **JOURNALISTIC NEUTRALITY:** Present facts objectively. Avoid speculation, opinion, bias, or loaded language. Your role is to synthesize *what the sources report*, not to interpret or add your own analysis. Acknowledge significant discrepancies between usable sources neutrally (e.g., "Source A reported X, whereas Source B stated Y,").
4.  **FOCUS ON USABLE CONTENT:** Only process and use content from sources that have been successfully scraped and contain relevant information. Ignore sources marked as failed or empty.

# Input:
You will receive:
1.  An overall 'Story Title' and 'Story Description' (for initial context only).
2.  A collection of 'Scraped Source Articles', each with its URL, Publisher, Date, and Content (or an indication of scraping failure).

# Task: Synthesize a Draft Article

Synthesize the factual information **found only within the usable source articles** into a single, coherent, concise, and objective draft article.

## Synthesis Process:
1.  **Analyze Usable Sources:** Carefully read all provided source content *that does not indicate a scraping failure or lack of content*. Identify the core event(s), key developments, figures, locations, and significant details reported.
2.  **Identify the Core Narrative:** Determine the central factual story supported by the *consensus* or *union* of information across usable sources.
3.  **Synthesize, Don't Just List:** Weave the verified facts from **multiple usable sources** (where applicable) into a unified, logical narrative. Do not simply list points from each source sequentially. Structure the information logically (e.g., chronologically, thematically) to enhance clarity.
4.  **Prioritize and Select Facts:** Include only the most relevant and significant facts *explicitly found* in the usable sources. Omit trivial details.
5.  **Attribute Appropriately (If Necessary):** While synthesizing, direct attribution within the text is usually unnecessary unless highlighting specific conflicting points or highly unique information tied to one source. The main attribution happens in the 'sources' field of the output.
6.  **Adapt Structure to Content:** The length and structure of the \`summary\` should reflect the amount and complexity of the verified information available.
    * For concise topics based on limited source material, 1-2 paragraphs might suffice.
    * For more complex events with richer source material, use multiple paragraphs (e.g., 3-5).
    * **Use subheadings within the \`summary\`** if it significantly improves clarity for longer or multi-faceted reports. Subheadings should be concise and factual.
    * Alternatively, use bullet points within the \`summary\` if that format best presents the specific type of information (e.g., lists of key figures, specific outcomes).

# Language and Style:
* **Language:** English (UK).
* **Style:** Emulate the high standards of clarity, conciseness, directness, and objectivity found in top international news agencies (e.g., Reuters, AP, BBC World Service) and respected factual reporting (e.g., The Economist). The tone should be serious, neutral, and informative. Think precision and accessibility, like the clear communication style of rigorous thinkers. Sentences structure should be simple: prefer mainclauses and mainclause+subclause structures, and avoid complex sentence structures.

# Output: JSON Format Only

You **MUST** provide your response **ONLY** as a single, valid JSON object. This object must strictly adhere to the following structure, representing the synthesized draft article:

**Strict JSON Schema:**
\`\`\`json
${JSON.stringify(zodToJsonSchema(articleSchema), null, 2)}
\`\`\`

**Key fields explained:**
*   \`title\`: A concise, neutral, factual headline reflecting the core event synthesized *only* from the usable source information.
*   \`precis\`: A 1-2 sentence teaser for the article to be shown in the main feed.
*   \`summary\`: The main body of the report. Present the synthesized facts *derived strictly from the usable sources*. Structure adaptively (paragraphs, optional subheadings, bullet points) as described in the 'Synthesis Process'.
*   \`notes\`: A brief status note. Indicate if the report is based on multiple sources, a single source, or if usable information was very limited. E.g., "Synthesized from 3 usable sources.", "Based on single usable source.", "Limited information available in usable sources."
*   \`sourceUrls\`: A list of the original source article URLs that were **successfully processed and factually contributed** to the report.

Do not include any explanations, commentary, or text outside of the single JSON object conforming to the schema.

# Final Instruction:
Adhere strictly to all directives. Process the provided context and scraped sources. Generate the best possible factual synthesis based *only* on the usable source text and provide it **only** as a JSON object matching the specified schema.`;

  const userPrompt = `# Story Context:
Original Title: ${story.title}
Original Description: ${story.description}

# Scraped Source Articles:
${sourcesMd}

# Task:
Please read and deeply analyze these sources, synthesize the key information, and then write a concise and objective draft article. Provide the result **ONLY** as a single JSON object conforming strictly to the schema provided in the system instructions.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

    const response = await structuredLlm.invoke(messages);
    
    if (!response.title || !response.precis || !response.summary) {
        console.log(response);
        throw new Error('Journalist Agent failed to generate a valid article');
    }
    // add story meta to the response
    response.storyTitle = story.title;
    response.storyId = story._id || null;
    response.storyDescription = story.description || null;
    response.relevance = story.relevance || 'misc';
    response.lineupId = story.lineupId || null;
    response.priority = story.priority || 99;
    response.storyNotes = story.notes || null;

  return response;
};

// // // Example Usage (requires a sample story object)
// const runTest = async () => {
//   // import scrapeArticles
//   const { scrapeArticles } = await import('../scrapers/index.js');
//   const fs = await import('fs');
//   // Load a sample story from lineup.json or create one
//   const stories = JSON.parse(fs.readFileSync('lineup.json', 'utf-8')); // Assumes lineup.json is in the root
//   const sampleStory = stories[0];
//   const sourcesToScrape = sampleStory.sources.slice(0, 15);
//   console.log('scraping', sourcesToScrape.length, 'sources');
//   const sourceArticles = await scrapeArticles(sourcesToScrape);

//   try {
//     const draftArticle = await callJournalist(sampleStory, sourceArticles);
//     console.log('\n--- Generated Draft Article ---');
//     console.log(JSON.stringify(draftArticle, null, 2));
//     console.log('-----------------------------');
//     // Optionally write to file
//     fs.writeFileSync(
//       'draftArticle.json',
//       JSON.stringify(draftArticle, null, 2)
//     );
//   } catch (error) {
//     console.error('Journalist Agent test run failed:', error);
//   }
// };

// runTest(); // Uncomment to run test
