import { mongoService } from '../server/services/mongo.js';
import dotenv from 'dotenv';
import { journalist } from '../server/agents/journalist.js';
import { findScenariosForArticle } from '../server/services/findScenariosforArticle.js';
import { contextualiser } from '../server/agents/contextualiser.js';
import { copyEditor } from '../server/agents/copyEditor.js';
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

  // 1b. Fetch existing article if this is an update (for journalist context)
  let existingArticleForJournalistContext = null;
  if (story.update && story.updatedArticleId) {
    console.log(`This is an update for article ${story.updatedArticleId}. Fetching existing article for journalist context...`);
    try {
      existingArticleForJournalistContext = await mongoService.getArticleById(story.updatedArticleId);
      if (existingArticleForJournalistContext) {
        console.log(`Fetched existing article (for journalist context) titled: ${existingArticleForJournalistContext.title}`);
      } else {
        console.warn(`Could not find existing article ${story.updatedArticleId} for journalist context. Journalist will proceed without it.`);
        // Do not set story.update = false here, as the intent to replace still exists.
      }
    } catch (fetchError) {
      console.error(`Error fetching existing article ${story.updatedArticleId} for journalist context:`, fetchError);
      console.warn('Journalist will proceed without existing article context due to fetch error.');
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
  const draftArticle = await journalist(story, scrapedSources, existingArticleForJournalistContext); 
  console.log('Journalist Agent finished.');

  // Filter source objects to include only those used by the journalist
  // AND sanitize date fields for Article model compatibility
  const sourcesObjs = story.sources
    .filter((source) => draftArticle.sourceUrls?.includes(source.url))
    .map(s => {
        let publishedDate = null;
        let updatedDate = null;

        // Attempt to parse story.sources.publishedDate (which is string from StoryIdea model)
        if (s.publishedDate && s.publishedDate !== 'N/A') {
            const parsedPubDate = new Date(s.publishedDate);
            if (!isNaN(parsedPubDate.getTime())) {
                publishedDate = parsedPubDate;
            }
        }
        // Assuming StoryIdea.sources doesn't have an 'updatedDate', 
        // but if it did, it would be handled similarly. For Article.model, it might come from elsewhere or be null.
        // If s.updatedDate exists and is a string:
        // if (s.updatedDate && s.updatedDate !== 'N/A') { ... }

        return {
            url: s.url,
            publisher: s.publisher,
            publishedDate: publishedDate, // Now a Date object or null
            updatedDate: updatedDate, // Placeholder, assuming not in StoryIdea.sources, default to null
            meta: s.meta || {}, // Ensure meta is at least an empty object if not present
        };
    });

  // 4. Create the article markdown for downstream agents
  const articleMd = `# Title:${draftArticle.title}\n\n# Precis:\n${draftArticle.precis}\n\n# Summary:\n${draftArticle.summary}`;

  // 5. Find potentially relevant scenarios
  console.log('findScenariosForArticle started.');
  const newScenarios = await findScenariosForArticle(articleMd, SCENARIOS_N);
  console.log('findScenariosForArticle finished.');
  
  // Timeline functionality removed - set to empty array
  const newTimeline = [];

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
    existingArticleContext: existingArticleForJournalistContext ? {
      timeline: existingArticleForJournalistContext.timeline,
      scenarios: existingArticleForJournalistContext.relatedScenarioIds, // Pass IDs, copy editor needs to fetch if details needed
      suggestedPrompts: existingArticleForJournalistContext.suggestedPrompts,
      tags: existingArticleForJournalistContext.tags
    } : null,
  };

  console.log('Copy Editor Agent started.');
  const editedArticle = await copyEditor(copyEditorInput); // Copy editor needs prompt update
  console.log('Copy Editor Agent finished.');

  // Assemble the final article object for saving
  const articleToSave = {
    // Use existing article ID if this is an update being directly overwritten by journalist/copyeditor
    // This case should be rare now with updateWriter handling merges.
    // For a new draft that *replaces* an old one, it gets a new _id.
    // ...(existingArticleForJournalistContext && story.update && !process.env.DISABLE_DIRECT_OVERWRITE ? { _id: existingArticleForJournalistContext._id } : {}),

    // Content from copy editor (or journalist if copyEditor is skipped)
    ...editedArticle, // This should contain final title, precis, summary, timeline, scenarios, prompts, tags

    // Meta-data
    sources: sourcesObjs,
    sourceUrls: draftArticle.sourceUrls,
    priority: story.priority,
    relevance: story.relevance,
    lineupId: story.lineupId,
    storyId: story._id, // Link to the StoryIdea that generated this article
    storyTitle: story.title, 
    storyDescription: story.description,
    storyNotes: story.notes,
    status: 'DRAFT', // Start as DRAFT, feedCurator will decide final status
    isUpdate: false, // Default to false. updateWriter will set this to true if it merges.
  };

  // If the original StoryIdea indicated this was an update to a specific article,
  // store that target article's ID in `replacesArticleId`.
  if (story.update && story.updatedArticleId) {
    articleToSave.replacesArticleId = story.updatedArticleId;
    console.log(`[WriteArticle] Marking article to replace: ${story.updatedArticleId}`);
  }

  console.log('Saving final article...');
  const savedArticle = await mongoService.saveArticle(articleToSave);
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
