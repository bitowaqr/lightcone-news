import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import dotenv from 'dotenv';
import { formatRelativeTime } from '../utils/formatRelativeTime.js';
dotenv.config();

const GEMINI_MODEL = process.env.WORKER_MODEL ||  'gemini-2.5-pro-preview-03-25';

// --- LLM Tool Definition ---
// const passOnLineupTool = new tool(
//   async ({ stories }) => ({ stories }),
//   {
//     name: 'pass_on_stories_for_lineup',
//     description:
//       'Passes the selected and structured stories for the news lineup, distinguishing between new stories and updates to existing ones.',
//     schema: z.object({
//       stories: z
//         .array(
//           z.object({
//             priority: z
//               .number()
//               .int()
//               .min(0)
//               .describe(
//                 'Priority ranking (0 = highest/show first). Lower numbers are higher priority.'
//             ),
//             relevance: z
//               .string()
//               .describe(
//                 'Relevance of the story, should be one of: "critical", "important", "relevant", "noteworthy", "misc"'
//               ),
//             title: z
//               .string()
//               .describe(
//                 'Concise, informative title. For updates, should reflect the *new* development.'
//               ),
//             description: z
//               .string()
//               .describe(
//                 "Brief explanation (2-4 sentences) of why the story/update is important. If it's an update, clearly explain what was previously reported and what is new."
//               ),
//             sources: z
//               .array(
//                 z.object({
//                   title: z
//                     .string()
//                     .describe(
//                       'Original title from the source news item.'
//                     ),
//                   url: z
//                     .string()
//                     .describe(
//                       'Original URL from the source news item.'
//                     ),
//                   publisher: z
//                     .string()
//                     .describe(
//                       'Publisher of the source news item.'
//                     ),
//                   description: z
//                     .string()
//                     .optional()
//                     .describe(
//                       'Optional: Original description from the source.'
//                     ),
//                    publishedDate: z
//                     .string()
//                     .optional()
//                     .describe(
//                       'Optional: Original published date string from the source item.'
//                     ),
//                 })
//               )
//               .min(1)
//               .describe("List of relevant source news items supporting the story or *update*. Order by importance."),
//             notes: z
//               .string()
//               .optional()
//               .describe(
//                 'Internal editorial notes: Reasoning for selection/priority, source assessment, potential angles, etc.'
//               ),
//             updatedArticleId: z
//               .string()
//               .optional()
//               .describe(
//                 'If relevance is "update", provide the _id of the existing Lightcone Article being updated. Otherwise, omit or leave null.'
//               ),
//           })
//         )
//         .describe("An array of story objects selected for the lineup."),
//     }),
//   }
// );
const lineupSchema = zodToJsonSchema(z.object({
  stories: z.array(z.object({
    priority: z.number().int().min(0),
    relevance: z.string().describe('Relevance of the story, should be one of: "critical", "important", "relevant", "noteworthy", "misc"'),
    title: z.string().describe('Concise, informative title. For updates, should reflect the *new* development.'),
    description: z.string().describe("Brief explanation (2-4 sentences) of why the story/update is important. If it's an update, clearly explain what was previously reported and what is new."),
    sources: z.array(z.object({
      title: z.string().describe('Original title from the source news item.'),
      url: z.string().describe('Original URL from the source news item.'),
      publisher: z.string().describe('Publisher of the source news item.'),
      description: z.string().optional().describe('Optional: Original description from the source.'),
      publishedDate: z.string().optional().describe('Optional: Original published date string from the source item.'),
    })).min(1).describe("List of relevant source news items supporting the story or *update*. Order by importance."),
    notes: z.string().optional().describe('Internal editorial notes: Reasoning for selection/priority, source assessment, potential angles, etc.'),
    updatedArticleId: z.string().optional().describe('If relevance is "update", provide the _id of the existing Lightcone Article being updated. Otherwise, omit or leave null.'),
  })).describe("An array of story objects selected for the lineup."),
}),
);

// --- LLM Configuration ---

const model = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
  temperature: 0.3,
  apiKey: process.env.GEMINI_API_KEY,
})
const structuredLlm = model.withStructuredOutput(lineupSchema);

// --- Main Agent Function ---

