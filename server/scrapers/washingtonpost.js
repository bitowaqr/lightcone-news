import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());


// const rssFeedUrl = "https://feeds.washingtonpost.com/rss/world"
// const articleUrl = "https://www.washingtonpost.com/world/2025/04/10/russia-oil-tariffs-ukraine-war/"


const scrapeArticle = async (url) => {
    let browser = null;
    try {
        console.log(`Launching Puppeteer for URL: ${url}`);
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new',
            // Remove duplicate args entry
            // args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
        const page = await browser.newPage();

        console.log(`Navigating to ${url}`);
        // Wait only for navigation, not full network idle, as we need the initial source
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });

        console.log('Attempting to extract __NEXT_DATA__ JSON...');
        const nextData = await page.evaluate(() => {
            const scriptElement = document.getElementById('__NEXT_DATA__');
            if (scriptElement && scriptElement.textContent) {
                try {
                    return JSON.parse(scriptElement.textContent);
                } catch (e) {
                    console.error('Failed to parse __NEXT_DATA__ JSON', e);
                    return null;
                }
            }
            return null;
        });

        if (!nextData) {
            throw new Error('Could not find or parse __NEXT_DATA__ script tag.');
        }

        console.log('Successfully extracted __NEXT_DATA__.');

        // Navigate the JSON to find content elements
        const globalContent = nextData?.props?.pageProps?.globalContent;
        const contentElements = globalContent?.content_elements;

        if (!globalContent || !Array.isArray(contentElements)) {
             throw new Error('Could not find globalContent or content_elements in __NEXT_DATA__.');
        }

        let fullTextContent = '';
        const textElements = contentElements.filter(el => el.type === 'text' && el.content);

        if (textElements.length > 0) {
            fullTextContent = textElements.map(el => {
                // Use Cheerio to decode HTML entities and remove tags from the content
                const $ = cheerio.load(el.content);
                return $.text().trim(); // Get plain text
            }).join('\n\n');
        } else {
             console.warn("No text elements found in content_elements.");
        }

        console.log(`Extracted content successfully.`);

        // Extract metadata from JSON
        const headline = globalContent?.headlines?.basic || 'Title not found';
        const subheadline = globalContent?.description?.basic || null; // Or use subheadlines.basic if available
        const publishedDate = globalContent?.display_date ? new Date(globalContent.display_date).toISOString() : null;
        const updatedDate = globalContent?.last_updated_date ? new Date(globalContent.last_updated_date).toISOString() : publishedDate;
        const publisher = globalContent?.source?.name || 'Washington Post'; // Default if source name isn't in JSON
        let tags = [];
        if (globalContent?.taxonomy?.topics?.length > 0) {
             tags = globalContent.taxonomy.topics.map(topic => topic.name);
        }
         // Add WaPo specific topics if available
        if (globalContent?.taxonomies?.WaPo?.topics?.length > 0) {
            tags = [...new Set([...tags, ...globalContent.taxonomies.WaPo.topics.map(t => t.topic_name)])];
        }


        const formattedArticle = {
            url: url,
            title: headline,
            topLine: subheadline,
            headline: headline,
            rawContent: fullTextContent.trim(),
            meta: {
                publisher: publisher,
                publishedDate: publishedDate,
                updatedDate: updatedDate,
                tags: tags,
            },
            scrapedDate: new Date(),
        }

        console.log('Formatted article data extracted.');
        // console.log(formattedArticle); // Optional: log the full result
        return formattedArticle;

    } catch (error) {
        console.error(`Error scraping article ${url}:`, error);
        // Return structure consistent with success case but indicating error
        return { 
            url: url,
            title: null, 
            headline: null, 
            rawContent: null,
            meta: {
                publisher: "Washington Post", // Assume publisher even on error
                publishedDate: null,
                updatedDate: null,
                tags: []
            },
            scrapedDate: new Date(),
            error: error.message 
        };
    } finally {
        if (browser) {
            console.log(`Closing Puppeteer for URL: ${url}`);
            await browser.close();
        }
    }
};


// test
// const artUrl = "https://www.washingtonpost.com/world/2025/04/10/russia-oil-tariffs-ukraine-war/"
// const runTest = async () => {
//     console.log(`--- Scraping Test URL: ${artUrl} ---`);
//     const articleContent = await scrapeArticle(artUrl);
//     console.log("--- Scraping Test Complete ---");
//     // Log result or error
//     if (articleContent && !articleContent.error) {
//         console.log("Article Scraped Successfully:");
//         // console.log(JSON.stringify(articleContent, null, 2)); 
//         console.log(`Title: ${articleContent.title}`);
//         console.log(articleContent)
//         console.log(`Content Length: ${articleContent.rawContent?.length || 0}`);
//     } else {
//         console.error("Article Scraping Failed:", articleContent?.error);
//     }
// }

// runTest();

// export { scrapeArticle }; // Add export if needed



