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
    .describe('A concise, engaging, neutral title for the generated article. For updates, revise the existing title only if the new information fundamentally changes the core story.'),
  precis: z
    .string()
    .describe(
      '2-3 sentence objective but intriguing summary, to be shown as teaser for the article in the main feed. For updates, integrate the new key information concisely.'
    ),
  summary: z
    .string()
    .describe(
      '2-5 paragraphs synthesizing the key information from the provided sources. Written in an extremely clear, concise language, following the Lightcone Style Guide. For updates, integrate the new facts from the *new* usable sources into the existing summary provided, maintaining flow and coherence. Rewrite sections only where necessary to accurately reflect the updated situation.'
    ),
  notes: z
    .string()
    .describe(
      'Optional notes for the editor. For updates, briefly mention that this is an update and what the key changes were.'
    )
    .optional(),
  sourceUrls: z
    .array(z.string())
    .describe(
      "A list of the original source article URLs that were substantially used to generate this report's summary. For updates, this should include *both* the relevant original sources *and* the new sources that contributed to the update."
    ),
});

export const callJournalist = async (story, sourceArticles = [], existingArticle = null) => {
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
You are an AI agent tasked with creating a draft article for Lightcone.news, focusing on **significant global stories**, **extreme clarity, conciseness, factual accuracy, journalistic neutrality, and intellectual honesty**. Prioritize **signal over noise**. We have a global, english-speaking audience. We are based in Europe and our audience is mostly European and from the United States.

# Vibe tags:
Apart from the core directives and the style guide, which give clear guidance, it might be useful to list a few more associations that might help you determine what lightcone news is about: Epistemic tools, Rationalism, Slow and Fast thinking, Superforecasting, Bayesian updating, Existential risk, Existential hope, Clarity, Precision, Intellectual honesty, Long-term perspective, Probabilistic thinking, Systems thinking, Signal vs. Noise, Scenario analysis, Critical thinking, Data-driven, Nuance, Global perspective, Constructive, Forward-looking, Sensemaking, Foresight, Accuracy, Objectivity, Context, Consequences, Trajectories, Evidence-based, Uncertainty quantification, Strategic intelligence, European perspective, Brussels, Geopolitics, Diplomacy, Conflict resolution, Cooperation, Detached analysis, Objective observer, Complex systems, Pragmatism, Oxford, Cambridge, Rigor, Strategic foresight.


# CORE DIRECTIVES (MANDATORY):
1.  **ABSOLUTE FACTUALITY:** Base your report **strictly and exclusively** on the information explicitly present within the usable 'Scraped Source Articles' provided.
2.  **ZERO HALLUCINATION:** **DO NOT** invent, assume, infer, or extrapolate any information not directly stated in the usable sources.
3.  **JOURNALISTIC NEUTRALITY:** Present facts objectively. Avoid speculation, opinion, bias, or loaded language.
4.  **FOCUS ON USABLE CONTENT:** Only process and use content from sources that have been successfully scraped and contain relevant information. Ignore sources marked as failed or empty.

# Input:
You will receive:
1.  An overall 'Story Context' (Title, Description, potentially indicating it's an update).
2.  A collection of 'Scraped Source Articles'.
3.  Potentially, an 'Existing Article Content' section if this task is an **update** to a previously published article.

# Task: Synthesize a Draft Article or Update an Existing One

**IF THIS IS A NEW ARTICLE (No 'Existing Article Content' provided):**
*   Synthesize the factual information **found only within the usable source articles** into a single, coherent, concise, and objective draft article following the 'Synthesis Process' below.

**IF THIS IS AN UPDATE ('Existing Article Content' IS provided):**
*   Your goal is to **integrate the new information** from the 'Scraped Source Articles' into the 'Existing Article Content'.
*   **Focus on the Update:** Identify the *new* facts, developments, figures, etc., present in the *new* usable sources that were *not* in the original article.
*   **Integrate, Don't Just Replace:** Carefully weave the new, verified facts into the existing \`title\`, \`precis\`, and \`summary\`. 
    *   Revise the \`title\` only if the update represents a fundamental shift in the story.
    *   Update the \`precis\` to reflect the latest key information.
    *   Modify the existing \`summary\` paragraphs to incorporate the new facts, ensuring accuracy, flow, and coherence. Add new paragraphs or restructure only if essential to accommodate the new information clearly.
*   **Maintain Existing Correct Information:** Do not remove factual information from the existing article unless it is directly contradicted by newer information in the usable sources.
*   **Base Changes ONLY on Sources:** All additions or modifications *must* be directly supported by explicit information in the 'Scraped Source Articles' provided for this update.
*   **Source Attribution:** The final \`sourceUrls\` field must include URLs from *both* the original article (if they remain relevant to the updated content) *and* the new sources that provided the updated information.

## Synthesis Process (Apply to New Articles and Updates):
1.  **Analyze Usable Sources:** Carefully read all provided source content *that does not indicate a scraping failure or lack of content*. Identify core facts, developments, figures, etc.
2.  **Identify the Core Narrative:** Determine the central factual story (or the key *update* to the existing story) supported by the *consensus* or *union* of information across usable sources.
3.  **Synthesize, Don't Just List:** Weave the verified facts into a unified, logical narrative. Structure information logically (e.g., chronologically, thematically).
4.  **Prioritize and Select Facts:** Include only the most relevant and significant facts *explicitly found* in the usable sources. Omit trivial details.
5.  **Adapt Structure:** Use paragraphs, optional subheadings, or bullet points within the \`summary\` as appropriate for clarity. For updates, preserve the existing structure where possible.

# Language and Style:
* **Language:** English (UK).
* **Style:** Emulate high standards of clarity, conciseness, directness, and objectivity (e.g., Reuters, AP, BBC World Service, The Economist). Serious, neutral, informative tone. Simple sentence structures (main clauses, main+subordinate).

# Output: JSON Format Only

You **MUST** provide your response **ONLY** as a single, valid JSON object strictly adhering to the following schema:

**Strict JSON Schema:**
\`\`\`json
${JSON.stringify(zodToJsonSchema(articleSchema), null, 2)}
\`\`\`

**Key fields explained:**
*   \`title\`: Headline. For updates, revise existing title only if fundamental change.
*   \`precis\`: 1-2 sentence teaser. For updates, integrate new key info.
*   \`summary\`: Main body. For updates, integrate new facts into existing text.
*   \`notes\`: Optional. For updates, note the key changes.
*   \`sourceUrls\`: List of *all* URLs substantially contributing to the *final* version (original + new for updates).

Do not include any explanations, commentary, or text outside of the single JSON object.

# Final Instruction:
Adhere strictly to all directives. Process the provided context, sources, and existing article (if applicable). Generate the best possible factual synthesis or update, providing it **only** as a JSON object matching the schema.`;

  // Conditionally add existing article content to the user prompt
  let existingArticleContent = '';
  if (existingArticle) {
      existingArticleContent = `\n\n# Existing Article Content (To Be Updated):\nTitle: ${existingArticle.title}\nPrecis: ${existingArticle.precis}\nSummary:\n${existingArticle.summary}\nExisting Source URLs: ${existingArticle.sourceUrls?.join(', ') || 'None'}\n`;
  }

  const userPrompt = `# Story Context:\nOriginal Title: ${story.title}\nOriginal Description: ${story.description} ${story.update ? '(This is an UPDATE to an existing article)' : ''}\n${existingArticleContent}\n# Scraped Source Articles:\n${sourcesMd}\n\n# Task:\nPlease analyze the sources${existingArticle ? ' and the Existing Article Content' : ''}. Synthesize the key information${existingArticle ? ' to UPDATE the existing article' : ' into a NEW draft article'}. Provide the result **ONLY** as a single JSON object conforming strictly to the schema provided in the system instructions.`;

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
