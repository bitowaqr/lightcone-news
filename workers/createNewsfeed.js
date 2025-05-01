import { withRetry } from './utils/withRetry.js'; 
import { updateAndEmbedScenarios } from '../server/scraper-scenarios/index.js';
import { createLineup } from './createLineup.js'; 
import { writeArticle } from './writeArticle.js';
import { feedCurator } from '../server/agents/feedCurator.js';
import { mongoService } from '../server/services/mongo.js'; 


const createNewsfeed = async (updateScenarios = true, maxNewStories = 10) => {
  console.log(`[Scheduler] Starting workflow at ${new Date().toISOString()}...`);
  
  await mongoService.connect();

  try {
        if (updateScenarios) {
            // --- Task 1: Update Scenarios ---
            await withRetry(
                () => updateAndEmbedScenarios(),
                'UpdateScenarios',
                3, // maxRetries
                60_000 // delayMs (1 minute)
            );
            console.log("[Scheduler] UpdateScenarios completed successfully.");
        }

        // --- Task 2: Create Lineup ---
        // Call the createLineup function from editorialMeeting.js
        // This function handles its own data fetching (scraping, screening)
        let createdStories; // Store the result if needed later (e.g., to pass to writeArticle)
        createdStories = await withRetry(
            () => createLineup(true, maxNewStories), 
            'editorialMeeting',
            3,
            60_000
        );
        console.log("[Scheduler] CreateLineup completed successfully.");


        // --- Task 3: Write Articles ---
        console.log("[Scheduler] Starting WriteArticles task...");
        let storiesToWrite = [];
        try {
             console.log("[Scheduler] Fetching story ideas for article writing...");
             storiesToWrite = await mongoService.getStoryIdeasFromLatestLineup(true); // Assuming 'true' fetches only pending 'idea' status

        } catch (fetchError) {
            console.error("[Scheduler] Failed to get stories for writing:", fetchError);
            // Decide if this is critical - maybe continue if some stories were fetched before error?
            // For now, let's re-throw to indicate a problem in the sequence.
            throw fetchError;
        }

        let storiesToWriteCount = storiesToWrite?.length;
        if (!storiesToWriteCount) {
            console.log("[Scheduler] No stories found requiring articles. Skipping WriteArticles task.");
        } else {
            console.log(`[Scheduler] Found ${storiesToWriteCount} stories to process for article writing.`);
            let successCount = 0;
          let errorCount = 0;
          let counter = 0;

          for (const story of storiesToWrite) {
              counter++;
              console.log(`[Scheduler] Writing story ${counter} / ${storiesToWriteCount}...`);
                try {
                    await withRetry(
                        () => writeArticle(story),
                        `WriteArticle-${story._id || story.title?.slice(0, 15) || 'unknown'}`, // Safer task name
                        3,
                        60_000
                    );
                    successCount++;
                    console.log(`[Scheduler] Successfully wrote article for story: ${story._id || story.title?.slice(0, 20) || 'unknown'}...`);
                } catch (articleError) {
                    console.error(`[Scheduler] Failed to write article for story: ${story._id || story.title?.slice(0, 20) || 'unknown'}... after all retries.`);
                    errorCount++;
                }
            }
            console.log(`[Scheduler] WriteArticles task finished. Success: ${successCount}, Failed: ${errorCount}`);
             if (errorCount > 0) {
                 // Decide how to handle partial success
                 console.warn(`${errorCount} articles failed during the WriteArticles task.`);
                 // Optionally throw new Error(...) if any failure is critical
             }
        }

        // --- Task 4: Curate Feed --- 
        console.log("[Scheduler] Starting Feed Curation task...");
        let curationDecisions;
        try {
            curationDecisions = await withRetry(
                () => feedCurator(),
                'FeedCuration',
                3, // Retries for curation
                60_000 // Delay
            );
            console.log("[Scheduler] Feed Curation completed successfully.");

            // --- Task 5: Apply Curation Decisions ---
            if (curationDecisions && curationDecisions.curatedFeed && curationDecisions.curatedFeed.length > 0) {
                console.log(`[Scheduler] Applying ${curationDecisions.curatedFeed.length} curation decisions...`);
                await mongoService.updateMultipleArticleStatusesAndPriorities(curationDecisions.curatedFeed);
                console.log("[Scheduler] Curation decisions applied successfully.");
            } else {
                console.log("[Scheduler] No curation decisions to apply.");
            }

        } catch (curationError) {
            console.error("[Scheduler] Feed Curation or Application failed critically:", curationError);
            // Decide how to handle this - maybe the feed stays as is?
            // For now, log the error and let the workflow finish.
            // Consider adding monitoring/alerting here.
        }

        console.log(`[Scheduler] Task sequence completed successfully at ${new Date().toISOString()}.`);

    } catch (error) {
        console.error(`[Scheduler] Task sequence failed critically:`, error);
    } finally {
        console.log(`[Scheduler] Task sequence execution attempt finished.`);
        await mongoService.disconnect(); // Be careful if functions reuse connections
    }
}

export { createNewsfeed };