import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import dotenv from 'dotenv';
dotenv.config();


const GEMINI_MODEL = 'gemini-2.5-pro-preview-03-25';

const lineupSchema = zodToJsonSchema(z.object({
  stories: z.array(z.object({
    priority: z.number().int().min(0),
    relevance: z.string().describe('Relevance of the story, should be one of: "critical", "important", "relevant", "noteworthy", "misc"'),
    title: z.string().describe('Concise, informative title. For updates, should reflect the *new* development.'),
    description: z.string().describe("Brief explanation (2-4 sentences) of why the story/update is important. If it's an update, clearly explain what was previously reported and what is new."),
    update: z.boolean().describe('Whether the story is an update to an existing article. If true, the story is an update and the updateArticleId field is required.'),
    sources: z.array(z.object({
      title: z.string().describe('Original title from the source news item.'),
      url: z.string().describe('Original URL from the source news item.'),
      publisher: z.string().describe('Publisher of the source news item.'),
      description: z.string().optional().describe('Optional: Original description from the source.'),
      publishedDate: z.string().optional().describe('Optional: Original published date string from the source item.'),
    })).min(1).describe("List of relevant source news items supporting the story or *update*. Order by importance."),
    notes: z.string().optional().describe('Internal editorial notes: Reasoning for selection/priority, source assessment, potential angles, etc.'),
    updatedArticleId: z.string().optional().describe('If update is true, provide the _id of the existing Lightcone Article being updated. Otherwise, omit or leave null.'),
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

const callLineupCreator = async (newsItems, existingArticles = [], archivedArticles = []) => {

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
--- Current newsfeed item ${index + 1} ---
_id: ${article._id}
Title: ${article.title}
precis: ${article.precis || 'N/A'}
sources: ${article.sources.map(source => source.url).join(', ') || 'N/A'}
updatedAt: ${article.updatedAt || 'N/A'}
status: ${article.status || 'N/A'}
`
    )
    .join('\\n');

  const formattedArchivedArticles = archivedArticles
    .map(
      (article, index) => `
--- Archived Article ${index + 1} ---
_id: ${article._id}
Title: ${article.title}
summary: ${article.summary || 'N/A'}
updatedAt: ${article.updatedAt || 'N/A'}
status: ${article.status || 'N/A'}`
    )
    .join('\\n');

  const systemPrompt = `# Role: Chief Editor for Lightcone.news

# Context:
You are the chief editor creating the news lineup for Lightcone.news, an aggregator focusing on **important** global stories. Readers seek understanding of significance and trajectory ('where the world is going'). Your goal is to intelligently update the *existing* news feed by adding truly new stories or significant updates to already published ones.

# Philosophy:
Adhere strictly to: **extreme clarity, conciseness, directness, factual accuracy, intellectual honesty.** Prioritize **signal over noise**. Avoid sensationalism, clickbait, and trivial news. Target an intelligent audience seeking substance.

# Vibe tags:
Apart from the core directives and the style guide, which give clear guidance, it might be useful to list a few more associations that might help you determine what lightcone news is about: Epistemic tools, Rationalism, Slow and Fast thinking, Superforecasting, Bayesian updating, Existential risk, Existential hope, Clarity, Precision, Intellectual honesty, Long-term perspective, Probabilistic thinking, Systems thinking, Signal vs. Noise, Scenario analysis, Critical thinking, Data-driven, Nuance, Global perspective, Constructive, Forward-looking, Sensemaking, Foresight, Accuracy, Objectivity, Context, Consequences, Trajectories, Evidence-based, Uncertainty quantification, Strategic intelligence, European perspective, Brussels, Geopolitics, Diplomacy, Conflict resolution, Cooperation, Detached analysis, Objective observer, Complex systems, Pragmatism, Oxford, Cambridge, Rigor, Strategic foresight.

# Input:
1.  \`Existing Lightcone Articles List\`: Articles *already published* on Lightcone.news (includes _id, Title, precis, sources).
2.  \`Archived Lightcone Articles List\`: Articles *already archived* on Lightcone.news (includes _id, Title, precis).
3.  \`Scraped News Article List\`: Recent news items scraped from different publishers. The news sites scraping happens multiple times per day, so the list is always changing with some new stories, but also signficant overlap with the previous list.


# Tasks:

Your primary goal is to decide what makes it into the lightcone news lineup, based on novelty and significance *relative to what's already published*. The lineup is created multiple times per day. There are multiple, partially conflicting principles, that you need to balance. You should think extremely hard about these:

## Guiding Principles:

a) Publish the most important global stories. Do not publish stories that are not important or significant.
b) Report timely and update existing stories, if there is significant new information.
c) Updates to existing stories should not be based on a single new source, but rather on a combination of new sources and significant new information or developments.
d) Do not repeat stories that have already been published and archived (Clarification: in rare circumstances, it can be fine to update a story multiple times, if it continues to develop and remains important, but once all versions of the story have been archived, we should avoid re-publishing the same story unless something truly unique and exceptional happened. Otheriwse we risk confusing the readers).
e) Lightcone news is a news *aggregator*. Avoid publishing stories based on a single source or based on a single publisher (unless there is a very good reason to do so).
f) Rather than the number of *individual source articles* reporting the same story, you should focus on the number of *publishers* reporting the same story. If there are multiple articles from just one publisher, we usually shouldn't include it in the lineup.
g) While Lightcone news is updated multiple times per day, and it's important to update existing stories, we should also keep in mind that we should not overwhelm the reader with too many updates and new stories: for the duration of a new cycle, the lineup should not dramatically change multiple times. Unless many truly important developments happen, the lineup should be relatively stable over the course of a day (but not longer).


## Process:

1. First, review the 'Scraped News Article List' - without even looking at the other lists. Group sources from \`New Items List\` that cover the same new event/development. Extract a list of the top 10-20 most important stories (following the lightcone news philosophy) - let's call this list 'Tentative New Items List'. Prioritize based on global impact, significant developments, future trend insights. Lower priority for regional stories unless they are major updates to existing high-priority articles. Generating this list is the most important part of the process and should be done with extreme care and attention to detail.

2. Next, compare the 'Archived Articles List' with the 'Current Newsfeed List' and make a list of topics that are no longer covered by the current newsfeed (i.e. they are archived AND no version is in the current newsfeed). Let's call this list 'Topics to be Removed from Newsfeed'.

3. Then, scratch all the topics in the 'Topics to be Removed from Newsfeed' from the 'Tentative New Items List'.

4. Now, compare the 'Tentative New Items List' with the 'Existing Articles List'. If there is a topic in the 'Tentative New Items List' that is already in the 'Existing Articles List', evaluate if it's a significant update (check sources and developments). If it is, add it to the 'Tentative New Items List'. If it's not, remove it from the 'Tentative New Items List'. Note: it is rarely worth updating an existing article only because 1-2 new sources have been published. Instead, review if the sources hint at a significant development or new information. Never include more than *10* new story ideas for the final lineup - if you have more than 10, focus on the most important ones.

5. Now, you have a list of new items that you should consider for the lineup. This list is your 'Final New Items List'.

6. Process each item in the 'Final New Items List':

* Order the list by priority: the most important global stories should be at the top. While Lightcone audience is mostly based in Europe and the US, we should not always assume that US > Europe > Rest of the World, but rather focus on the importance of the story and the global impact (e.g. a story about a major development in China should be given the same priority as a story about a minor development in the US).

* Select relevant sources: Include at least two sources from different publishers; avoid giving multiple sources from the same publisher (unless there is a very good reason to do so); prioritise recent and relevant sources. It's important to pick sources from different publishers and vary the order of sources to avoid the impression of a biased selection, and to reflect the diversity of the sources from which we are selecting.

* For each story, outline what it is about and state why it is important.

* For updates, clearly articulate **what is new, why the update is significant, and what specific parts of the existing article might need revision based on the new sources**.

# Output format:
You are passing back a JSON object (be careful with quotation marks) in the following format:
\`\`\`json
${JSON.stringify(lineupSchema, null, 2)}
\`\`\`

## Output Structure: additional guidance for each selected story:
    *   \`priority\`: Rank (0 = highest).
    *   \`relevance\`: use one of the following: "critical", "important", "relevant", "noteworthy", "misc".
    *   \`title\`: Concise title reflecting the *new* development for updates.
    *   \`description\`: explain relevance of the story and summarise the story. **Crucially for updates:** outline previous context (implicitly referencing the existing story) AND clearly articulate **what is new, why it is significant, and what specific parts of the existing article might need revision based on the new sources**.
    *   \`update\`: Boolean indicating if this is an update to an existing article.
    *   \`sources\`: List relevant source items from \`New Items List\` (and the old sources in case of an update). Include \`title\`, \`url\`, \`publisher\`, optional \`description\`, \`publishedDate\`. Order by importance. Must have at least one source.
    *   \`notes\` (Optional): Your reasoning, source assessment, instructions, or any other notes that may be useful for the journalists or the research assistants who will be working on the story.
    *   \`updatedArticleId\`: **Required if \`update\` is true**. Provide the \`ID\` from the \`Existing Articles List\`. Omit otherwise.`;

  const userPrompt = `# Existing Lightcone Article List (Currently included in Lightcone.news newsfeed):
${formattedExistingArticles || 'No existing articles provided.'}

# Archived Lightcone Article List (Previously included in Lightcone.news newsfeed and now archived):
${formattedArchivedArticles || 'No archived articles provided.'}

# Scraped News Article List (Scraped from External Sources):
${formattedNewsList || 'No new items provided.'}

-----
# Task:
You are the chief editor. Analyze the \`Scraped News Article List\` in relation to the \`Existing Lightcone Article List\` and the \`Archived Lightcone Article List\`. Identify significant new stories or updates. Provide the structured JSON object 'stories', adhering to all instructions in the system prompt.`;


  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  const response = await structuredLlm.invoke(messages);
  return { stories: response?.stories || [] };
};

export { callLineupCreator };

