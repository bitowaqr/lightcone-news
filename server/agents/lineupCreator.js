import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const GEMINI_MODEL = process.env.WORKER_MODEL ||  'gemini-2.5-pro-preview-03-25';

// --- LLM Tool Definition ---
const passOnLineupTool = new tool(
  async ({ stories }) => ({ stories }),
  {
    name: 'pass_on_stories_for_lineup',
    description:
      'Pass on the structured news stories for the lineup with sources.',
    schema: z.object({
      stories: z
        .array(
          z.object({
            priority: z
              .number()
              .int()
              .min(0)
              .describe(
                'Priority ranking of the story in the lineup (0 = show first in feed).'
            ),
            relevance: z
              .string()
              .describe(
                'Relevance of the story, should be one of: "critical", "important", "relevant", "noteworthy", "misc"'
              ),
            title: z
              .string()
              .describe(
                'A concise, engaging title for the overall news story narrative.'
              ),
            description: z
              .string()
              .optional()
              .describe(
                "A brief (1-2 sentence) description summarizing the overall story's significance according to Lightcone objectives."
              ),
            sources: z
              .array(
                z.object({
                  title: z
                    .string()
                    .describe(
                      'The original title of the source news item reporting this event.'
                    ),
                  url: z
                    .string()
                    .describe(
                      'The URL of the source news item reporting this event.'
                    ),
                  publisher: z
                    .string()
                    .describe(
                      'The publisher of the source news item reporting this event.'
                    ),
                  description: z
                    .string()
                    .optional()
                    .describe(
                      'The original description/teaser of the source news item.'
                    ),
                  publishedDate: z
                    .string()
                    .optional()
                    .describe(
                      'The original published date of the source news item.'
                    ),
                })
              ),
            notes: z
              .string()
              .optional()
              .describe(
                'Any additional notes or comments about the story, including why it was selected and any other information that may be relevant for the editorial team.'
              ),
          })
        ),
    }),
  }
);

// --- LLM Configuration ---

const model = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
  temperature: 0.3, // Lower temperature for more focused selection
  apiKey: process.env.GEMINI_API_KEY,
}).bindTools([passOnLineupTool]);

const callLineupCreator = async (newsItems) => {
  const formattedNewsList = newsItems
    .map(
      (item, index) => `
--- Item ${index + 1} ---
Title: ${item.title}
Publisher: ${item.meta?.publisher || 'N/A'}
URL: ${item.url}
Description: ${item.description || 'N/A'}`
    )
    .join('\n');

  // 3. Define LLM Prompts
  const systemPrompt = `
  # Role: Chief Editor for Lightcone.news
  
  # Context:
  You are the chief editor responsible for creating the daily news lineup for Lightcone.news. Lightcone is a news aggregator that prioritizes **important** news stories with potential long-term significance, providing **deep context (past, present, future)**. Readers turn to Lightcone to understand what news are important and why, and 'where the world is going'.
  
  # Objectives:
  Your goal is to review what other news organizations are reporting on, and select and structure the most important news items for the Lightcone.news lineup.
  
  Adhere to Lightcone's philosophy: **extreme clarity, conciseness, directness, factual accuracy, and intellectual honesty.** Aim for **signal over noise**, targeting an intelligent audience seeking substance. Avoid sensationalism or trivial news.
  
  
  # Input:
  You will receive a list of recent news items scraped from various sources (e.g., Al Jazeera, Tagesschau, DW, BBC, France24, etc), formatted in markdown. Each item may include title, description, publisher, and source URL.
  
  # Task:
  1.  **Analyze & Select:** Review the entire list of news items. Select only **important and relevant stories** based on Lightcone's objectives. Prioritize stories with potential global impact, significant developments in ongoing issues, or events that offer insight into future trends. Also include **important** stories that only affect a specific region or country, if multiple sources are reporting on the same story, but give it a lower priority.
  2.  **Group Sources by Specific Events:** Group together news items that report on the exact same event or development (e.g., multiple sources covering the same peace talks). However, maintain separation between distinct events even if they relate to the same broader topic or region. For example, some trade negotiations between Poland and France, and a political scandal occurring in France should be treated as separate stories, each with their own title and description, as they represent different developments with unique implications and significance (unless there is a connection between the two events).
  3.  **Structure Output:** For each selected story:
      *   Assign a \`priority\` rank. Lower numbers mean higher priority (i.e. 0 = highest).
      *   Assign a \`relevance\` type.
      *   Create a concise, informative \`title\`.
      *   Write a brief (2-3 sentence) \`description\` explaining *why* this story is important.
      *  List all relevant \`sources\` for each story (ordered from most to least important). For each source, you **must** include the original \`title\`, \`url\`, \`publisher\`, and optionally the \`description\` from the input list.
  4.  Discard News items and sources that are trivial, local, or opinion pieces, that do not contribute to the overall story, that are clearly clickbait, sensational, or misleading. Lightcone only aggregates high-quality journalism and important news stories.
  
  # Tool Usage:
  You **MUST** use the \`pass_on_stories_for_lineup\` tool to return your final selection. The tool takes two arguments:
  1.  \`stories\`: An array of story objects, each containing \`priority\`, \`relevance\`, \`title\`, \`description\`, an array of \`sources\`, and \`notes\`.
  Do not output the lineup directly in your response; use the tool.
  
  # Example Story Structure (within the tool call):
  \`\`\`json
  {
    "priority": 0,
    "relevance": "important",
    "title": "US and China Hold High-Level Trade Talks",
    "description": "Signals potential shift in economic policy with global trade implications.",
    "sources": [
      {
            "title": "US Treasury Secretary meets Chinese counterpart in Geneva",
            "description": "Focus on tariff reductions and market access discussed.",
            "url": "http://example.com/news1",
            "publisher": "Al Jazeera",
          },
          {
            "title": "China Announces Pilot Program for Relaxed Foreign Investment Rules",
            "url": "http://example.com/news2",
            "publisher": "DW",
            "description": "New zones in Shanghai and Shenzhen mentioned.",
          }
      ],
      "notes": "This story is important because it is about a trade deal between the US and China. The two sources seem to express different views on the trade deal, which may be worth investigating further and reporting on. I also found two opinion pieces on the same story, which are not useful for the lineup and thus not included, but it seems to be a story that is currently trending, so I gave it a high priority."
  }
  \`\`\`
  
  # Final Instruction:
  Process the provided news list and return the curated lineup using the \`pass_on_stories_for_lineup\` tool.`

  const userPrompt = `# News Items List:
  ${formattedNewsList}
  
  # Task:
  You are the chief editor of Lightcone.news. Please analyze these items, select the most important stories according to Lightcone.news objectives, and provide the structured lineup using the \`pass_on_stories_for_lineup\` tool.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
    const response = await model.invoke(messages);
  return response?.tool_calls?.[0]?.args || {};
};

export { callLineupCreator };
