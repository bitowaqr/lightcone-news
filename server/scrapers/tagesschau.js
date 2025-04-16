import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());


const RSS_URL = "https://www.tagesschau.de/infoservices/alle-meldungen-100~rdf.xml"


const scrapeFeed = async () => {
  const response = await fetch(RSS_URL)
  const data = await response.text()
  const parsedData = await parseStringPromise(data, { explicitArray: false })
  return parsedData['rdf:RDF'].item.map(item => {
    return {
      title: item.title,
      url: item.link,
      description: item.description,
      meta: {
        publisher: "Tagesschau",
        language: 'de',
        publishedDate: new Date(item.pubDate)?.toISOString() || null,
        tags: item.category,
      }
    }
  })
}

// test
// const rssItems = await getTagesschauRSSFeed()
// console.log(rssItems)
// console.log(rssItems.length)
  


const scrapeArticle = async (url) => {
  let browser = null;
  try {
    console.log(`Launching Puppeteer for URL: ${url}`);
    browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: 'new',
    });
    const page = await browser.newPage();
    await page.goto(url, {timeout: 10000})
    const htmlContent = await page.content();
    console.log(`Successfully fetched content for: ${url}`);

    const $ = cheerio.load(htmlContent);

    let articleData = {
      headline: null,
      topLine: null,
      body: null
    };

    // Attempt 1: Extract from JSON-LD
    try {
        const jsonLdScript = $('script[type="application/ld+json"]').first().html();
        if (jsonLdScript) {
            const jsonData = JSON.parse(jsonLdScript);
            // Check if it's a NewsArticle type
            console.log(jsonData)
            if (jsonData && jsonData['@type'] === 'NewsArticle') {
              articleData.title = jsonData.headline || null;
              articleData.tags = jsonData.keywords || null;
              articleData.content = jsonData.articleBody || null;
              articleData.publishedDate = jsonData.datePublished || null;
              articleData.updatedDate = jsonData.dateModified || null;
              console.log("Extracted data from JSON-LD.");
            } else if (jsonData && Array.isArray(jsonData) && jsonData[0] && jsonData[0]['@type'] === 'NewsArticle') {
                 // Sometimes the JSON-LD is an array
                 articleData.title = jsonData[0].headline || null;
                 articleData.content = jsonData[0].articleBody || null;
                 console.log("Extracted data from JSON-LD array.");
            }
        }
    } catch (jsonError) {
        console.warn("Could not parse JSON-LD, falling back to text extraction.", jsonError.message);
    }


    // Attempt 2: Fallback to extracting text from paragraphs if JSON-LD failed or didn't provide body
    if (!articleData.body) {
        console.log("JSON-LD failed or incomplete, falling back to P tag extraction.");
        // Use a selector that targets paragraphs likely containing the main article text.
        // Inspecting the provided HTML, 'article .textabsatz' seems appropriate. Adjust if needed.
        const paragraphs = $('article .textabsatz');
        articleData.body = paragraphs.map((i, el) => $(el).text().trim()).get().join('\n\n');

        // Try to get headline from h1 if not found in JSON-LD
        if (!articleData.headline) {
             articleData.headline = $('h1 .seitenkopf__headline--text').first().text().trim() || $('h1').first().text().trim();
        }
        if (!articleData.topLine) {
          articleData.topLine = $('.seitenkopf__topline').first().text().trim() || $('h2').first().text().trim();
        }
    }

    // Basic cleanup
    if (articleData.body) {
      articleData.body = articleData.body.replace(/\s+/g, ' ').trim();
    }
     if (articleData.headline) {
      articleData.headline = articleData.headline.replace(/\s+/g, ' ').trim();
    }

    const formattedArticle = {
      url: url,
      title: articleData.title,
      topLine: articleData.topLine,
      headline: articleData.headline,
      rawContent: articleData.content,
      meta: {
        publisher: "Tagesschau",
        publishedDate: articleData.publishedDate,
        updatedDate: articleData.updatedDate,
        tags: articleData.tags,
      },
      scrapedDate: new Date(),
    }

    console.log(formattedArticle)
    return formattedArticle;
    
  } catch (error) {
    console.error(`Error scraping article ${url}:`, error);
    return { headline: null, body: null, error: error.message };
  } finally {
    if (browser) {
      console.log(`Closing Puppeteer for URL: ${url}`);
      await browser.close();
    }
  }
};

// test
// const artUrl = "https://www.tagesschau.de/ausland/amerika/trump-zoelle-eu-106.html"
// const runTest = async () => {
//   const articleContent = await scrapeArticle(artUrl);
//   console.log(articleContent)
// }

// runTest();

const tagesschau = {
    scrapeFeed,
    scrapeArticle,
}

export { tagesschau };