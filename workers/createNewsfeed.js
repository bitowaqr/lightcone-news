import { withRetry } from './utils/withRetry.js'; 
import { updateAndEmbedScenarios } from '../server/scraper-scenarios/index.js';
import { createLineup } from './createLineup.js'; 
import { writeArticle } from './writeArticle.js';
import { feedCurator } from '../server/agents/feedCurator.js';
import { mongoService } from '../server/services/mongo.js'; 
import { updateWriter } from '../server/agents/updateWriter.js';


const createNewsfeed = async (updateScenarios = false, maxNewStories = 5) => {
  console.log(`[NewsFeedCreator] Starting workflow at ${new Date().toISOString()}`);
  
  await mongoService.connect();

  try {
        if (updateScenarios) {
            await withRetry(
                () => updateAndEmbedScenarios(),
                'UpdateScenarios',
                3,
                60_000
            );
            console.log("[NewsFeedCreator] Scenarios updated");
        }

      // createLineup returns the array of story idea documents that were saved.
      console.log("maxNewStories in createNewsfeed:", maxNewStories);
        let newlyCreatedStoryIdeas = await withRetry(
            () => createLineup(true, maxNewStories), 
            'editorialMeeting',
            3,
            60_000
        );

      
        let storiesToWrite = [];
        if (newlyCreatedStoryIdeas && newlyCreatedStoryIdeas.length > 0) {
            // Filter for stories that are still in 'idea' status, just in case.
            // Though freshly created ones by createLineup should all be 'idea' status.
            storiesToWrite = newlyCreatedStoryIdeas.filter(story => story.status === 'idea');
            if (storiesToWrite.length === 0 && newlyCreatedStoryIdeas.length > 0) {
                console.log("[NewsFeedCreator] All stories from the new lineup do not have status 'idea'. This is unexpected.");
            }
        } else {
            console.log("[NewsFeedCreator] createLineup returned no story ideas.");
        }

        if (!storiesToWrite || storiesToWrite.length === 0) {
            console.log("[NewsFeedCreator] No stories with status 'idea' to write from the latest lineup created.");
        } else {
            console.log(`[NewsFeedCreator] Writing ${storiesToWrite.length} stories from the latest lineup.`);
            let successCount = 0;
            let errorCount = 0;
            let writtenArticles = []; // Store successfully written articles

            for (const story of storiesToWrite) {
                try {
                    const writtenArticle = await withRetry(
                        () => writeArticle(story),
                        `WriteArticle-${story._id || story.title?.slice(0, 15) || 'unknown'}`,
                        3,
                        60_000
                    );
                    if (writtenArticle) {
                        writtenArticles.push(writtenArticle);
                        successCount++;
                    }
                } catch (articleError) {
                    console.error(`[NewsFeedCreator] Failed to write article for story: ${story._id || story.title?.slice(0, 20) || 'unknown'}`);
                    errorCount++;
                }
            }
            console.log(`[NewsFeedCreator] Articles written: ${successCount} succeeded, ${errorCount} failed`);

            // --- New Step: Process Updates with updateWriter ---
            if (writtenArticles.length > 0) {
                console.log('[NewsFeedCreator] Starting update processing with updateWriter...');
                let updatedCount = 0;
                for (const newDraft of writtenArticles) {
                    // A story idea is an update if story.update is true and story.updatedArticleId exists.
                    // The journalist agent passes story.updatedArticleId as newDraft.story.updatedArticleId
                    // and also story.update as newDraft.story.update. The writeArticle function then uses
                    // story.updatedArticleId to fetch the existingArticle if it's an update.
                    // The crucial link is if the newDraft was based on a StoryIdea that itself was an update.
                    // The StoryIdea schema has `update: boolean` and `updatedArticleId: string`.
                    // The `writeArticle` function uses `story.updatedArticleId` to fetch the `existingArticle`.
                    // We need to check if the `newDraft` (which is an Article object now) has a link back to an original article ID.
                    // The `journalist` agent is passed `existingArticle` (if `story.update` is true).
                    // The `copyEditor` is also passed `existingArticleContext`.
                    // The final article saved by `writeArticle` should have `storyId` (from StoryIdea) and potentially a direct reference
                    // if it's an update, or we infer it from the StoryIdea that created it.

                    // Let's assume `newDraft.storyId` points to the StoryIdea.
                    // We need to fetch the StoryIdea to check `update` and `updatedArticleId` fields.
                    let storyIdeaDetails;
                    if (newDraft.storyId) {
                        storyIdeaDetails = await mongoService.getStoryIdeaById(newDraft.storyId); // <<< YOU WILL NEED TO IMPLEMENT getStoryIdeaById in mongo.js
                    }

                    if (storyIdeaDetails && storyIdeaDetails.update && storyIdeaDetails.updatedArticleId) {
                        console.log(`[NewsFeedCreator] Article ${newDraft._id} (title: ${newDraft.title.substring(0,20)}...) is an update to ${storyIdeaDetails.updatedArticleId}.`);
                        const originalArticle = await mongoService.getArticleById(storyIdeaDetails.updatedArticleId);
                        if (originalArticle) {
                            try {
                                await withRetry(
                                    () => updateWriter(newDraft, originalArticle),
                                    `UpdateWriter-${newDraft._id}`,
                                    2, // Fewer retries for update specific logic
                                    1_000
                                );
                                updatedCount++;
                            } catch (updateError) {
                                console.error(`[NewsFeedCreator] updateWriter failed for article ${newDraft._id}:`, updateError);
                                // Continue to feedCurator, it will see it as a new article
                            }
                        } else {
                            console.warn(`[NewsFeedCreator] Original article ${storyIdeaDetails.updatedArticleId} not found for update ${newDraft._id}. Skipping updateWriter.`)
                        }
                    }
                }
                console.log(`[NewsFeedCreator] updateWriter processed ${updatedCount} potential updates.`);
            }
            // --- End of New Step ---
        }

        let curationDecisions;
        try {
            curationDecisions = await withRetry(
                () => feedCurator(),
                'FeedCuration',
                3,
                60_000
            );

            if (curationDecisions?.curatedFeed?.length > 0) {
                await mongoService.updateMultipleArticleStatusesAndPriorities(curationDecisions.curatedFeed);
                console.log(`[NewsFeedCreator] Applied ${curationDecisions.curatedFeed.length} curation decisions`);
            }
        } catch (curationError) {
            console.error("[NewsFeedCreator] Feed curation failed:", curationError);
        }

        console.log(`[NewsFeedCreator] Workflow completed`);

    } catch (error) {
        console.error(`[NewsFeedCreator] Workflow failed:`, error);
    } finally {
        console.log(`[NewsFeedCreator] Execution finished`);
    }
}

export { createNewsfeed };


//  createNewsfeed(false, 3);