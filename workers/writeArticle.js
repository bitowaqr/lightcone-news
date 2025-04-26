import { mongoService } from '../server/services/mongo.js';
import dotenv from 'dotenv';
import { callJournalist } from '../server/agents/journalist.js';
import { timelineResearcher } from '../server/agents/timelineResearcher.js';
import { timelineAssistant } from '../server/agents/timelineAssistant.js';
import { findScenariosForArticle } from '../server/services/findScenariosforArticle.js';
import { contextualiser } from '../server/agents/contextualiser.js';
import { copyEditor } from '../server/agents/copyEditor.js';
import { extractJsonFromString } from '../server/utils/extractJson.js';
import fs from 'fs';
import { scrapeArticles } from '../server/scrapers/index.js';
import { withRetry } from './utils/withRetry.js';
dotenv.config();

// --- Constants ---
const SHUFFLE_SOURCES = true;
const MAX_SOURCES = 20;
const SCENARIOS_N = 25;
const PROMPTS_N = 10;
const TAGS_N = 10;

export const writeArticle = async (story) => {
  // 1. Prepare the sources
  let sources = story.sources;
  if (SHUFFLE_SOURCES) {
    console.log('Shuffling sources...');
    sources = sources.sort(() => Math.random() - 0.5);
  }
  if (sources.length > MAX_SOURCES) {
    console.warn(
      'MAX_SOURCES exceeded, removing ' +
        (sources.length - MAX_SOURCES) +
        ' sources'
    );
    sources = sources.slice(0, MAX_SOURCES);
  }
  try {
    await mongoService.updateStoryStatus(story._id, 'draftingArticle');
  } catch (error) {
    console.error(error);
  }

  // 1b. Fetch existing article if this is an update
  let existingArticle = null;
  if (story.update && story.updatedArticleId) {
    console.log(`This is an update for article ${story.updatedArticleId}. Fetching existing article...`);
    try {
      // Use the newly added mongoService method
      existingArticle = await mongoService.getArticleById(story.updatedArticleId);

      if (existingArticle) {
        console.log(`Fetched existing article titled: ${existingArticle.title}`);
      } else {
        console.warn(`Could not find existing article with ID: ${story.updatedArticleId}. Proceeding as new article.`);
        story.update = false; // Treat as new if original not found
      }
    } catch (fetchError) {
      console.error(`Error fetching existing article ${story.updatedArticleId}:`, fetchError);
      console.warn('Proceeding as if it were a new article due to fetch error.');
      story.update = false; // Treat as new on error
    }
  }

  // 2. Scrape the sources
  console.log('Scraping ' + sources.length + ' sources...');
  // Note: We might want to pass both new and existing sources to the journalist in updates
  // For now, passing all sources associated with the *story idea*
  const scrapedSources = await scrapeArticles(sources);
  console.log(scrapedSources.length + ' sources scraped.');

  // 3. Call the Journalist Agent
  console.log('Journalist Agent started.');
  const draftArticle = await callJournalist(story, scrapedSources, existingArticle); // Pass existingArticle
  console.log('Journalist Agent finished.');

  // Filter source objects to include only those used by the journalist
  const sourcesObjs = story.sources.filter((source) =>
    draftArticle.sourceUrls?.includes(source.url) // Use optional chaining
  );

  // 4. Create the article markdown for downstream agents
  const articleMd = `# Title:${draftArticle.title}\n\n# Precis:\n${draftArticle.precis}\n\n# Summary:\n${draftArticle.summary}`;

  // 5. Research the timeline and 6. Find potentially relevant scenarios (in parallel)
  const timelineColleagues = async (articleMd) => {
    let timeline;
    const timelineData = await timelineResearcher(articleMd);
    try {
      timeline = extractJsonFromString(timelineData);
    } catch (error) {
      console.error('researchData format error, timelineAssistant started.');
      timeline = await timelineAssistant(timelineData);
      console.log('timelineAssistant finished.');
    }
    return timeline;
  };
  console.log('timelineResearcher started.');
  const timelinePromise = timelineColleagues(articleMd);

  console.log('findScenariosForArticle started.');
  const scenariosPromise = findScenariosForArticle(articleMd, SCENARIOS_N);

  const [newTimeline, newScenarios] = await Promise.all([
    timelinePromise,
    scenariosPromise,
  ]);
  console.log('timelineResearcher and findScenariosForArticle finished.');

  console.log('scenariosToMarkdown started.');
  const scenariosStr = newScenarios
    .map((s, i) => `# Scenario ${i + 1}:\n_id: ${s._id}\n${s.description}\n\n`)
    .join('\n\n---\n\n');
  console.log('scenariosToMarkdown finished.');

  console.log('contextualiser started.');
  let contextContent;
  contextContent = await withRetry(
    () => contextualiser({
      articleMd,
      timeline: newTimeline, // Pass newly generated timeline
      scenarios: scenariosStr, // Pass newly found scenarios
      numberOfPrompts: PROMPTS_N,
      numberOfTags: TAGS_N,
    }),
    'Contextualiser',
    2,
    5000
  );
  console.log('contextualiser finished.');

  // Prepare scenario objects for copy editor (use newly found ones)
  const scenariosIncluded = newScenarios.filter((scenario) =>
    contextContent.scenarios.some((s) => s._id === scenario._id.toString())
  );

  // 7. Call the Copy Editor Agent
  const copyEditorInput = {
    draftArticle: draftArticle, // Journalist output
    // Newly generated context
    newTimeline: newTimeline,
    newScenarios: scenariosIncluded,
    newSuggestedPrompts: contextContent.prompts,
    newTags: contextContent.tags,
    // Existing context (if available)
    existingArticleContext: existingArticle ? {
      timeline: existingArticle.timeline,
      scenarios: existingArticle.relatedScenarioIds, // Pass IDs, copy editor needs to fetch if details needed
      suggestedPrompts: existingArticle.suggestedPrompts,
      tags: existingArticle.tags
    } : null,
  };

  console.log('Copy Editor Agent started.');
  const editedArticle = await copyEditor(copyEditorInput); // Copy editor needs prompt update
  console.log('Copy Editor Agent finished.');

  // Assemble the final article object for saving
  const article = {
    // Use existing article ID if this is an update
    ...(existingArticle ? { _id: existingArticle._id } : {}),

    // Content from copy editor
    ...editedArticle, // This should contain final title, precis, summary, timeline, scenarios, prompts, tags

    // Meta-data
    sources: sourcesObjs,
    sourceUrls: draftArticle.sourceUrls, // Take source URLs from journalist (might include old+new)
    priority: story.priority,
    relevance: story.relevance,
    lineupId: story.lineupId,
    storyId: existingArticle ? existingArticle.storyId : story._id, // Link to the *original* story idea if updating
    storyTitle: story.title, // Keep the story idea title for reference
    storyDescription: story.description,
    storyNotes: story.notes,
    status: 'DRAFT', // Start as DRAFT, feedCurator will decide final status
  };

  // try {
  //   fs.writeFileSync(
  //     'article' + story.priority + '.md',
  //     JSON.stringify(article, null, 2)
  //   );
  // } catch (error) {
  //   console.error(error);
  // }

  // 8. Save the article
  console.log('Saving final article...');
  const savedArticle = await mongoService.saveArticle(article);
  try {
    await mongoService.updateStoryStatus(story._id, 'articleWritten');
  } catch (error) {
    console.error(error);
  }
  console.log('Article saved successfully.');
  return savedArticle;
};

// test createDraftArticle
const testCreateDraftArticle = async () => {
  let stories = await mongoService.getStoryIdeasFromLatestLineup();
  console.log("let's go, let's write " + stories.length + ' articles');
  let successCount = 0;
  let errorCount = 0;
  const MAX_RETRIES = 3;
  for (const story of stories) {
    let draftArticle;
    let attempt = 0;
    while (attempt < MAX_RETRIES && !draftArticle) {
      try {
        draftArticle = await writeArticle(story);
        console.log('SUCCESS: ', draftArticle?.storyId);
        break;
      } catch (error) {
        console.error(error);
        await new Promise((resolve) => setTimeout(resolve, 10_000));
        attempt++;
      }
    }
    if (!draftArticle) errorCount++;
    else successCount++;
  }
  console.log(`Success rate: ${successCount / (successCount + errorCount)}`);
  await mongoService.disconnect();
};

// testCreateDraftArticle();
