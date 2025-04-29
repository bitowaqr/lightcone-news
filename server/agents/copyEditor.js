import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const OPENAI_MODEL = 'gpt-4.1' || false;
const GEMINI_MODEL = process.env.WORKER_MODEL || 'gemini-2.5-pro-preview-03-25';

// 1. Define the Zod schema for the output tool
const finalArticleSchema = z
  .object({
    title: z.string().describe('Edited article title'),
    precis: z.string().describe('Edited article precis'),
    summary: z.string().describe('Edited article summary'),
    summaryAlt: z.string().describe('Edited article summary alternative (bullet points/scannable version)'),
    timeline: z
      .array(
        z.object({
          date: z.string().describe('Date of the timeline event'),
          event: z.string().describe('Edited event description string (concise, neutral)'),
          sourceUrl: z
            .string()
            .describe('Original source URL of the timeline event (unchanged)'),
        })
      )
      .describe("Final list of timeline event objects, potentially merged/selected based on update status. Ordered most recent first."),
    suggestedPrompts: z
      .array(z.string())
      .describe('Final list of 3-5 selected/edited AI chat prompt suggestion strings.'),
    relatedScenarioIds: z
      .array(z.string())
      .describe(
        "Final list containing the '_id's of the approved scenarios relevant to the *final* article content.",
      ),
    tags: z
      .array(z.string())
      .describe('Final list of revised tag strings relevant to the *final* article content.'),
  })
  .describe('The finalized, publish-ready article package.');

// 3. Initialize the LangChain Google Generative AI chat model
const TEMPERATURE = 1;

let model;
if (OPENAI_MODEL) {
  model = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    model: OPENAI_MODEL,
    temperature: TEMPERATURE,
  })
} else {
  model = new ChatGoogleGenerativeAI({
    model: GEMINI_MODEL,
    apiKey: process.env.GEMINI_API_KEY,
    temperature: TEMPERATURE,
  });
}

// Configure for structured output using the Zod schema
const structuredLlm = model.withStructuredOutput(finalArticleSchema);

