import fs from 'fs';
import { mongoService } from '../server/services/mongo.js';
import dotenv from 'dotenv';
const { scrapeArticles } = await import('../server/scrapers/index.js');
import { callJournalist } from '../server/agents/journalist.js';
import { scenariosToMarkdown } from '../server/utils/scenarioModelToString.js';
import { researchTimeline } from '../server/agents/researchTimeline.js';
import { findScenariosForArticle } from '../server/services/findScenariosforArticle.js';
import { contextualiser } from '../server/agents/contextualiser.js';
import { copyEditor } from '../server/agents/copyEditor.js';

dotenv.config();

const MAX_SOURCES_PER_STORY = 15;
const SCENARIOS_N = 10;
const PROMPTS_N = 20;
const TAGS_N = 10;
// --- Main Service Function ---
export const createDraftArticle = async (story) => {
  console.log('');
  console.log('');
  console.log('------------');
  console.log('');
  console.log('');
  console.log('createDraftArticle for story: (',story._id,')', story.storyTitle);
  console.log('');
  console.log('');
  console.log('------------');
  console.log('');
  console.log('');
  if (!story || !story.sources || story.sources.length === 0 || !story._id) {
    throw new Error('Invalid story data.');
  }

  // 1. Scrape the sources
  if (story.sources.length > MAX_SOURCES_PER_STORY) {
    console.warn(
      'Truncating ' +
        story.sources.length +
        ' sources to: ' +
        MAX_SOURCES_PER_STORY
    );
    story.sources = story.sources.slice(0, MAX_SOURCES_PER_STORY);
  }

  const sourcesToScrape = story.sources;
  console.log('Scraping ' + sourcesToScrape.length + ' sources...');
  const scrapedSources = await scrapeArticles(story.sources);

  // 2. Call the Journalist Agent
  let draftArticle;
  const MAX_ATTEMPTS = 5;
  let attempt = 0;
  while (attempt < MAX_ATTEMPTS && !draftArticle) {
    try {
      draftArticle = await callJournalist(story, scrapedSources);
      break;
    } catch (error) {
      console.error(error);
      attempt++;
      console.error('Journalist failed, retry ' + attempt + '/' + MAX_ATTEMPTS);
      // wait 30 seconds
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  if (!draftArticle) {
    throw new Error('Journalist failed ' + MAX_ATTEMPTS + ' times.');
  }
  console.log('Draft article:');
  console.log(draftArticle);

  draftArticle.storyId = story._id;
  // 3. Save the draft article
  const savedDraftArticle = await mongoService.saveDraftArticle(draftArticle);
  
  // 4. Create the article markdown
  const articleMd = `# Title:\n ${draftArticle.title}\n\n# Precis:\n ${draftArticle.precis}\n\n# Summary:\n ${draftArticle.summary}`;

  console.log('articleMd:');
  console.log(articleMd);
  
  // 5. Research the timeline
  console.log('researchTimeline started.');
  const timeline = await researchTimeline(articleMd);
  const timelineStr = timeline?.md;

  // 6. Find the scenarios
  console.log('findScenariosForArticle started.');
  const scenarios = await findScenariosForArticle(articleMd, SCENARIOS_N);
  const scenariosStr = scenariosToMarkdown(scenarios);

  console.log('contextualiser started.');
  let contextualContent;
  const MAX_CONTEXTUALISER_ATTEMPTS = 3;
  let contextualiserAttempt = 0;
  while (contextualiserAttempt < MAX_CONTEXTUALISER_ATTEMPTS && !contextualContent) {
    try {
      contextualContent = await contextualiser({
        article: articleMd,
        timeline: timelineStr,
        scenarios: scenariosStr,
        numberOfPrompts: PROMPTS_N,
        numberOfTags: TAGS_N,
      });
      break;
    } catch (error) {
      console.error('Error in contextualiser:', error);
      contextualContent = {
      suggestedPrompts: [],
      tags: [],
    }
    contextualiserAttempt++;
    await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  if (!contextualContent) {
    throw new Error('Contextualiser failed ' + MAX_CONTEXTUALISER_ATTEMPTS + ' times.');
  }

  // 7. Call the Copy Editor Agent
  const copyEditorInput = {
    draftArticle: draftArticle,
    timeline: timelineStr,
    scenarios: scenariosStr,
    suggestedPrompts: contextualContent.suggestedPrompts,
    tags: contextualContent.tags,
  };

  console.log('copyEditorInput:');
  console.log(copyEditorInput);

  let copyEditedArticle;  
  const MAX_COPY_EDITOR_ATTEMPTS = 3;
  let copyEditorAttempt = 0;
  while (copyEditorAttempt < MAX_COPY_EDITOR_ATTEMPTS && !copyEditedArticle) {
    try {
      copyEditedArticle = await copyEditor(copyEditorInput);
      break;
    } catch (error) {
      console.error('Error in copyEditor:', error);
      copyEditorAttempt++;
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  if (!copyEditedArticle) {
    throw new Error('Copy editor failed ' + MAX_COPY_EDITOR_ATTEMPTS + ' times.');
  }
  

  const article = {
    ...copyEditedArticle,
    storyId: story._id,
    storyTitle: story.title,
    storyDescription: story.description,
  };

  // 8. Save the article
  console.log('Saving final article...');
  const savedArticle = await mongoService.saveArticle(article);
  console.log('Article saved successfully.');
  return savedArticle;
};

// test createDraftArticle
const testCreateDraftArticle = async () => {
  const lineup = await mongoService.getLatestLineup();
  lineup.stories = lineup.stories.slice(8); 
  const MAX_RETRIES = 3;
  for (const story of lineup.stories) {
    let draftArticle;
    let attempt = 0;
    while (attempt < MAX_RETRIES && !draftArticle) {
      try {
        draftArticle = await createDraftArticle(story);
        console.log('SUCCESS: ', draftArticle?.storyId);
        break;
      } catch (error) {
        console.error(error);
        await new Promise(resolve => setTimeout(resolve, 30_000));
        attempt++;
      }
    }
  }
  await mongoService.disconnect();
};
testCreateDraftArticle();
