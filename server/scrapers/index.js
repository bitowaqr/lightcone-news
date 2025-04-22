import { aljazeera } from './aljazeera.js';
import { bbc } from './bbc.js';
import { dw } from './dw.js';
import { euronews } from './euronews.js';
import { france24 } from './france24.js';
import { heute } from './heute.js';
import { tagesschau } from './tagesschau.js';
import { scrapePolymarketData } from './polymarket.js';
import { scrapeMetaculusData } from './metaculus.js';
import { semafor } from './semafor.js';
import fs from 'fs';
import Exa from 'exa-js';
import dotenv from 'dotenv';
dotenv.config();

// --- Configuration ---
const MAX_SCRAPED_CONTENT_LENGTH = 30_000;
const EXA_MAX_RETRIES = 3;
const EXA_RETRY_DELAY_MS = 10000;

// --- Registries ---

const feedScraperRegistry = {
    aljazeera: aljazeera.scrapeFeed,
    bbc: bbc.scrapeFeed,
    dw: dw.scrapeFeed,
    euronews: euronews.scrapeFeed,
    france24: france24.scrapeFeed,
    heute: heute.scrapeFeed,
    tagesschau: tagesschau.scrapeFeed,
    semafor: semafor.scrapeFeed,
};

// Reusable Exa Scraper Function
const exa = new Exa(process.env.EXA_API_KEY);
const exaArticleScraper = async (source) => {
    let scrapedContent = null;
    let retryCount = 0;
    const url = source.url;

    console.log(`[ExaScraper] Scraping ${url} with Exa...`);

    while (retryCount < EXA_MAX_RETRIES && !scrapedContent) {
        try {
            const response = await exa.getContents(
                [url], // Exa expects an array of URLs
                { livecrawl: 'always' },
                {
                    text: {
                        max_characters: MAX_SCRAPED_CONTENT_LENGTH,
                    },
                }
            );
            scrapedContent = response.results?.[0]; // Get the first result
            if (scrapedContent) {
                 console.log(`[ExaScraper] Successfully scraped ${url.slice(0, 30)}... on attempt ${retryCount + 1}.`);
            }
            break; // Success, exit loop
        } catch (error) {
            console.error(`[ExaScraper] Exa failed for ${url.slice(0, 30)}... (attempt ${retryCount + 1}/${EXA_MAX_RETRIES}):`, error.message);
            retryCount++;
            if (retryCount < EXA_MAX_RETRIES) {
                console.log(`[ExaScraper] Retrying Exa for ${url.slice(0, 30)}... in ${EXA_RETRY_DELAY_MS / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, EXA_RETRY_DELAY_MS));
            }
        }
    }

    // Prepare result, merging with original source, handling Exa failure
    const cleanedSource = { ...source };
    delete cleanedSource.text; // Remove potential old text

    if (scrapedContent) {
        delete scrapedContent.id; // Remove Exa id
        return { 
            ...cleanedSource,
            ...scrapedContent, 
            text: scrapedContent.text || '[No text content found by Exa]' 
        };
    } else {
        console.error(`[ExaScraper] Exa failed for ${url.slice(0, 30)}... after ${EXA_MAX_RETRIES} retries.`);
        return {
            ...cleanedSource,
            text: '[Error: Exa scraping failed after multiple retries]',
            error: 'Exa scraping failed after multiple retries'
        };
    }
};

// Placeholder for sources we specifically don't scrape
const doNotScrapeArticle = async (source) => {
     console.warn(`[ArticleScraper] Scraping deliberately skipped for ${source.url}`);
     const cleanedSource = { ...source };
     delete cleanedSource.text;
     return { 
         ...cleanedSource,
         text: `[Scraping not implemented for this source: ${source.url}]`, 
         error: 'Scraping not implemented' 
     };
};

const articleScraperRegistry = {
    aljazeera: exaArticleScraper,
    bbc: exaArticleScraper,
    dw: exaArticleScraper,
    euronews: exaArticleScraper,
    france24: exaArticleScraper,
    heute: exaArticleScraper,
    tagesschau: exaArticleScraper,
    semafor: semafor.scrapeArticle, 
    theguardian: doNotScrapeArticle, // Explicitly handle Guardian
    // Add other specific scrapers or mappings here
};

const publisherMap = {
    aljazeera: 'Al Jazeera',
    bbc: 'BBC',
    dw: 'DW',
    euronews: 'Euronews',
    france24: 'France 24',
    tagesschau: 'Tagesschau',
    heute: 'ZDFheute',
    semafor: 'Semafor',
    theguardian: 'The Guardian', // Add guardian here too
};

// --- Utility Functions ---

// Simple helper to guess source key from URL hostname
const getSourceKeyFromUrl = (url) => {
    try {
        const hostname = new URL(url).hostname;
        if (hostname.includes('aljazeera.com')) return 'aljazeera';
        if (hostname.includes('bbc.co') || hostname.includes('bbc.com')) return 'bbc'; // Handles .co.uk and .com
        if (hostname.includes('dw.com')) return 'dw';
        if (hostname.includes('euronews.com')) return 'euronews';
        if (hostname.includes('france24.com')) return 'france24';
        if (hostname.includes('zdf.de')) return 'heute'; // heute is on zdf.de
        if (hostname.includes('tagesschau.de')) return 'tagesschau';
        if (hostname.includes('semafor.com')) return 'semafor';
        if (hostname.includes('theguardian.com')) return 'theguardian';
        // Add more mappings if needed
        console.warn(`[getSourceKeyFromUrl] No specific key found for URL: ${url}. Defaulting to Exa.`);
        return null; // Indicate no specific key found, will default to Exa
    } catch (e) {
        console.error(`[getSourceKeyFromUrl] Invalid URL provided: ${url}`, e);
        return null; // Invalid URL
    }
};


// --- Core Scraping Functions ---

const scrapeFeeds = async (includeSources = [], shuffle = false) => {
    let sourceKeysToScrape = includeSources.length > 0 ? includeSources : Object.keys(feedScraperRegistry);
    
    // Validate source keys
    sourceKeysToScrape = sourceKeysToScrape.filter(key => {
        if (!feedScraperRegistry[key]) {
            console.warn(`[ScrapeFeeds] Source key "${key}" not found in feedScraperRegistry. Skipping.`);
            return false;
        }
        return true;
    });

    console.log(`[ScrapeFeeds] Scraping feeds for sources: ${sourceKeysToScrape.join(', ')}`);
    const feedPromises = sourceKeysToScrape.map(key => 
        feedScraperRegistry[key]()
            .catch(error => {
                console.error(`[ScrapeFeeds] Error scraping feed for ${key}:`, error);
                return []; // Return empty array on error for this source
            })
    );

    const feeds = await Promise.all(feedPromises);
    let cleanedFeeds = feeds.flat()?.filter(feed => feed.url && feed.title);

    // Add publisher key based on URL for later use in article scraping
    cleanedFeeds = cleanedFeeds.map(feed => ({
        ...feed,
        publisherKey: getSourceKeyFromUrl(feed.url) || 'unknown',
        publisher: feed.meta?.publisher || publisherMap[getSourceKeyFromUrl(feed.url)] || 'Unknown Publisher',
    }));

    if (shuffle) {
        cleanedFeeds.sort(() => Math.random() - 0.5);
    }
    console.log(`[ScrapeFeeds] Finished. Total valid feed items found: ${cleanedFeeds.length}`);
    return cleanedFeeds;
};

const scrapeArticles = async (sources) => {
    console.log(`[ScrapeArticles] Starting to scrape articles for ${sources.length} sources.`);
    
    // Process sources sequentially to avoid rate limits
    const results = [];
    for (const source of sources) {
        const sourceKey = source.publisherKey || getSourceKeyFromUrl(source.url);
        // Determine the scraper function
        let scraperFunction = articleScraperRegistry[sourceKey] || exaArticleScraper; // Default to Exa if key unknown

        if (!source.url) {
             console.error(`[ScrapeArticles] Source object missing URL. Skipping.`, source);
             results.push({ ...source, text: '[Error: Source missing URL]', error: 'Source missing URL' });
             continue;
        }

        if (sourceKey === 'theguardian') {
            scraperFunction = doNotScrapeArticle;
        }

        console.log(`[ScrapeArticles] Using scraper "${scraperFunction.name || 'unknown'}" for source: ${source.url}`);

        try {
            // Call the scraper function with error catching
            const result = await scraperFunction(source);
            results.push(result);
        } catch (error) {
          try {
            console.log(`[ScrapeArticles] Critical error during scraping ${source.url.slice(0, 50)}... with ${scraperFunction.name}:`, error);
            console.log("Retrying...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            const result = await scraperFunction(source);
            results.push(result);
          } catch (error) {
            console.error(`[ScrapeArticles] Critical error during scraping ${source.url} with ${scraperFunction.name}:`, error);
            const cleanedSource = { ...source };
            delete cleanedSource.text;
            results.push({ 
                ...cleanedSource,
                text: `[Error: Scraping failed unexpectedly - ${error.message}]`, 
                error: `Scraping failed unexpectedly: ${error.message}` 
            });
          }
        }
        
        // Wait 1 second before processing the next source to avoid rate limits
        if (sources.indexOf(source) < sources.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    console.log(`[ScrapeArticles] Finished scraping ${results.length} articles.`);
    return results;
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

const scrapeScenarios = async () => {


const EXCLUDE_TAGS = [
  'Sports',
  'nba',
  'basketball',
  'mlb',
  'nhl',
  'nfl',
  'formula 1',
  'soccer',
  'epl',
  'f1',
  'baseball',
  'nfl draft',
  'gold',
  'ufc',
  'mma',
];

  const polyMarketOpts = {
    maxItems: 10_000,
    excludeTags: EXCLUDE_TAGS,
    // startDateMin: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    // end_date_max: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), // in 2035
    order: 'volume_num',
    ascending: false,
    active: true,
    // closed: false,
    volume_num_min: 1,
  }

  const metaculusOpts = {
    maxItems: 10_000,
    statuses: ['open','closed','resolved'],
    order_by: '-published_at',
    forecast_type: 'binary',
    open_time__gt: '2025-01-01',
    scheduled_resolve_time__lt: '2035-01-01'
  }

  let scenarios = [];
  try {
    const metaculusScenarios = await scrapeMetaculusData(metaculusOpts, false);
    scenarios = [...scenarios, ...metaculusScenarios];
  } catch (error) {
    console.error(`[ScrapeScenarios] Error scraping metaculus:`, error);
  }

  try {
    const polyMarketScenarios = await scrapePolymarketData(polyMarketOpts);
    scenarios = [...scenarios, ...polyMarketScenarios];
  } catch (error) {
    console.error(`[ScrapeScenarios] Error scraping polymarket:`, error);
  };
  

  scenarios.forEach(s => {
    s.textForEmbedding = scrapedScenarioToMd(s);
  });
  return scenarios;
}

const scrapedSourceToMd = (source, index) => {
  return `--- Source ${index ? index + 1 : ''} ---
Title: ${source.title}
Publisher: ${source.publisher || 'N/A'}
URL: ${source.url}
Published: ${source.publishedDate || source.meta?.publishedDate || 'N/A'} // Adjust based on final source structure

Content:
${source.text}
--- End Source ---`;
};

export {
  scrapeFeeds,
  scrapeArticles,
  scrapedSourceToMd,
  publisherMap,
  // Export registries if needed elsewhere, or keep internal
  // feedScraperRegistry,
  // articleScraperRegistry,
  scrapeScenarios,
};

    
// // // test 1: scrapeFeeds
// (async () => {
//   const feeds = await scrapeFeeds(['aljazeera', 'bbc', 'dw', 'euronews', 'france24', 'tagesschau', 'heute', 'semafor', 'theguardian']);
//   console.log(feeds);
//   // fs store to file
//   fs.writeFileSync('feeds.json', JSON.stringify(feeds, null, 2));
// })();


// // 2. test
// a) load feed.json
// const feeds = JSON.parse(fs.readFileSync('feeds.json', 'utf8'));
// console.log(feeds);

// // b) scrape 1 artciles from each feed
// const publishers = [...new Set(feeds.map(f => f.publisher))];
// console.log(publishers);

// let articlesToScrape = [];
// for(const publisher of publishers) {
//   const publisherFeeds = feeds.filter(f => f.publisher === publisher);
//   // console.log(publisherFeeds[0]);
//   // const article = await scrapeArticles(publisherFeeds);
//   // console.log(article);
//   articlesToScrape.push(publisherFeeds[0]);
// }
// console.log(articlesToScrape);

// // c) scrape articles
// const articles = await scrapeArticles(articlesToScrape);
// console.log(articles);
