import { aljazeera } from './aljazeera.js';
import { bbc } from './bbc.js';
import { dw } from './dw.js';
import { euronews } from './euronews.js';
import { france24 } from './france24.js';
import { heute } from './heute.js';
import { tagesschau } from './tagesschau.js';
import { scrapePolymarketData } from './polymarket.js';
import fs from 'fs';
import Exa from 'exa-js';
import dotenv from 'dotenv';
dotenv.config();

const newsScraperRegistry = {
  aljazeera: aljazeera,
  bbc: bbc,
  dw: dw,
  euronews: euronews,
  france24: france24,
  heute: heute,
  tagesschau: tagesschau,
};

const publisherMap = {
  aljazeera: 'Al Jazeera',
  bbc: 'BBC',
  dw: 'DW',
  euronews: 'Euronews',
  france24: 'France 24',
  tagesschau: 'Tagesschau',
  heute: 'ZDFheute',
};

const scrapeFeeds = async (includeSources = [], shuffle = false) => {
  let feeds;
  if (includeSources.length > 0) {
    // check if all sources are in the registry
    includeSources.forEach((source) => {
      if (!newsScraperRegistry[source]) {
        throw new Error(`Source ${source} not found in registry`);
      }
    });
    feeds = await Promise.all(
      includeSources.map((source) => newsScraperRegistry[source].scrapeFeed())
    );
  } else {
    feeds = await Promise.all(
      Object.values(newsScraperRegistry).map((scraper) => scraper.scrapeFeed())
    );
  }
  const cleanedFeeds = feeds.flat()?.filter((feed) => feed.url && feed.title);
  if (shuffle) {
    cleanedFeeds.sort(() => Math.random() - 0.5);
  }
  return cleanedFeeds;
};

const scrapeArticles = async (sources) => {
  const MAX_SCRAPED_CONTENT_LENGTH = 30_000;
  const exa = new Exa(process.env.EXA_API_KEY);
  // exa scrapes all but guardian urls
  const urlsForScraping = sources
    .filter(
      (source) =>
        source.url &&
        !source.url.includes('theguardian.com') &&
        !source.url.includes('guardianapis.com')
    )
      .map((source) => source.url);
    
      let scrapedContents = null;
      let retryCount = 0;
      const MAX_RETRIES = 3;
      while (retryCount < MAX_RETRIES && !scrapedContents) {
          try {
            scrapedContents = await exa.getContents(
                urlsForScraping,
                { livecrawl: 'always' },
                {
                  text: {
                    max_characters: MAX_SCRAPED_CONTENT_LENGTH,
                  },
                }
              );
          } catch (error) {
              console.log('Exa failed, retrying in 10 seconds...');
              await new Promise(resolve => setTimeout(resolve, 10000));
              retryCount++;
          }
      }
      if (!scrapedContents) {
          throw new Error('Exa failed ('+MAX_RETRIES+' retries).');
      }
    
  const scrapedSources = sources.map((source) => {
    let scrapedContent = scrapedContents?.results?.find(
      (r) => r.url === source.url
    );

    if (!scrapedContent) {
      scrapedContent = {
        text: '[No content found]',
      };
    }
    delete source.text;
    delete scrapedContent.id;
    scrapedContent.text = scrapedContent.text || '[No content found]';
    return {
      ...scrapedContent,
      ...source,
    };
  });
  return scrapedSources;
};


export const scrapedScenarioToMd = (scenario) => {
    
        let text = []
        if(scenario?.question) {
          text.push(`## Question\n${scenario.question}`);
        }
        if(scenario?.description) {
          text.push(`## Description\n${scenario.description}`);
        }
        if(scenario?.tags) {
          text.push(`## Tags\n${scenario.tags.join(', ')}`);
        }
        if(scenario?.resolutionCriteria) {
          text.push(`## Resolution Criteria\n${scenario.resolutionCriteria}`);
        }
        if(scenario?.rationaleSummary) {
          text.push(`## Rationale Summary\n${scenario.rationaleSummary}`);
        }
        if(scenario?.rationaleDetails) {
          text.push(`## Rationale Details\n${scenario.rationaleDetails}`);
        }
  
        return text.join('\n\n').trim();
    }

const scrapeScenarios = async (opts = {}) => {
    opts = { active: true, ...opts };
    let scenarios = [];
    const polyMarketScenarios = await scrapePolymarketData(opts);
    scenarios = [...scenarios, ...polyMarketScenarios];

    scenarios.forEach(s => {
      s.textForEmbedding = scrapedScenarioToMd(s);
    });
    return scenarios;
};

const scrapedSourceToMd = (source, index) => {
  return `--- Source ${index ? index + 1 : ''} ---
Title: ${source.title}
Publisher: ${source.publisher || 'N/A'}
URL: ${source.url}
Published: ${source.publishedDate || 'N/A'}

Content:
${source.text}
--- End Source ---`;
};

export {
  scrapeFeeds,
  scrapeArticles,
  scrapedSourceToMd,
  publisherMap,
  newsScraperRegistry,
  scrapeScenarios,
};

    
// test scrapeScenarios
// const testScrapeScenarios = async () => {
//     const scenarios = await scrapeScenarios(opts);
//     fs.writeFileSync('scenarios.json', JSON.stringify(scenarios, null, 2));
//     console.log(`Scenarios saved to scenarios.json: ${scenarios.length} scenarios`);
// }
// await testScrapeScenarios();

    
// test scrapeFeeds
// const testScrapeFeeds = async () => {
//   const feeds = await scrapeFeeds();
//     fs.writeFileSync('feeds.json', JSON.stringify(feeds, null, 2));
//     console.log(`Feeds saved to feeds.json: ${feeds.length} feeds`);
// }
// await testScrapeFeeds();

/**
 * Example Usage:
 *
 * import newsScraperRegistry from './server/scrapers/index.js';
 *
 * async function scrape(sourceKey, type = 'article', urlOrOptions) {
 *   const sourceScrapers = newsScraperRegistry[sourceKey];
 *   if (!sourceScrapers) {
 *     throw new Error(`No scraper found for source: ${sourceKey}`);
 *   }
 *
 *   let scrapeFunction;
 *   if (type === 'article' && sourceScrapers.scrapeArticle) {
 *     scrapeFunction = sourceScrapers.scrapeArticle;
 *   } else if (type === 'rss' && sourceScrapers.getRSSFeed) {
 *     scrapeFunction = sourceScrapers.getRSSFeed;
 *   } else if (type === 'markets' && sourceScrapers.scrapeMarkets) { // Example for prediction markets
 *      scrapeFunction = sourceScrapers.scrapeMarkets;
 *   } // Add other types as needed
 *   else {
 *      throw new Error(`Scraper type '${type}' not supported or available for source: ${sourceKey}`);
 *   }
 *
 *   if (typeof scrapeFunction !== 'function') {
 *      throw new Error(`Scraper function for '${type}' is not valid for source: ${sourceKey}`);
 *   }
 *
 *   return await scrapeFunction(urlOrOptions);
 * }
 *
 * // const bbcArticle = await scrape('bbc', 'article', 'some-bbc-url');
 * // const polyMarkets = await scrape('polymarket', 'markets', { maxItems: 50 });
 * // const tagesschauFeed = await scrape('tagesschau', 'rss');
 *
 */
