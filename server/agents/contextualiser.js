import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { zodToJsonSchema } from "zod-to-json-schema";
import dotenv from 'dotenv';
dotenv.config();

  const GEMINI_MODEL = process.env.WORKER_MODEL || 'gemini-2.5-pro-preview-03-25';
// const GEMINI_MODEL = 'gemini-2.0-flash';

// --- Zod Schema for Structured Output ---
const contextualiserOutputSchema = z.object({
    scenarios: z
      .array(
        z.object({
          _id: z
            .string()
            .describe(
              '_id of the scenario'
            ),
          reason: z
            .string()
            .optional()
            .describe(
              '1-2 sentences explaining relevance of the scenario to the article.'
            ),
        })
      )
    .describe('Scenarios to be presented next to the article.'),
  scenariosExcluded: z.array(z.object({
    _id: z.string().describe('_id of the scenario'),
    reason: z.string().describe('Reason for exclusion'),
  })).describe('Scenarios that were considered but excluded'),
  timeline: z
      .array(
        z.object({
          date: z.string().describe('YYYY-MM-DD or YYYY-MM or YYYY, depending on source data and context (more recent events should have YYYY-MM-DD, while events >10 years ago can be YYYY only)'),
          event: z.string().describe('The event that occurred on the date'),
          sourceUrl: z
            .string()
            .optional()
            .describe('The source url of the event'),
        })
      )
      .describe('The timeline of the article'),
    prompts: z
      .array(z.string())
      .describe('AI Chat Prompts suggestions for the article'),
    tags: z.array(z.string()).describe('The tags for the article'),
  });

const model = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
  temperature: 0.3,
  apiKey: process.env.GEMINI_API_KEY,
});

