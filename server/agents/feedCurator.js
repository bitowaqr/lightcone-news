import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import dotenv from 'dotenv';
import { mongoService } from '../services/mongo.js'; // Assuming mongoService can fetch articles by status
import { formatRelativeTime } from '../../utils/formatRelativeTime.js'; // Use consistent relative time formatting

dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-pro-preview-03-25';
const MAX_FEED_SIZE = 30; 
const MAX_AGE_HOURS = 36; 
const NEWS_CYCLE_HOURS = 24;

// --- Zod Schema for Structured Output ---
const curatedArticleSchema = z.object({
  _id: z.string().describe('The MongoDB _id of the article being curated.'),
  currentStatus: z.string().describe('The current status of the article (e.g., DRAFT, PUBLISHED).'),
  currentPriority: z.number().optional().describe('The current priority of the article.'),
  newStatus: z
    .enum(['PUBLISHED', 'ARCHIVED', 'PENDING', 'REJECTED'])
    .describe('The proposed new status for the article.'),
  newPriority: z
    .number()
    .int()
    .min(0)
    .describe(
      'The proposed new priority (0 = highest/top of feed). Lower numbers are higher priority.'
    ),
  reasoning: z
    .string()
    .describe(
      'Brief explanation for the decision (e.g., "New critical story", "Archiving - superseded by update", "Archiving - old and lower relevance", "Adjusting priority for theme").'
    ),
  // For internal tracking, not for LLM decision directly but good for logging/DB update
  archiveOriginalArticleId: z.string().optional().describe('If this decision leads to publishing an update, this is the ID of the original article that should be archived. For LLM, this is informational.')
});

const feedCurationSchema = z.object({
  curatedFeed: z
    .array(curatedArticleSchema)
    .describe(
      'An array representing the entire processed set of articles, each with its proposed new status and priority.'
    ),
});

const model = new ChatGoogleGenerativeAI({
  model: GEMINI_MODEL,
  temperature: 0.4, // Slightly higher temp for more nuanced editorial judgment
  apiKey: process.env.GEMINI_API_KEY,
});

const structuredLlm = model.withStructuredOutput(feedCurationSchema);

// --- Feed Curator Agent ---

