// import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
// import { zodToJsonSchema } from 'zod-to-json-schema';
// const GEMINI_MODEL =  'gemini-2.5-flash-preview-04-17';
import { AzureChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import { tool } from "@langchain/core/tools"
import dotenv from 'dotenv';
import { mongoService } from '../services/mongo.js';

dotenv.config();


// Adjusted Zod schema for the output of the updateWriter agent
// This schema should align with what mongoService.saveArticle expects,
// which is effectively the Article.model.js structure.
const updatedArticleOutputSchema = z.object({
  // _id: z.string().describe("The MongoDB _id of the new (potentially modified) article draft. This MUST be the _id of the newArticleDraft being processed."),
  title: z.string().describe("Final title. If integrated, MUST be originalArticle.title."),
  precis: z.string().describe("Final precis. If integrated, original precis subtly updated."),
  summary: z.string().describe("Final summary. If integrated, original summary + new info appended & marked as update."),
  summaryAlt: z.string().optional().describe("Final summary alt (bullet points). Reflects combined content."),
  imageUrl: z.string().trim().optional().describe("Article image URL."),
  // publishedDate: z.date().describe("Original publishedDate if integrated, else newArticleDraft.publishedDate."),
  // updatedDate: z.date().describe("Current time if changed by agent, or newArticleDraft.updatedDate."),
  // isUpdate: z.boolean().describe("True if newArticleDraft integrated with originalArticle, false otherwise."),
  // replacesArticleId: z.string().trim().optional().describe("_id of article this replaces/updates. From newArticleDraft."),
  // author: z.string().default('Lightcone News').optional().describe("Article author."),
  // tags: z.array(z.string().trim()).describe("Merged, deduplicated tags for combined content."),
    // status: z.enum(['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED', 'REJECTED', 'ERROR']).default('DRAFT').describe("Article status, typically 'DRAFT'."),
  sources: z.array(z.object({
    url: z.string().trim(),
    publisher: z.string().trim(),
    publishedDate: z.string().trim(),
    updatedDate: z.string().trim(),
    meta: z.object({}).optional(),
  })).describe("Merged, deduplicated sources."),
  sourceUrls: z.array(z.string().trim()).describe("Merged, deduplicated raw source URLs."),
  timeline: z.array(z.object({ 
    date: z.string(), // required in model
    event: z.string(), // required in model
    sourceUrl: z.string().trim().optional(),
  })).describe("Merged, deduplicated, chronologically ordered timeline events (recent first)."),
  relatedScenarioIds: z.array(z.string()).describe("Merged, deduplicated related scenario ObjectIds (strings)."),
  suggestedPrompts: z.array(z.string().trim()).describe("3-5 relevant AI chat prompts for combined content."),
  notes: z.string().trim().describe("Internal notes about the integration process or any other relevant information to be shared with the editor."),
});


const updateTool = tool (
    async({ updatedArticleDraft }) => {
    return updatedArticleDraft;
    },
    {
        name: "update_article",
        description: "Use this tool if the new article draft is an update to an existing story and the information of the two articles needs to be integrated.",
        schema: updatedArticleOutputSchema,
    }
)

const articleIsNewTool = tool (
    async({ isNew, notes }) => {
    return { isNew, notes };
    },
    {
        name: "article_is_new",
        description: "Use this tool if the new article draft is a new story, not an update to an existing story.",
        schema: z.object({
            isNew: z.boolean(),
            notes: z.string().trim().optional().describe("Internal notes to the editor."),
        }),
    }
)


// const model = new ChatGoogleGenerativeAI({
//   model: GEMINI_MODEL,
//   temperature: 0.2,
//   apiKey: process.env.GEMINI_API_KEY,
// });

// const structuredLlm = model.withStructuredOutput(updatedArticleOutputSchema);


const tools = [updateTool, articleIsNewTool];

    const client = new AzureChatOpenAI({
        model: "gpt-4.1",
        temperature: 1,
        maxTokens: undefined,
        maxRetries: 2,
        azureOpenAIApiKey: process.env.AZURE_OPENAI_API_KEY,
        azureOpenAIApiVersion: "2024-12-01-preview",
        azureOpenAIApiInstanceName: "gpt-4.1",
        azureOpenAIApiDeploymentName: "gpt-4.1",
        azureOpenAIApiEndpoint: process.env.AZURE_GPT45_URL,
    }).bindTools(tools);


export const updateWriter = async (newArticleDraft, originalArticle) => {
  if (!newArticleDraft || !newArticleDraft._id) {
    throw new Error('[UpdateWriter] newArticleDraft with _id is required.');
  }
  if (!originalArticle || !originalArticle._id) {
    throw new Error('[UpdateWriter] originalArticle with _id is required.');
  }

  console.log(`[UpdateWriter] Processing update for new draft ${newArticleDraft._id} (replaces: ${newArticleDraft.replacesArticleId || 'N/A'}) based on original ${originalArticle._id}`);

  const systemPrompt = `# Role: AI Article Update Integration Specialist for Lightcone.news

# Context:
You are an AI agent responsible for integrating updates into existing articles for Lightcone.news. The platform values extreme clarity, conciseness, factual accuracy, and providing readers with a coherent, evolving narrative. Readers get confused if multiple, slightly different articles appear on the same topic. Your goal is to merge a new draft (which is an update) with its original published version if the update is incremental and the content is largely similar.

# Core Task:
Compare the 'originalArticle' (already published) with the 'newArticleDraft' (a fresh piece of content intended as an update). Decide if they should be integrated.

## Decision Point: Is 'newArticleDraft' a true, incremental update to 'originalArticle'?

*   **Criteria for Integration (Substantial Similarity & Incremental Update):**
    *   The 'newArticleDraft' covers the same core subject and events as the 'originalArticle'.
    *   The new information in 'newArticleDraft' clearly builds upon or adds to the information in 'originalArticle' without fundamentally changing the entire story's focus or making the original obsolete due to a complete rewrite or major shift in narrative.
    *   A significant portion of 'originalArticle.summary' is still relevant and would form the base of the integrated summary.
    *   It makes sense for a reader to read the original content followed by the new developments as a single, continuous story.

*   **Scenarios to AVOID Integration (Treat 'newArticleDraft' as a separate story or a major revision needing different handling):**
    *   The 'newArticleDraft' is on a related but distinct topic that warrants its own article.
    *   The 'newArticleDraft' represents such a major development or shift in perspective that the 'originalArticle' content is largely irrelevant or misleading as a base. The story has fundamentally changed.
    *   The 'newArticleDraft' is a complete rewrite, and little of the 'originalArticle.summary' would be preserved.
    *   The 'newArticleDraft' focuses on a significantly different angle of the broader event.

# Available Tools:
You have access to two tools to provide your decision:

1. **update_article** - Use this tool when you decide that the new article draft IS an update to an existing story and the information needs to be integrated. You should return the integrated content with your changes.

2. **article_is_new** - Use this tool when you decide that the new article draft is NOT an update to the existing story, but rather a separate, distinct article that should be treated independently.

**NOTE:** Don't update an article multiple times, ie. if an article has already been updated once, it should probably be treated as a new article. You can spot this by checking if there is an 'Update:...' section in the article.

## Integration Process (If 'newArticleDraft' IS a True Incremental Update):

If you decide to use the **update_article** tool, here's how to approach the integration:

1.  **title**: MUST be \`originalArticle.title\`. This is crucial for reader continuity.
2.  **precis**: Start with \`originalArticle.precis\`. Subtly adjust it to hint at new developments if possible (e.g., "Recent developments show..." or "An update to this story indicates..."). Keep it concise and aligned with the original's tone.
3.  **summary**:
    *   Start with the complete \`originalArticle.summary\`.
    *   Identify the *new and distinct* factual information from \`newArticleDraft.summary\`.
    *   Append this new information to the end of \`originalArticle.summary\`.
    *   Clearly demarcate the appended update, including a timestamp reflecting the time of this integration. Use Markdown.
        Example format:
        \`\`\`markdown
        ---
        **UPDATE** 

        [New paragraphs or bullet points from newArticleDraft.summary containing the update...]
        \`\`\`
    *   Ensure the integrated summary flows logically and maintains a consistent voice.
4.  **summaryAlt**: If 'originalArticle' has 'summaryAlt', append new bullet points derived from 'newArticleDraft's new information. If not, create a new bulleted list from the newly integrated 'summary', ensuring it accurately reflects the key points of both the original and the update.
5.  **imageUrl**: Use the image URL from newArticleDraft if available, otherwise keep originalArticle's.
6.  **sources**: Combine and deduplicate sources from both articles.
7.  **sourceUrls**: Combine and deduplicate source URLs from both articles.
8.  **timeline**: Merge, deduplicate, and chronologically order timeline events (most recent first).
9.  **relatedScenarioIds**: Merge and deduplicate scenario IDs from both articles.
9.  **suggestedPrompts**: Select 3-5 of the most relevant prompts that reflect the entire updated content, integrating both articles.
10. **notes**: Include any helpful notes for the editor about the integration process.

## If 'newArticleDraft' IS NOT a True Incremental Update:

If you decide to use the **article_is_new** tool:
* Simply return \`isNew: true\`
* Include notes explaining why you determined this is a new article rather than an update

# Input Data Structure:
You will receive a JSON object with two keys: \`originalArticle\` and \`newArticleDraft\`.
Both will contain fields like: \`_id\`, \`title\`, \`precis\`, \`summary\`, \`summaryAlt\`, \`sources\`, \`sourceUrls\`, \`timeline\`, \`relatedScenarioIds\`, \`suggestedPrompts\`, \`tags\`, \`publishedDate\`, \`updatedDate\`, \`status\`, \`storyId\`, \`imageUrl\`, \`author\`, \`replacesArticleId\`, etc.
`;

  const userPrompt = `# Articles for Update Consideration:

## Original Article (Already Published):
\`\`\`json
${JSON.stringify(originalArticle, null, 2)}
\`\`\`

## New Article Draft (Potential Update):
\`\`\`json
${JSON.stringify(newArticleDraft, null, 2)}
\`\`\`

# Task:
Analyze both articles based on the criteria in the system instructions.
If 'newArticleDraft' is a true, incremental update to 'originalArticle', use the update_article tool to create an integrated version.
Otherwise, use the article_is_new tool to indicate this should be treated as a separate article.`;

  try {
    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
    ];
    const llmResponse = await client.invoke(messages);

      // Extract the tool call from the LLM response
    const toolCallResult = llmResponse.tool_calls[0];
    const toolCallName = toolCallResult.name;
    const toolCallArgs = toolCallResult.args;
      console.log('[UpdateWriter] Tool call name:', toolCallName);
      
    // Determine which tool was called
    if (toolCallName === 'update_article') {
      // The update_article tool was called, meaning this is an update
      console.log('[UpdateWriter] AI decided this is an UPDATE to be integrated');
      
      // Extract the update_article output 
        let updatedArticleData = toolCallArgs;
        if (!updatedArticleData) {
            throw new Error("Could not extract valid updatedArticleDraft data from response");
        }

      // Prepare the final article to save - combine AI's update with required fields
      const articleToSave = {
        _id: newArticleDraft._id, // ENSURE this is the ID of the draft we are modifying
        isUpdate: true, // Mark as an integrated update
        updatedDate: new Date(), // Always set/update this to reflect this agent's run
        status: 'DRAFT', // Ensure status is DRAFT before FeedCurator
        replacesArticleId: newArticleDraft.replacesArticleId || originalArticle._id,
        
        // Content integrated by the AI
        title: originalArticle.title, // Always use original title for continuity
        precis: updatedArticleData.precis,
        summary: updatedArticleData.summary,
        summaryAlt: updatedArticleData.summaryAlt || null,
        
        // Metadata fields from original article
        publishedDate: originalArticle.publishedDate,
        author: newArticleDraft.author || originalArticle.author || 'Lightcone News',
        
        // Combined fields from both articles
        sourceUrls: updatedArticleData.sourceUrls,
        tags: originalArticle.tags || [], // Tags will be updated by feedCurator if needed
        
        // Other fields to preserve or merge
        timeline: updatedArticleData.timeline || newArticleDraft.timeline || originalArticle.timeline || [],
        relatedScenarioIds: updatedArticleData.relatedScenarioIds || newArticleDraft.relatedScenarioIds || originalArticle.relatedScenarioIds || [],
        suggestedPrompts: updatedArticleData.suggestedPrompts || newArticleDraft.suggestedPrompts || originalArticle.suggestedPrompts || [],
        
        // Use new article data for these fields or fall back to original
        imageUrl: newArticleDraft.imageUrl || originalArticle.imageUrl || null,
        priority: newArticleDraft.priority || originalArticle.priority || 0,
        relevance: newArticleDraft.relevance || originalArticle.relevance || 'misc',
        
        // Story references
        storyId: newArticleDraft.storyId, 
        storyTitle: newArticleDraft.storyTitle,
        storyDescription: newArticleDraft.storyDescription,
        storyNotes: newArticleDraft.storyNotes,
        
        // Sources (structured objects)
        sources: newArticleDraft.sources || originalArticle.sources || [],

        // internal notes
        notes: (newArticleDraft.notes || '') + '\n\n' + (updatedArticleData.notes || ''),
      };
      
      // The slug should ideally remain the original article's slug if the title is unchanged
      if (originalArticle.slug) {
        articleToSave.slug = originalArticle.slug + '-' + new Date().toISOString().split('T')[0] + '-' + Math.random().toString(36).substring(2, 6);
      }
      
      console.log(`[UpdateWriter] Saving integrated update article ${articleToSave._id} (replaces: ${articleToSave.replacesArticleId})`);
      const savedArticle = await mongoService.saveArticle(articleToSave);
      console.log(`[UpdateWriter] Successfully saved integrated article ${savedArticle._id}`);
      return savedArticle;
      
    } else if (toolCallName === 'article_is_new') {
      console.log('[UpdateWriter] AI decided this is a NEW article, not an update');
      
      
      // Prepare the article to save - use the new draft data
      const articleToSave = newArticleDraft;
      articleToSave.isUpdate = false;
      articleToSave.replacesArticleId = originalArticle._id;
      
      if (toolCallArgs.notes) {
        articleToSave.notes = (articleToSave.notes || "") + "\n\n[UpdateWriter] " + toolCallArgs.notes;
      }
      
      console.log(`[UpdateWriter] Saving new article ${articleToSave._id} (not an update)`);
      const savedArticle = await mongoService.saveArticle(articleToSave);
      console.log(`[UpdateWriter] Successfully saved new article ${savedArticle._id}`);
      return savedArticle;
    } else {
      // Unable to determine which tool was called
      console.error('[UpdateWriter] Could not determine which tool was called:', toolCallResult);
      
      // Fallback: treat as not an update to be safe
      const fallbackResponse = {
        ...newArticleDraft,
        isUpdate: false,
        updatedDate: new Date(),
        _id: newArticleDraft._id,
        status: newArticleDraft.status || 'DRAFT',
        replacesArticleId: newArticleDraft.replacesArticleId || null,
      };
      
      console.warn(`[UpdateWriter] Using fallback: saving as non-update due to unclear tool call`);
      const savedArticle = await mongoService.saveArticle(fallbackResponse);
      return savedArticle;
    }

  } catch (error) {
    console.error(`[UpdateWriter] Error during LLM invocation or saving for draft ${newArticleDraft._id}:`, error);
    // Fallback: Attempt to save the newArticleDraft as is, marked as not an update, to prevent data loss.
    try {
        const nonUpdateSave = {
            ...newArticleDraft,
            isUpdate: false,
            updatedDate: new Date(),
            _id: newArticleDraft._id, // Ensure _id is correct
            status: newArticleDraft.status || 'DRAFT', // Ensure status
            replacesArticleId: newArticleDraft.replacesArticleId || null, // Ensure in fallback
        };
        
        // Filter out undefined values that might cause issues with Mongoose save
        const cleanedArticle = Object.fromEntries(
            Object.entries(nonUpdateSave).filter(([, value]) => value !== undefined)
        );
        const savedFallback = await mongoService.saveArticle(cleanedArticle);
        console.warn(`[UpdateWriter] Saved newArticleDraft ${savedFallback._id} as non-update due to error in main processing path. (replaces: ${savedFallback.replacesArticleId})`);
        return savedFallback; // Return the fallback saved article
    } catch (saveError) {
        console.error(`[UpdateWriter] CRITICAL: Failed to save newArticleDraft ${newArticleDraft._id} even as non-update fallback:`, saveError);
        // If even fallback save fails, re-throw the original processing error
        // to signal a significant failure in the workflow for this article.
        throw error; 
    }
  }
}; 


// // // test
// (async () => {
//   const originalArticle = await mongoService.getArticleById('68205db878c1fec072721508');
//   const newArticleDraft = await mongoService.getArticleById('6820693e221418d5e1bc2351');
//   const result = await updateWriter(newArticleDraft, originalArticle);
//   console.log(result);
// })();