export const contextualiser = async (opts = {}) => {
  let {
    articleMd,
    timeline,
    scenarios,
    numberOfPrompts = 20,
    numberOfTags = 10,
  } = opts;

  if (!articleMd) throw new Error('No article');
  if (!timeline) console.warn('No timeline info');
  if (typeof timeline === 'object') timeline = JSON.stringify(timeline);
  if (!scenarios) console.warn('No scenarios');
  if (typeof scenarios === 'object') scenarios = JSON.stringify(scenarios);
  // Configure model for structured output
  const structuredLlm = model.withStructuredOutput(contextualiserOutputSchema);

  const systemPrompt = `# Role: AI Content Augmentation Agent for Lightcone.news

# Context:
You are an AI agent assisting Lightcone.news, an AI-powered news platform focused on providing deep context (historical timeline, related future scenarios, AI chat) for curated global news. Your goal is to process input related to a specific news article and generate supplementary content components that enhance reader understanding.

**Your operations and output must strictly adhere to the overarching Lightcone.news philosophy: prioritize extreme clarity, conciseness, directness, factual accuracy, and intellectual honesty. Target an intelligent, informed audience seeking substance.**

Today is ${new Date().toISOString().split('T')[0]}.

# Input:
You will receive the following data:
1.  "Article": The text content of the news article.
2.  "Potentially Relevant Scenarios": scenarios related semantically to the article. Each scenario has a title or question, meta data (consisting of volume, liquidity, platform, distance to article, where lower distance means the scenario is semantically more similar), description, and tags.
3.  "Timeline": Optional information for a historical timeline, each should contain a date, event description, and optional source URL.

# Tasks:
Perform the following tasks based on the input, keeping the target audience and tone in mind:

1.  **Select & Order Relevant Scenarios:**
    * Filter Scenarios and select the most relevant ones. 
    * The **sole criteria** for inclusion are a) **plausible causality**, b) **joint underlying cause**, or other c) **plausible causal linkages** (even if indirectly).
    * Be **critical and intellectually honest**. Discard any scenario where the causal link is purely coincidental, or non-existent. Reflect the target audience's preference for signal over noise. Example: For an article on a US-China tariff agreement, do *not* include a scenario about China winning a sports championship, even if tagged 'China'.
    * If in doubt, err on the side of including scenarios. 
    * Sometimes, there will be no relevant scenarios, and you should output an empty list.
    * ORDERING: the order if scenarios is very important. For the ordering, use the following criteria, in this order of importance:
      1) Relevance: if the scenarios is directly related to the article, it should definitely be first. The 'distance' to the article only gives you an indication of how semantically similar the scenario is to the article. You need to use your judgement to determine if the scenario is actually relevant to the article. The question is not whether 'topics are related' but if the readers gets useful additional context from the scenario and its probabilistic forecast, that helps them to better understand and contextualise the story covered in the article.
      2) Uncertainty: A scenario is useful it it helps users to navigate uncertainty. Scenarios with 100% or 0% probability are already resolved, and may be part of the article already or covered in other news. Thus, prioritise scenarios with a probability between 1% and 99%!
      3) Timeline: if there are multiple instanced of the same scenario, order them by the date of the event (will event x happen by May, will event y happen by June, will event z happen by July, etc).
      3) Distance to article (lower distance means the scenario is semantically more similar)
      4) Ticker (if available)
      5) Tags (if available)
      

2.  **Review Timeline (If Applicable):**
    * Evaluate timeline information. Generate a new timeline **only if** it provides useful contextual information that helps the user better understand or contextualize the event in "Article".
    * **Omit the timeline entirely** if the historical context is trivial, generally considered common knowledge, irrelevant (e.g., a simple accident report), or if no data was provided. Do not create a timeline merely to fill space or state the obvious.
    * If possible without losing important information, make each event description more concise. Use extremely clear,  direct language.
    * Format *each* timeline point as: { "date": "YYYY-MM-DD or description", "event": "Concise event description", "sourceUrl": "URL or null" }. Only use the "sourceUrl" if provided in the input data for that event.
    * Output this as a list of these formatted event objects. If no timeline is generated, output an empty list ([]) or null.

3.  **Suggest AI Chat Prompts:**
    * Generate **${numberOfPrompts} concise (3-5 words ideally)** 'Prompt Suggestions' for the article's AI chat feature.
    * These prompts should target **additional factual context or clarification** that a reader might ask themselves while or after reading the Article (note: the prompts should be about the article, not the scenarios or the timeline).
    * When generating the prompts, there is a delicate balance to strike: on the one hand, the prompts should be intriguing, providing additional context that helps the reader better understand and contextualize the article. On the other hand, the questions behind the prompts must be simple enough that an ai chatbot with access to the internet can reliably provide a completely satisfactory answer in 1-2 short paragraphs.
    * Good examples: "Who is [specific not widely known person mentioned]?", "What does a [political position not widely known] do?", "How did [Company mentioned] stock perform yesterday?" - depending on the article, these prompts may provide useful additional context, and can be reliably answered by an ai chatbot with access to the internet.
    * Bad examples: "What is the imact of [event] on [country]?", "Does [country] have geopolitical influence on [other country]?", "What were the consequences of [political decision] on education levels?" - these may be interesting questions, but a chatbot won't be able to provide a good answer, and the reader will be left with a feeling of dissatisfaction or even frustration.
    * When suggesting prompts, try to already consider what an answer could look like - you don't need to know or provide the answer, just consider what effort would be required, and how likely an ai chatbot with access to the internet will be able to provide a good answer.
    * **Apart from that, a few simpler directions, do NOT suggest prompts for:**
        * Information already clearly present in the article.
        * Extremely basic knowledge ("What is the UN?", "Who is the US President?"). Avoid anything potentially condescending.
        * Vague or overly broad questions.
        * Questions that an ai chatbot with access to the internet will not be able to answer with a web search and in 1-2 short paragraphs.
    * Output these as a list of strings.

4.  **Suggest Tags:**
    * Generate ${numberOfTags} super concise (1–2 words ideally) tags for the article.
    * Extract tags from the article's core topics, key names, significant events, or prominent locations.
    * The tags should be specific enough to assist with embedding retrieval and search, avoiding overly generic terms.
    * Examples might include: "economy", "trade", "US-China", "tariffs", "policy".
    * Output these tags as a list of strings.

# General Tone & Style Guidelines (Apply to all judgments and output):
  * **Clarity & Conciseness:** Use the simplest language possible to convey meaning accurately. Eliminate filler words and jargon. Be direct.
  * **Objectivity & Accuracy:** Focus on facts. Ensure timeline events are stated neutrally. Ensure scenario relevance is judged on plausible causality, not speculation.
  * **Audience Awareness:** Assume an intelligent reader. Provide value by adding relevant context or clarification, not by stating the obvious or including tangentially related information.

# Output: JSON Format Only

You **MUST** provide your response **ONLY** as a single, valid JSON object. This object must strictly adhere to the following structure, containing the results of your analysis:

**Strict JSON Schema:**
\`\`\`json
${JSON.stringify(zodToJsonSchema(contextualiserOutputSchema))}
\`\`\`

Do not include any explanations, commentary, or text outside of this single JSON object conforming to the schema.`;

  const userPrompt = `Here is the article, which is the main content to be contextualised with additional information:

# Article
${articleMd}

---
Now I will provide you with some additional context that needs review and editorial processing:

# Timeline
${timeline ?? 'No timeline data available.'}

# Potentially Relevant Scenarios
${scenarios ?? 'No scenarios available.'}

Now, please perform the tasks outlined in the system instructions. Provide your response **only** as a single JSON object conforming strictly to the specified schema.`;

  const messages = [
    {role: 'system',content: systemPrompt},
    { role: 'user', content: userPrompt }
  ];
  const response = await structuredLlm.invoke(messages);
  return response;
};