export const feedCurator = async () => {
  console.log('[FeedCurator] Starting feed curation process...');

  let draftArticles = [];
  let publishedArticles = [];
  try {
    console.log('[FeedCurator] Fetching DRAFT, PENDING and PUBLISHED articles...');
    // Fetch all articles that could be part of the feed or influence decisions
    draftArticles = await mongoService.getArticlesByStatus(['DRAFT', 'PENDING']);
    publishedArticles = await mongoService.getArticlesByStatus(['PUBLISHED']);
    console.log(`[FeedCurator] Fetched ${draftArticles.length} drafts/pending and ${publishedArticles.length} published articles.`);
  } catch (error) {
    console.error('[FeedCurator] Error fetching articles:', error);
    throw new Error('Failed to fetch articles for curation.');
  }

  const allArticlesToCurate = [...draftArticles, ...publishedArticles];

  if (allArticlesToCurate.length === 0) {
      console.log('[FeedCurator] No articles found to curate. Exiting.');
      return { curatedFeed: [] };
  }

  const formattedArticleList = allArticlesToCurate
    .map((article, index) => {
      const created = article.createdAt ? formatRelativeTime(article.createdAt) : 'N/A';
      const updated = article.updatedAt ? formatRelativeTime(article.updatedAt) : 'N/A';
      const published = article.publishedDate ? formatRelativeTime(article.publishedDate) : 'N/A';
      
      let updateInfo = '';
      if (article.replacesArticleId) {
        updateInfo = `(Intends to replace article ID: ${article.replacesArticleId})`;
      }
      if (article.isUpdate) { // Set by updateWriter if it merged content
        updateInfo += ` (Content already merged by updateWriter. Title is original.)`;
      }

      return `
--- Article ${index + 1} ---
_id: ${article._id}
Title: ${article.title}
Precis: ${article.precis}
Current Status: ${article.status}
Current Priority: ${article.priority ?? 'N/A'}
Relevance Score (from story): ${article.relevance || 'N/A'}
Is Merged Update (isUpdate flag): ${!!article.isUpdate}
Original Article to Replace (replacesArticleId): ${article.replacesArticleId || 'N/A'}
${updateInfo ? `Update Info: ${updateInfo}` : ''}
Created: ${created}
Updated: ${updated}
Published: ${published}
Tags: [${(article.tags || []).join(', ')}]
`;
    })
    .join('\n');

  const systemPrompt = `# Role: AI Newsfeed Curator for Lightcone.news

# Context:
You are the AI Chief Editor responsible for curating the main newsfeed of Lightcone.news. The platform focuses on **important global stories with deep context**, aiming for **signal over noise** and adhering to principles of **clarity, conciseness, intellectual honesty, and objectivity**. The target audience is intelligent and seeks substantive understanding of significant world events. 


# News cycle
The feed is updated multiple times per day. Despite the pace at which news breaks, Lightcone news tries to keep a ${NEWS_CYCLE_HOURS} hours news cycle and important news stories can stay relevant for the whole cycle.

Lightcone news has an audience in the USA and Europe. The feed is updated at around the following times:
- 1am EST / 7am CEST
- 4am EST / 9am CEST
- 7am EST / 1pm CEST
- 10am EST / 4pm CEST
- 1pm EST / 7pm CEST
- 4pm EST / 10pm CEST
- 7pm EST / 1am CEST
- 10pm EST / 4am CEST


TODAY IS ${new Date().toISOString().split('T')[0]} (${new Date().toLocaleDateString('en-US', { weekday: 'long' })}), it is ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'America/New_York' })} in New York (EST).

# Goal:
Your task is to process a list of DRAFT, PENDING, and currently PUBLISHED articles. You must decide the final state of the newsfeed by assigning a \`newStatus\` (\'PUBLISHED\', \'ARCHIVED\', \'PENDING\', or \'REJECTED\') and a \`newPriority\` to EVERY article. The output determines the front page.

# Core Curation Principles & Rules:

1.  **Freshness & Relevance:**
    *   The feed must be relevant, that is the most important goals, and feel current. Prioritize newer, significant stories.
    *   **Age Rule:** Articles older than ${MAX_AGE_HOURS} hours (based on \`Published\` or \`Created\` date if not published) are candidates for ARCHIVING unless they represent critical, ongoing situations. Use the relative time (\`Published\` / \`Created\`) provided. After ${MAX_AGE_HOURS} hours, they are almost always archived, (unless the article has been PENDING for a while and just recently got published). Use your best judgement here.
    *   **Relevance Score:** Use the \`Relevance Score (from story)\` as a strong indicator (\`critical\` > \`important\` > \`relevant\` > \`noteworthy\` > \`misc\`).

2.  **Integrate New Drafts:**
    *   Review DRAFT articles. If they are high quality and meet relevance/freshness criteria, set their \`newStatus\` to 'PUBLISHED' to integrate them into the curated feed.
    *   If they are high quality, but, considering all things, there is no place for them in the current feed, because other articles are more relevant at the moment, set their \`newStatus\` to 'PENDING' to queue them for future publication - in many cases, 'PENDING' articles will be published in the next round of curation, when other *PUBLISHED* articles become older / less relevant and move to be archived.
    *  If **DRAFT** articles are low quality, not relevant, or timely/outdated, if they contain factual or editorial errors, or if they are just not good, set their \`newStatus\` to 'REJECTED'.
    * 
3.  **Review Pending Articles:**
    *   **Pending articles** should be reviewed together with Draft articles using the same criteria. 
    *   Prioritize pending articles that have been pending for a while, if they are still relevant and high quality, and new drafts are not more relevant.
    *   However: Some pending articles may never get published, if the current feed is already full of relevant articles, and new drafts are consistently more relevant.

3.  **Handle Updates & Replacements (Critical):**
    *   **Scenario 1: Article with \`Is Merged Update: true\` (processed by updateWriter):**
        *   This article (let's call it 'Integrated Draft') has already incorporated new information into an older story. Its \`Title\` is the *original story's title*.
        *   The \`Original Article to Replace (replacesArticleId)\` field shows the ID of the actual original article.
        *   If you decide to set \`newStatus: 'PUBLISHED'\` for this 'Integrated Draft', you **MUST** ensure the original article identified by \`replacesArticleId\` is ARCHIVED (by setting its \`newStatus: 'ARCHIVED'\` in its own entry in the output array).
3.  **Handle Updates:**
    *   If a DRAFT article is marked as an **Update** (check \`Is Update?\` field and \`updatedArticleId\`), and you decide to PUBLISH it:
        *   Find the corresponding **original** PUBLISHED article (using the \`updatedArticleId\`).
        *   Set the \`newStatus\` of the **original** article to 'ARCHIVED'. Assign the update article a high priority, often taking the original's spot or higher.
    * Even if a DRAFT article is not marked as an update, and there is another PUBLISHED article that reports on the same issue, you need to check whether the new DRAFT article is directly or indirectly and update to the original story. The key question is: is it a great reading experience for our audience to read both the original and the update? If there is some overlap between the two articles, you should probably archive the original and publish the update, unless there is a very good reason not to.

4.  **Maintain Feed Cohesion & Size:**
    *   **Thematic Grouping:** Where possible, group related articles together using \`newPriority\`. For example, place all articles about a specific geopolitical conflict consecutively. Assign priorities sequentially within a theme. Use \`Tags\` to help identify themes.
    *   **Feed Size:** Aim for a feed size ideally around 15-20 articles, but be flexible. **Never exceed ${MAX_FEED_SIZE} PUBLISHED articles.** If too many articles qualify for 'PUBLISHED', be more critical about archiving older or less relevant ones. If few new stories are available, you can keep more older (but still relevant) articles published, but avoid a stale feed.
    *   **Prioritization:** Priority determines the order (0 is top). Assign priorities logically:
        *   Critical, breaking news: 0, 1, 2...
        *   Significant updates: Often take the priority of the article they replace or higher.
        *   Important ongoing stories: Follow critical news.
        *   Lower relevance/older stories: Higher priority numbers (further down the feed).
        *   Ensure priority numbers are sequential for the 'PUBLISHED' articles (e.g., 0, 1, 2, ..., N). Articles marked 'ARCHIVED' can have a non-sequential or default priority (e.g., 999).
        * Group articles with similar themes consecutively.

5.  **Decision Logic:**
    *   **Keep vs. Archive:** Primarily based on age, relevance, significance, and whether it's been superseded by an update. Lower relevance (\`noteworthy\`, \`misc\`) and older articles are the first candidates for 'ARCHIVED'.
    *   **Priority Assignment:** Based on relevance, freshness, thematic grouping, and update status. Critical/new stories get low numbers (top). Older/less relevant get higher numbers (bottom).
    *   **Flexibility:** If news flow is high, be aggressive in archiving. If slow, be more conservative, but always prune clearly outdated/irrelevant content. The goal is an optimal, informative feed *for today*.
    *   **Final note:** The primary goal is to provide an extremely high quality feed. All guidelines and rules are subject to this goal. If any of the rules seem to conflict with the goal, the goal should be followed.

6.  **Reasoning:** Provide a concise reason for each decision, especially for status changes or significant priority shifts.

# Input Format:
A list of articles, each with \`_id\`, \`Current Status\`, \`Current Priority\`, \`Title\`, \`Precis\`, \`Relevance Score\`, \`Is Update?\`, \`Created\`, \`Published\`, \`Tags\`.

# Output Format: JSON Only
You **MUST** provide your response **ONLY** as a single, valid JSON object conforming to the \`feedCurationSchema\`. This object must contain the \`curatedFeed\` array, where **every article** from the input list is represented with its \`_id\`, \`currentStatus\`, \`currentPriority\`, **proposed** \`newStatus\`, **proposed** \`newPriority\`, and \`reasoning\`.

**Strict JSON Schema:**
\`\`\`json
${JSON.stringify(zodToJsonSchema(feedCurationSchema), null, 2)}
\`\`\`

Do not include explanations outside the JSON structure. Ensure every input article has an entry in the output array. Assign sequential priorities (0, 1, 2...) ONLY to articles with \`newStatus: 'PUBLISHED'\`.
`;

  const userPrompt = `# Articles to Curate:
${formattedArticleList}

# Task:
Apply the curation principles. Decide the \`newStatus\` and \`newPriority\` for **every article** listed above. Provide the full list in the specified JSON format using the schema. Ensure sequential priorities for published articles and concise reasoning for each decision. Today's Date: ${new Date().toISOString()}`;

  // 4. Invoke LLM
  console.log('[FeedCurator] Invoking LLM for curation...');
  try {
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];
    const response = await structuredLlm.invoke(messages);
    console.log('[FeedCurator] LLM response received.');

    // Basic validation
    if (!response || !Array.isArray(response.curatedFeed)) {
        console.error('[FeedCurator] Invalid response structure from LLM:', response);
        throw new Error('Invalid response structure from LLM.');
    }
    if (response.curatedFeed.length !== allArticlesToCurate.length) {
        console.warn(`[FeedCurator] LLM output count (${response.curatedFeed.length}) doesn't match input count (${allArticlesToCurate.length}).`);
        // Potentially add logic here to handle mismatches if critical
    }

    // Sort the final PUBLISHED articles by their new priority for clarity
    response.curatedFeed.sort((a, b) => {
        if (a.newStatus === 'PUBLISHED' && b.newStatus === 'PUBLISHED') {
            return a.newPriority - b.newPriority;
        }
        if (a.newStatus === 'PUBLISHED') return -1; // Published items come first
        if (b.newStatus === 'PUBLISHED') return 1;
        return 0; // Keep relative order of archived items
    });


    return response;
  } catch (error) {
    console.error('[FeedCurator] Error during LLM invocation:', error);
    throw new Error('Failed to get curation decisions from LLM.');
  }
};