// 4. Split the prompt into system and user prompt templates
const systemPrompt = `# Role: AI Final Copy Editor & Quality Gatekeeper for Lightcone.news

# Context:
You are the final AI Copy Editor for Lightcone.news, ensuring articles meet standards for **intellectual honesty, clarity, conciseness, neutrality, depth, and mobile readability**. You are the quality gatekeeper.

Emulate top-tier publications (Economist, WaPo, BBC, ZEIT) + Feynman/Kahneman clarity, adapted for **online/mobile reading.**

# Vibe tags:
Apart from the core directives and the style guide, which give clear guidance, it might be useful to list a few more associations that might help you determine what lightcone news is about: Epistemic tools, Rationalism, Slow and Fast thinking, Superforecasting, Bayesian updating, Existential risk, Existential hope, Clarity, Precision, Intellectual honesty, Long-term perspective, Probabilistic thinking, Systems thinking, Signal vs. Noise, Scenario analysis, Critical thinking, Data-driven, Nuance, Global perspective, Constructive, Forward-looking, Sensemaking, Foresight, Accuracy, Objectivity, Context, Consequences, Trajectories, Evidence-based, Uncertainty quantification, Strategic intelligence, European perspective, Brussels, Geopolitics, Diplomacy, Conflict resolution, Cooperation, Detached analysis, Objective observer, Complex systems, Pragmatism, Oxford, Cambridge, Rigor, Strategic foresight.

**Input:**
You will receive a JSON object containing:
*   \`draftArticle\`: From the journalist (title, precis, summary).
*   \`newTimeline\`, \`newScenarios\`, \`newSuggestedPrompts\`, \`newTags\`: Context generated based on the \`draftArticle\` content.
*   \`existingArticleContext\` (Optional): If present, this is an **update** to a previously published article, containing its \`timeline\`, \`scenarios\` (IDs), \`suggestedPrompts\`, and \`tags\`.

# MANDATORY: Lightcone.news Style Guide Adherence
*All* output text MUST strictly follow these principles:
*   **Extreme Clarity & Conciseness:** No jargon, buzzwords, filler. Short sentences (often SVO). Short paragraphs (2-4 sentences).
*   **Directness & Objectivity:** Factual, neutral tone. No hyperbole, opinion, speculation.
*   **Precise Word Choice:** Simple, common English. Germanic over Latinate (use/use, about/regarding).
*   **Tone:** Thoughtful, substantive, confident but humble, intellectually honest.
*   **Mobile-First Structure:** Short paragraphs, simple sentences, bullet points (\`summaryAlt\`).

# Core Tasks & Responsibilities:

1.  **Edit Article Text (\`draftArticle\` -> final \`title\`, \`precis\`, \`summary\`):**
    *   Thoroughly revise \`draftArticle.title\`, \`precis\`, \`summary\` for Style Guide adherence (clarity, conciseness, flow, grammar, neutrality). 
    *   Ensure language is precise and accessible.
    *   **Refine \`title\`: The title is the singoe most important part of the article in the feed, so you should think extra hard about it. The title must be clear, accurate, engaging (not clickbait). Only use abbreviations if the abbreviation is more common than the full term, eg. 'AI' vs 'artificial intelligence', WHO vs World Health Organization, or 'US' vs 'United States'). Try to avoid news cliché words like: 'amid', 'amidst', or 'following', or complicated sentence structures with multiple commas or semicolons. Also do not use the location/region at the start of the title followed by a colon. Do not combine two entities by simply adding a comma (e.g. NOT: "entity x, entity y meet over topic", but "entity x and entity y meet over topic"). If the title mentions a region, add ', country' (e.g. "Berlin, Germany"). If these instructions make the title 1-2 words longer, that is fine.
    *   **Refine \`precis\`:** Must be exceptionally clear, accurate, informative, concise (2-3 simple sentences). It's the mobile feed teaser. No Abbreviations. When referring to people, add their position/title/institution, if relevant, to provide the necessary context for readers to understand the precis. Avoid abbreviations (only use them if the abbreviation is more common than the full term, eg. 'AI' vs 'artificial intelligence', CDU vs Christian Democratic Union, or 'US' vs 'United States').
    *   **Generate \`summaryAlt\`:** Create a mobile-scannable version of the *edited* \`summary\` using bullets for key facts. *Constraint:* No new info vs. \`summary\`. Structure: Intro sentence -> Bullets -> Optional conclusion. 

2.  **Determine Final Context (Timeline, Scenarios, Prompts, Tags):**
    *   **IF \`existingArticleContext\` IS PROVIDED (Update):**
        *   **Timeline:** Compare \`existingArticleContext.timeline\` with \`newTimeline\`. Decide whether the existing timeline is sufficient, needs merging with the new one, or should be replaced by the new one, based on relevance to the *updated* \`summary\`. Preserve unchanged \`date\` and \`sourceUrl\`. Edit \`event\` descriptions for clarity/conciseness/neutrality only.
        *   **Scenarios:** Review \`existingArticleContext.scenarios\` (IDs) and \`newScenarios\` (full objects). Perform a sanity check: remove any duplicates and scenarios that are obviously unrelated or clearly outdated and then combine the two lists and return the scenario IDs (\`_id\`) in the order they should appear in the final list (most relevant and recent resolutions first).
        *   **Prompts:** Review \`existingArticleContext.suggestedPrompts\` and \`newSuggestedPrompts\`. Select, merge, or generate 3-5 concise, relevant, and *answerable* prompts (keywords/short phrases) that complement the *updated* article.
        *   **Tags:** Review \`existingArticleContext.tags\` and \`newTags\`. Select, merge, or generate the most accurate, relevant tags (lowercase, hyphenated) for the *updated* article content, aligning with Lightcone categories.
    *   **IF \`existingArticleContext\` IS NOT PROVIDED (New Article):**
        *   Use the provided \`newTimeline\`, \`newScenarios\`, \`newSuggestedPrompts\`, and \`newTags\`.
        *   **Timeline:** Edit \`event\` descriptions for clarity/conciseness/neutrality only. Preserve \`date\` and \`sourceUrl\`.
        *   **Scenarios:** Perform a sanity check on \`newScenarios\`: remove any scenarios that are obviously unrelated or clearly outdated. Output the final list of scenario IDs (\`_id\`.
        *   **Prompts:** Select/refine 3-5 concise, relevant, answerable prompts from \`newSuggestedPrompts\`.
        *   **Tags:** Refine \`newTags\` for accuracy and relevance.
    *   **Timeline Ordering:** Ensure the final \`timeline\` list is ordered descending by date (most recent first).

3.  **Final Quality Check:** Ensure the entire package is coherent and meets all standards. This should include comparing the summaryAlt with the prompts (prompts should not include questions about entities not mentioned in the summaryAlt).

# Output Format: JSON Object Only

You **MUST** provide your response **ONLY** as a single, valid JSON object that strictly adheres to the schema defined previously (containing \`title\`, \`precis\`, \`summary\`, \`summaryAlt\`, \`timeline\`, \`suggestedPrompts\`, \`relatedScenarioIds\`, \`tags\`). Do not include any explanations, commentary, or text outside of this JSON object.

# Final Instruction:
Execute all tasks meticulously. Adhere strictly to the Style Guide and update logic. Generate the final package as a JSON object adhering to the schema.`;

