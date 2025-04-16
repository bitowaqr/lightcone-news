import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());


const RSS_URL = "https://rss.dw.com/rdf/rss-en-all"

const scrapeFeed = async () => {
    const response = await fetch(RSS_URL)
    const data = await response.text()
    const parsedData = await parseStringPromise(data, { explicitArray: false })
    let rssItems = parsedData['rdf:RDF'].item.map(item => {
      return {
        title: item.title,
        url: item.link,
        description: item.description,
        meta: {
          publisher: "DW",
          language: 'en',
          publishedDate: item['dc:date'],
          tags: Array.isArray(item['dc:subject']) ? item['dc:subject'] : [item['dc:subject']],
        }
      }
    })
  let now = new Date()
  return rssItems.filter(item => {
    const publishedDate = new Date(item.meta.publishedDate)
    const hoursDiff = (now - publishedDate) / (1000 * 60 * 60)
    return hoursDiff <= 48
  })
  }

  // const rssItems = await getDwRSSFeed()
  // console.log(rssItems)
  // console.log(rssItems.length)
  


const scrapeArticle = async (url) => {
  let browser = null;
  try {
    console.log(`Launching Puppeteer for URL: ${url}`);
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new', // Use the new headless mode
    });
    const page = await browser.newPage();
    await page.goto(url, { timeout: 60000 }); // Increased timeout
    const htmlContent = await page.content();
    console.log(`Successfully fetched content for: ${url}`);

    const $ = cheerio.load(htmlContent);

    let articleData = {
      title: null,
      body: null,
      publishedDate: null,
      tags: [],
    };

    // Attempt 1: Extract from JSON-LD (Check if DW uses it)
    try {
      const jsonLdScript = $('script[type="application/ld+json"]').html();
      if (jsonLdScript) {
        const jsonData = JSON.parse(jsonLdScript);
        // Check if it's a NewsArticle type or similar structure
        if (jsonData && (jsonData['@type'] === 'NewsArticle' || (Array.isArray(jsonData) && jsonData[0]?.['@type'] === 'NewsArticle'))) {
           const articleJson = Array.isArray(jsonData) ? jsonData[0] : jsonData;
           articleData.title = articleJson.headline || null;
           articleData.body = articleJson.articleBody || null;
           articleData.publishedDate = articleJson.datePublished || null;
           articleData.tags = articleJson.keywords ? (Array.isArray(articleJson.keywords) ? articleJson.keywords : articleJson.keywords.split(',').map(k => k.trim())) : [];
           console.log("Attempted extraction from JSON-LD.");
        }
      }
    } catch (jsonError) {
      console.warn("Could not parse JSON-LD or extract data from it, falling back to HTML selectors.", jsonError.message);
    }

    // Attempt 2: Fallback to extracting text from common HTML elements
    // Inspect DW pages to find reliable selectors. These are common guesses:
    if (!articleData.title) {
        // Common selectors for headlines
        articleData.title = $('h1').first().text().trim() || $('.article-title').first().text().trim(); // Adjust selectors based on DW structure
    }
    if (!articleData.body) {
        console.log("JSON-LD failed or incomplete for body, falling back to HTML structure extraction (Markdown).");
        // Updated selector based on user-provided HTML structure
        const articleBodyContainer = $('div.rich-text').first(); // Target the div with class 'rich-text'
        let markdownBody = [];

        if (articleBodyContainer.length) {
            articleBodyContainer.children().each((index, element) => {
                const el = $(element);
                const tagName = el.prop('tagName')?.toLowerCase();
                let text = '';

                // Basic text cleanup utility
                const cleanText = (elem) => elem.text().replace(/\s+/g, ' ').trim();

                switch (tagName) {
                    case 'h1':
                        text = `# ${cleanText(el)}`;
                        break;
                    case 'h2':
                        text = `## ${cleanText(el)}`;
                        break;
                    case 'h3':
                        text = `### ${cleanText(el)}`;
                        break;
                    case 'h4':
                        text = `#### ${cleanText(el)}`;
                        break;
                    case 'h5':
                        text = `##### ${cleanText(el)}`;
                        break;
                    case 'h6':
                        text = `###### ${cleanText(el)}`;
                        break;
                    case 'p':
                        // Avoid paragraphs that only contain ads or unwanted elements if possible
                        // Basic check: ignore if it only contains an iframe or script, refine as needed
                        if (el.find('script, iframe, .advertisement').length === 0) {
                             text = cleanText(el);
                        }
                        break;
                    case 'ul':
                        text = el.find('li').map((i, li) => `* ${cleanText($(li))}`).get().join('\n');
                        break;
                    case 'ol':
                         text = el.find('li').map((i, li) => `${i + 1}. ${cleanText($(li))}`).get().join('\n');
                        break;
                    case 'blockquote':
                        text = `> ${cleanText(el)}`;
                        break;
                    // Add cases for other elements like blockquote, etc. if needed
                    default:
                         // Optionally log ignored tags for debugging
                         // console.log(`Ignoring tag: ${tagName}`);
                         break;
                }

                if (text) {
                    markdownBody.push(text);
                }
            });
        } else {
             console.warn("Could not find a specific article body container, falling back to generic 'article p' tags (no structure).");
             // Fallback to the previous simpler paragraph extraction if no container is found
             const paragraphs = $('article p');
             articleData.body = paragraphs.map((i, el) => $(el).text().trim()).get().join('\\n\\n').replace(/\\s+/g, ' ').trim();
        }

        if (markdownBody.length > 0) {
             articleData.body = markdownBody.join('\\n\\n');
        } else if (!articleData.body) {
            // If still no body after trying markdown and the fallback, set to null or empty
             console.warn("Failed to extract body content using any method.");
             articleData.body = null;
        }


    }
     // Attempt to get published date from meta tags if not in JSON-LD
    if (!articleData.publishedDate) {
        articleData.publishedDate = $('meta[property="article:published_time"]').attr('content') || $('meta[name="date"]').attr('content');
    }
     // Attempt to get tags from meta tags if not in JSON-LD
    if (articleData.tags.length === 0) {
        const keywords = $('meta[name="keywords"]').attr('content');
        if (keywords) {
            articleData.tags = keywords.split(',').map(k => k.trim());
        }
    }


    // Basic cleanup
    if (articleData.body) {
      articleData.body = articleData.body.replace(/\s+/g, ' ').trim();
    }
     if (articleData.title) {
      articleData.title = articleData.title.replace(/\s+/g, ' ').trim();
    }

    const formattedArticle = {
      title: articleData.title,
      url: url,
      body: articleData.body,
      rawContent: articleData.body, // Renaming 'body' to 'rawContent' for consistency? Or keep as body? Let's keep as body for now.
      meta: {
        publisher: "DW",
        language: 'en',
        publishedDate: articleData.publishedDate,
        tags: articleData.tags,
      },
      scrapedDate: new Date(),
    }

    console.log("Formatted Article Data:", formattedArticle);
    return formattedArticle;

  } catch (error) {
    console.error(`Error scraping article ${url}:`, error);
    // Return a consistent error structure if needed
    return { url: url, title: null, body: null, error: error.message };
  } finally {
    if (browser) {
      console.log(`Closing Puppeteer for URL: ${url}`);
      await browser.close();
    }
  }
};


// // --- Test ---
//  const testUrl = "https://www.dw.com/en/germany-s-asparagus-season-shrinking/a-72123100"; // Replace with a valid DW article URL
// // // const testUrl = "https://www.dw.com/en/eu-ministers-back-nature-restoration-law-after-austrian-u-turn/a-69388278";
// const runTest = async () => {
//   console.log(`Testing scrapeArticle with URL: ${testUrl}`);
//   const articleContent = await scrapeArticle(testUrl);
//   console.log("--- Scrape Test Result ---");
//   console.log(JSON.stringify(articleContent, null, 2));
//   console.log("--- End Scrape Test ---");
// };

// runTest(); // Uncomment to run the test when executing this file directly

// // --- Old code to remove ---
// // const article = await scrapeArticle(articleUrl)
// // console.log(article)
  
const dw = {
    scrapeFeed,
    scrapeArticle,
}

export { dw };