// --- Test Function ---
export const testFeedCurator = async () => {
  console.log('\n--- [TEST] Running Feed Curator Simulation ---');
  try {
    // Connect to DB if mongoService requires it for fetching
    await mongoService.connect();

    const curationResult = await feedCurator();

    console.log('\n--- [TEST] Proposed Curation Decisions ---');
    if (curationResult && curationResult.curatedFeed.length > 0) {
      const changes = { PUBLISHED: 0, ARCHIVED: 0, KEPT_PUBLISHED: 0, };
      const publishedFeed = [];

      curationResult.curatedFeed.forEach(item => {
        const statusChange = item.currentStatus !== item.newStatus;
        const priorityChange = item.currentPriority !== item.newPriority && item.newStatus === 'PUBLISHED'; // Only log priority changes for published

        console.log(`
Article ID: ${item._id}
  Current Status: ${item.currentStatus} -> New Status: ${item.newStatus} ${statusChange ? '(*CHANGED*)' : ''}
  Current Priority: ${item.currentPriority ?? 'N/A'} -> New Priority: ${item.newPriority} ${priorityChange ? '(*CHANGED*)' : ''}
  Reasoning: ${item.reasoning}`);

        if (item.newStatus === 'PUBLISHED') {
          publishedFeed.push(item);
          if (item.currentStatus !== 'PUBLISHED') {
            changes.PUBLISHED++;
          } else {
            changes.KEPT_PUBLISHED++;
          }
        } else if (item.newStatus === 'ARCHIVED' && item.currentStatus !== 'ARCHIVED') {
          changes.ARCHIVED++;
        }
      });

      console.log('\n--- [TEST] Summary ---');
      console.log(`Total articles processed: ${curationResult.curatedFeed.length}`);
      console.log(`Proposed PUBLISHED count: ${publishedFeed.length} (New: ${changes.PUBLISHED}, Kept: ${changes.KEPT_PUBLISHED})`);
      console.log(`Proposed ARCHIVED count (from non-archived): ${changes.ARCHIVED}`);
      console.log('\nPublished Feed Order:');
       publishedFeed
         .sort((a, b) => a.newPriority - b.newPriority) // Ensure sorted for display
         .forEach(item => console.log(`  Priority ${item.newPriority}: ${item.reasoning.substring(0,60)}...`));


    } else {
      console.log('No curation decisions were made or returned.');
    }

  } catch (error) {
    console.error('\n--- [TEST] Feed Curator Simulation FAILED ---');
    console.error(error);
  } finally {
      // Disconnect from DB if needed
      await mongoService.disconnect();
      console.log('\n--- [TEST] Feed Curator Simulation Finished ---');
  }
};

// Uncomment to run the test directly
// testFeedCurator();

// try {
//   await mongoService.connect();
//   const curationDecisions = await feedCurator();

//   if (curationDecisions?.curatedFeed?.length > 0) {
//       await mongoService.updateMultipleArticleStatusesAndPriorities(curationDecisions.curatedFeed);
//       console.log(`[NewsFeedCreator] Applied ${curationDecisions.curatedFeed.length} curation decisions`);
//   }
// } catch (curationError) {
//   console.error("[NewsFeedCreator] Feed curation failed:", curationError);
// }