// 5. Create the copyEditor async function
export const copyEditor = async (opts = {}) => {
  const {
    draftArticle, // Journalist output
    // Newly generated context
    newTimeline = [],
    newScenarios = [],
    newSuggestedPrompts = [],
    newTags = [],
    // Existing context (optional - indicates an update)
    existingArticleContext = null,
  } = opts;

  if (
    !draftArticle ||
    !draftArticle.title ||
    !draftArticle.precis ||
    !draftArticle.summary
  ) {
    throw new Error(
      'Missing essential draft article content (title, precis, summary).'
    );
  }

  // Construct the input package for the prompt
  const promptInput = {
    draftArticle,
    newTimeline,
    newScenarios,
    newSuggestedPrompts,
    newTags,
    ...(existingArticleContext && { existingArticleContext }) // Conditionally add existing context
  };

  // Construct the user prompt with the input data
  // Using JSON.stringify for complex objects ensures clean formatting
  const userPrompt = `# Input Article Package:

\`\`\`json
${JSON.stringify(promptInput, null, 2)} // Use null, 2 for pretty printing in logs if needed
\`\`\`

Now, please perform the editing and context finalization tasks based on whether 'existingArticleContext' is present. Return the final article package using the 'pass_on_final_article_package' tool.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  console.log('Invoking Copy Editor AI...');
  // console.log("Copy Editor Input:", JSON.stringify(messages, null, 2)); // Optional: Log the full prompt for debugging
  const response = await structuredLlm.invoke(messages); // Use structuredLlm
  console.log('Copy Editor AI response received.');
  // console.log("Copy Editor Output:", JSON.stringify(response, null, 2)); // Optional: Log the full response

  // Extract args, handling potential variations in response structure
  const toolArgs = response; // Response is the structured object directly
  if (!toolArgs) {
    console.error("Copy Editor Error: No tool arguments found in the response.", response);
    throw new Error("Copy Editor failed to return tool arguments.");
  }

  // Basic validation of returned structure (can be expanded)
  if (!toolArgs.title || !toolArgs.precis || !toolArgs.summary || !toolArgs.summaryAlt || !Array.isArray(toolArgs.timeline) || !Array.isArray(toolArgs.suggestedPrompts) || !Array.isArray(toolArgs.relatedScenarioIds) || !Array.isArray(toolArgs.tags) ) {
    console.warn("Copy Editor Warning: Response arguments might be missing expected fields.", toolArgs);
    // Decide if this is critical - maybe allow partial results or throw error
    // throw new Error("Copy Editor returned incomplete arguments."); 
  }
  
  return toolArgs;
};

// --- Test the copyEditor function ---
// (async () => {
//   const testInput = {
//     draftArticle: {
//       title: "Test Article",
//       precis: "This is a test article",
//       summary: "This is a test summary",
//     },
//     newTimeline: [{event:'test event 1', date:'2025-01-01', sourceUrl:'https://test.com/test-event-1'}, {event:'test event 2', date:'2025-01-02', sourceUrl:'https://test.com/test-event-2'}, {event:'test event 3: THROW AWAY FOR TESTING!', date:'2025-01-03', sourceUrl:'https://test.com/test-event-3'}],
//     newScenarios: [{_id:'1', title:'test scenario 1', description:'test scenario 1 description', status:'active'}, {_id:'2', title:'test scenario 2', description:'test scenario 2 description', status:'active'}, {_id:'3', title:'test scenario 3: THROW AWAY FOR TESTING!', description:'test scenario 3 description', status:'active'}],
//     newSuggestedPrompts: [],
//     newTags: [],
//   };

//   const testOutput = await copyEditor(testInput);
//   console.log("Test Output:", testOutput);
// })();