// // test
// const test = async () => {
//   const articleMd = `Musk kritisiert Trump-Berater
// "Navarro ist dümmer als ein Sack Ziegel"
// Stand: 08.04.2025 20:52 Uhr
// Das von den USA ausgelöste Zollchaos sorgt für offenen Streit unter den Beratern von Präsident Trump. Tech-Milliardär Elon Musk nannte den Architekten der Zollpolitik, Navarro, einen "Idioten". Dieser hatte zuvor Musks Firma Tesla kritisiert.Tech-Milliardär Elon Musk eskaliert seine Fehde mit dem Architekten von Donald Trumps Zoll-Rundumschlag mit öffentlichen Beschimpfungen. Peter Navarro sei "wirklich ein Idiot" und "dümmer als ein Sack Ziegel", schrieb Musk auf seiner Online-Plattform X. Navarro sagte Elon sei ein Esel.`;
//   const timeline  = [
//     {
//       date: '1949-07-15',
//       event: 'Peter Navarro was born in Cambridge, Massachusetts.',
//       sourceUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWQVqAJHr3Rx220OF4AqBph3Hg-9-vZ_k0xKCzImnXAHrXDYyQNk3Blz3zL8IoR3mV37kbbewETECT8zQAGhnmwDTrFK-UNQbPHt0f4KaiHDs4bIJjh0CVH668iIeJVmOx8r8TjwP15i9w=='
//     },
//     {
//       date: '2016',
//       event: "Peter Navarro joined Donald Trump's presidential campaign as an economic advisor.",
//       sourceUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWQVqAJzu5jPACdFAFTtoNl6_phud3j2qZyDJFjlM-rxXKhqJA4pLbHOMJVi9m1KwaqCeog2F4wALxsOfAShqj79irerQ5h2YZnGpsU-t_Vn-LE2ODXG2EfMnhnGZfxI2ur7ber-'
//     },
//     {
//       date: '2017-01',
//       event: 'Peter Navarro joined the Trump administration as an advisor on trade.',
//       sourceUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWQVqAJHr3Rx220OF4AqBph3Hg-9-vZ_k0xKCzImnXAHrXDYyQNk3Blz3zL8IoR3mV37kbbewETECT8zQAGhnmwDTrFK-UNQbPHt0f4KaiHDs4bIJjh0CVH668iIeJVmOx8r8TjwP15i9w=='
//     },
//     {
//       date: '2018',
//       event: 'Navarro, as Director of Trade and Industrial Policy, advocated for tariffs and opposed trade deals, pushing Trump to wage a trade war.',
//       sourceUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWQVqAJzu5jPACdFAFTtoNl6_phud3j2qZyDJFjlM-rxXKhqJA4pLbHOMJVi9m1KwaqCeog2F4wALxsOfAShqj79irerQ5h2YZnGpsU-t_Vn-LE2ODXG2EfMnhnGZfxI2ur7ber-'
//     },
//     {
//       date: '2024-01-25',
//       event: 'Peter Navarro was sentenced to four months in prison for contempt of Congress after refusing to comply with a subpoena from the House Select Committee investigating the January 6th Attack on the U.S. Capitol.',
//       sourceUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWQVqAKnmv66D0Av2Tgsk_JOpEXFxCYeh7C95i9Qb0e4Ow32YkXqZyiK9yZJU8DKN64HaHnv3cWM-Ww279NpCnv42r9EJq3PXUdO4XlAhSl0e2TJDr1a3Pvc3xj_UxJkRbllP-X-6m-3_eOAlXD_rX-gwfZR5pjSshH6QEXkZB4wvTe3tFsIJWH0z9eMV2sicKG7PdyUMi_dfeDY3T_njdWzrmaeqQQujojxEihSRX4EXsSM'
//     },
//     {
//       date: '2025-02-10',
//       event: 'President Trump issued proclamations modifying steel and aluminum tariffs, increasing the tariff rate on aluminum articles from 10% to 25% for all countries except Russia.',
//       sourceUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWQVqALB8PVn9xSUOdACglJrVrQtPgEzGaZ1uojXROtJURHBzosC90vDCSNBoVScSycKwmT934Njsa0CoUczT8yG14RvRUFCJfjuvaxGT6iocxCgKE5ZHhZX1pVmXpIOOoB2IAvW2v4Ogp9pnQwNGBdvd8lSXt1eNyJgxk-zc52b2673VZRc6d5fu8aLrSqGJqRpj8pPSdWQUwARIpkycicR2_wLajuyzU6JsWPgz7NKeIg5W5LIy_eK'
//     },
//     {
//       date: '2025-04-06',
//       event: "Elon Musk advocated for a transatlantic free trade zone with zero tariffs between Europe and North America, despite President Trump's commitment to his tariff policy.",
//       sourceUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWQVqALL3Gj_UpXkPQZRkrjTKqpSMIeoqwrmHZ2mIxDioHrFmWDq-5xJ24grz8b9QtEiRc4-DUZmI9sfMqwo8G3_-fXnf8TRZrcsS1TM7ouatsmMVD20-9OH-KHrOBC-TQRK3OwMPD7tiN7SL90dAVbZmVffT16xAtDD8VRjmZe59YV6N8Ibsvg='
//     },
//     {
//       date: '2025-04-08',
//       event: 'Navarro suggested that Tesla needed cheap foreign parts for its electric cars, and that Tesla was not really a car manufacturer but only assembled vehicles from foreign supplies, sparking outrage from Musk.',
//       sourceUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWQVqAKB6AJQRp0cHmqo_Aca_xlsDaOrhh1oauncfHGXVTEyO0SMPFAauZt6wPbs-QeGlhOQKAQ8L8bSL47TVkF_MdJvSLPlK6ksGCZV_oud7D7MIyZVPZ1_k-YMYVP061sUAQpZecfls40PM8upZRCwEwL8zHid5D1xv_U='
//     },
//     {
//       date: '2025-04-08',
//       event: `Elon Musk criticized Peter Navarro, calling him an "idiot" and "dumber than a sack of bricks" on his platform X, due to the ongoing dispute over Trump's tariff policies and Navarro's criticism of Tesla.`,
//       sourceUrl: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AWQVqAKB6AJQRp0cHmqo_Aca_xlsDaOrhh1oauncfHGXVTEyO0SMPFAauZt6wPbs-QeGlhOQKAQ8L8bSL47TVkF_MdJvSLPlK6ksGCZV_oud7D7MIyZVPZ1_k-YMYVP061sUAQpZecfls40PM8upZRCwEwL8zHid5D1xv_U='
//     }
//   ]
//   const scenarios = [
//     {
//       _id: '1',
//       reason: 'Will Musk publicly apologize to Navarro?',
//     },
//     {
//       _id: '2',
//       reason: 'Trump out as President before May 2026?',
//     },
//     {
//       _id: '3',
//       reason: 'Japan Tariffs on Chinese goods increase before June?',
//     },
//     {
//       _id: '4',
//       reason: 'EU Tariffs on US goods?',
//     },
//     {
//       _id: '5',
//       reason: 'US-China trade war escalates before June?',
//     },
//     {
//       _id: '5',
//       reason: 'Angelina Jolie and Brad Pitt get back together?',
//     },
//   ]
//   const response = await contextualiser({
//     articleMd,
//     timeline: JSON.stringify(timeline),
//     scenarios: JSON.stringify(scenarios),
//   });
//   console.log(response);
// };

// test();
