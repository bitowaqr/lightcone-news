import { withRetry } from './utils/withRetry.js'; 
import { updateAndEmbedScenarios } from '../server/scraper-scenarios/index.js';
import { createLineup } from './createLineup.js'; 
import { writeArticle } from './writeArticle.js';
import { feedCurator } from '../server/agents/feedCurator.js';
import { mongoService } from '../server/services/mongo.js'; 


const createNewsfeed = async (updateScenarios = true, maxNewStories = 10) => {
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

        let createdStories = await withRetry(
            () => createLineup(true, maxNewStories), 
            'editorialMeeting',
            3,
            60_000
        );

        let storiesToWrite = [];
        try {
             storiesToWrite = await mongoService.getStoryIdeasFromLatestLineup(true);
        } catch (fetchError) {
            console.error("[NewsFeedCreator] Failed to get stories:", fetchError);
            throw fetchError;
        }

        if (!storiesToWrite?.length) {
            console.log("[NewsFeedCreator] No stories to write");
        } else {
            console.log(`[NewsFeedCreator] Writing ${storiesToWrite.length} stories`);
            let successCount = 0;
            let errorCount = 0;

            for (const story of storiesToWrite) {
                try {
                    await withRetry(
                        () => writeArticle(story),
                        `WriteArticle-${story._id || story.title?.slice(0, 15) || 'unknown'}`,
                        3,
                        60_000
                    );
                    successCount++;
                } catch (articleError) {
                    console.error(`[NewsFeedCreator] Failed to write: ${story._id || story.title?.slice(0, 20) || 'unknown'}`);
                    errorCount++;
                }
            }
            console.log(`[NewsFeedCreator] Articles: ${successCount} succeeded, ${errorCount} failed`);
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