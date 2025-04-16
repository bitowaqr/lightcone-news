import { mongoService } from '../server/services/mongo.js';
import dotenv from 'dotenv';
const { scrapeArticles } = await import('../server/scrapers/index.js');
import { callJournalist } from '../server/agents/journalist.js';
import { timelineResearcher } from '../server/agents/timelineResearcher.js';
import { timelineAssistant } from '../server/agents/timelineAssistant.js';
import { findScenariosForArticle } from '../server/services/findScenariosforArticle.js';
import { contextualiser } from '../server/agents/contextualiser.js';
import { copyEditor } from '../server/agents/copyEditor.js';
import { extractJsonFromString } from '../server/utils/extractJson.js';
import fs from 'fs';
dotenv.config();

// --- Constants ---
const SHUFFLE_SOURCES = true;
const MAX_SOURCES = 10;
const SCENARIOS_N = 20;
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

  // 2. Scrape the sources
  console.log('Scraping ' + sources.length + ' sources...');
  const scrapedSources = await scrapeArticles(sources);
  console.log(scrapedSources.length + ' sources scraped.');

  // 3. Call the Journalist Agent
  console.log('Journalist Agent started.');
  const draftArticle = await callJournalist(story, scrapedSources);
  console.log('Journalist Agent finished.');

  // 4. Save the draft article
  console.log('Saving draft article...');
  const savedDraft = await mongoService.saveArticle(draftArticle);
  console.log('Draft article saved successfully.');

  const sourcesObjs = story.sources.filter((source) =>
    draftArticle.sourceUrls.includes(source.url)
  );

  // 4. Create the article markdown
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

  const [timeline, scenarios] = await Promise.all([
    timelinePromise,
    scenariosPromise,
  ]);
  console.log('timelineResearcher and findScenariosForArticle finished.');

  console.log('scenariosToMarkdown started.');
  const scenariosStr = scenarios
    .map((s, i) => `# Scenario ${i + 1}:\n_id: ${s._id}\n${s.description}\n\n`)
    .join('\n\n---\n\n');
  console.log('scenariosToMarkdown finished.');

  console.log('contextualiser started.');
  const contextContent = await contextualiser({
    articleMd,
    timeline,
    scenarios: scenariosStr,
    numberOfPrompts: PROMPTS_N,
    numberOfTags: TAGS_N,
  });
  console.log('contextualiser finished.');

  const scenariosIncluded = scenarios.filter((scenario) =>
    contextContent.scenarios.some((s) => s._id === scenario._id.toString())
  );

  // 7. Call the Copy Editor Agent
  const copyEditorInput = {
    draftArticle: draftArticle,
    timeline: timeline,
    scenarios: scenariosIncluded,
    suggestedPrompts: contextContent.prompts,
    tags: contextContent.tags,
  };

  console.log('Copy Editor Agent started.');
  const editedArticle = await copyEditor(copyEditorInput);
  console.log('Copy Editor Agent finished.');

  const article = {
    ...editedArticle,
    sources: sourcesObjs,
    sourceUrls: draftArticle.sourceUrls,
    priority: story.priority,
    relevance: story.relevance,
    lineupId: story.lineupId,
    storyId: story._id,
    storyTitle: story.title,
    storyDescription: story.description,
    storyNotes: story.notes,
  };

  try {
    fs.writeFileSync(
      'article' + story.priority + '.md',
      JSON.stringify(article, null, 2)
    );
  } catch (error) {
    console.error(error);
  }

  // 8. Save the article
  console.log('Saving final article...');
  const savedArticle = await mongoService.saveArticle(article);
  console.log('Article saved successfully.');
  return savedArticle;
};

// test createDraftArticle
const testCreateDraftArticle = async () => {
  let stories = await mongoService.getStoryIdeasFromLatestLineup();
  console.log("let's go, let's write " + stories.length + ' articles');
  let successCount,
    errorCount = 0;
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
testCreateDraftArticle();