const callLineupCreator = async (newsItems, existingArticles = []) => {

  const formattedNewsList = newsItems
    .map(
      (item, index) => `
--- Scraped News Article ${index + 1} ---
Title: ${item.title || 'N/A'}
Publisher: ${item.meta?.publisher || 'N/A'}
URL: ${item.url || 'N/A'}
Description: ${item.description || 'N/A'}
Published: ${item.meta?.publishedDate || 'N/A'}
`
    )
    .join('\\n');

  const formattedExistingArticles = existingArticles
    .map(
        (article, index) => `
--- Existing Lightcone Article / current newsfeed item ${index + 1} ---
_id: ${article._id}
Title: ${article.title}
summary: ${article.summary || 'N/A'}
`
    )
    .join('\\n');


  const systemPrompt = `# Role: Chief Editor for Lightcone.news

# Context:
You are the chief editor creating the news lineup for Lightcone.news, an aggregator focusing on **important** global stories with **deep context (past, present, future)**. Readers seek understanding of significance and trajectory ('where the world is going'). Your goal is to intelligently update the *existing* news feed by adding truly new stories or significant updates to already published ones.

# Philosophy:
Adhere strictly to: **extreme clarity, conciseness, directness, factual accuracy, intellectual honesty.** Prioritize **signal over noise**. Avoid sensationalism, clickbait, and trivial news. Target an intelligent audience seeking substance.

# Input:
1.  \`Existing Lightcone Articles List\`: Articles *already published* on Lightcone.news (includes _id, Title, summary).
2.  \`Scraped News Article List\`: Recent news items scraped from various sources (BBC, Al Jazeera, etc.).

# Core Task: Compare & Curate
Review *both* lists. Your primary goal is to decide what makes it into today's lineup based on novelty and significance *relative to what's already published*.

1.  **Analyze & Compare:**
    *   For each \`New Item\`, determine if it represents:
        *   A) A **genuinely new story** (topic/event not covered in \`Existing Articles List\`).
        *   B) A **significant update** to an \`Existing Article\`. (Requires substantial new info, major event turn, critical new context. Minor follow-ups or re-reporting the same facts are NOT significant).
        *   C) Information already covered or trivial/irrelevant news (Discard these).
2.  **Select & Prioritize:**
    *   Select stories corresponding to (A) and (B).
    *   Prioritize based on global impact, significant developments, future trend insights. Lower priority for regional stories unless they are major updates to existing high-priority articles.
    *   Group sources from \`New Items List\` that cover the *exact same new event/development*.
3.  **Structure Output (Using Tool):** For each selected story:
    *   \`priority\`: Rank (0 = highest).
    *   \`relevance\`: Use "update" for type (B) stories. Otherwise, categorize importance (e.g., "critical", "important", "relevant", "noteworthy", "misc").
    *   \`title\`: Concise title reflecting the *new* development for updates.
    *   \`description\`: 2-4 sentences explaining importance. **Crucially for updates:** Briefly state previous context (implicitly referencing the existing story) AND clearly articulate **what is new**.
    *   \`sources\`: List relevant source items from \`New Items List\` supporting the story *or the update*. Include \`title\`, \`url\`, \`publisher\`, optional \`description\`, \`publishedDate\`. Order by importance. Must have at least one source.
    *   \`notes\` (Optional): Your reasoning, source assessment, etc.
    *   \`updatedArticleId\`: **Required if \`relevance\` is "update"**. Provide the \`ID\` from the \`Existing Articles List\`. Omit otherwise.

# Output format:
You are passing back a JSON object (be careful with quotation marks) in the following format:
${JSON.stringify(lineupSchema)}

# Final Instruction:
Process the \`New Items List\` considering the \`Existing Articles List\`. Return the curated lineup using the tool, focusing on adding value beyond current publications.
  `;

  const userPrompt = `
# Existing Lightcone Article List (Recently Published on Lightcone.news):
${formattedExistingArticles || 'No existing articles provided.'}

# Scraped News Article List (Scraped from External Sources):
${formattedNewsList || 'No new items provided.'}

# Task:
You are the chief editor. Analyze the \`Scraped News Article List\` in relation to the \`Existing Lightcone Article List\`. Identify significant new stories or updates. Provide the structured JSON object 'stories', adhering to all instructions in the system prompt. Focus on novelty and significance relative to what is already published.
  `;


  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const response = await structuredLlm.invoke(messages);
  console.log(response.stories);
  return { stories: response?.stories || [] };
};

export { callLineupCreator };

