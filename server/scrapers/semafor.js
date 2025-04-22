import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio'; // Import cheerio to parse HTML content

const RSS_URL = "https://www.semafor.com/rss.xml";

/**
 * Fetches the Semafor RSS feed and returns basic metadata for each item.
 * Suitable for discovery and lineup creation.
 */
const scrapeFeed = async () => {
    try {
        console.log(`Fetching Semafor RSS feed for metadata: ${RSS_URL}`);
        const response = await fetch(RSS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch Semafor RSS feed: ${response.status} ${response.statusText}`);
        }
        const data = await response.text();
        const parsedData = await parseStringPromise(data, { explicitArray: false, tagNameProcessors: [key => key.replace(':', ':')] });

        if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
            console.warn(`[Semafor] Invalid RSS structure received from ${RSS_URL}`);
            return [];
        }

        const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];

        const rssItems = items.map(item => {
            return {
                title: item.title?.trim() || null,
                url: item.link?.trim() || null,
                description: item.description?.trim() || '', // Keep the short description
                // rawContent is NOT extracted here
                meta: {
                    publisher: 'Semafor',
                    language: parsedData.rss.channel.language || 'en',
                    publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
                    tags: item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [],
                    // imageUrl is NOT extracted here
                },
                // scrapedDate not needed for feed items
            };
        }).filter(item => item.url && item.title);

        // Optional: Filter for recent items if needed for feed view, but maybe not necessary
        console.log(`[Semafor] Successfully parsed ${rssItems.length} items from RSS feed for metadata.`);
        const now = new Date();
        const filteredItems = rssItems.filter(item => {
            const itemDate = new Date(item.meta.publishedDate);
            return itemDate && itemDate > new Date(now.getTime() - 48 * 60 * 60 * 1000); // Last 48 hours
        });
        console.log(`[Semafor] Successfully filtered ${filteredItems.length} items from RSS feed for metadata.`);
        return filteredItems;

    } catch (error) {
        console.error(`[Semafor] Error fetching or parsing RSS feed for metadata:`, error);
        return [];
    }
};

/**
 * Fetches the full content for a specific Semafor article URL by re-fetching the RSS feed.
 * Mimics the interface expected by scrapeArticles in index.js.
 * @param {object} source - Source object containing the URL, e.g., { url: '...' }
 * @returns {object} - Object containing scraped data like { url, text, title, publishedDate, ... }
 */
const scrapeArticle = async (source) => {
    const urlToScrape = source.url;
    if (!urlToScrape) {
        console.error('[Semafor] scrapeArticle called without a URL.');
        return { url: urlToScrape, text: '[Error: No URL provided]', error: 'No URL provided' };
    }

    try {
        console.log(`[Semafor] Fetching RSS feed again to scrape article: ${urlToScrape}`);
        const response = await fetch(RSS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch Semafor RSS feed for article scraping: ${response.status} ${response.statusText}`);
        }
        const data = await response.text();
        const parsedData = await parseStringPromise(data, { explicitArray: false, tagNameProcessors: [key => key.replace(':', ':')] });

        if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
            console.warn(`[Semafor] Invalid RSS structure received while scraping article: ${urlToScrape}`);
            return { url: urlToScrape, text: '[Error: Invalid RSS structure]', error: 'Invalid RSS structure' };
        }

        const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];

        const matchingItem = items.find(item => item.link?.trim() === urlToScrape);

        if (!matchingItem) {
            console.warn(`[Semafor] Article URL not found in current RSS feed: ${urlToScrape}`);
            // Attempt basic fetch as fallback?
            return { url: urlToScrape, text: '[Error: Article not found in current RSS feed]', error: 'Article not found in feed' };
        }

        // --- Extract content from the matched item --- 
        const encodedContent = matchingItem['content:encoded'] || '';
        let rawContentText = '';
        let imageUrl = null;

        if (encodedContent) {
            const $ = cheerio.load(encodedContent);
            rawContentText = $('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
            imageUrl = $('img').first().attr('src') || null;
             if (!rawContentText) { // Fallback if no <p> tags
                 rawContentText = $.text().replace(/\s+/g, ' ').trim();
             }
        } else {
             rawContentText = matchingItem.description || '[No content found in content:encoded or description]';
             console.warn(`[Semafor] No content:encoded found for ${urlToScrape}, using description.`);
        }
        
        // --- Return object similar to Exa's output --- 
        const scrapedData = {
            url: urlToScrape,
            text: rawContentText,
            title: matchingItem.title?.trim() || source.title || null, // Use feed title or original source title
            // Include meta if available
            publishedDate: matchingItem.pubDate ? new Date(matchingItem.pubDate).toISOString() : null,
            language: parsedData.rss.channel.language || 'en',
            tags: matchingItem.category ? (Array.isArray(matchingItem.category) ? matchingItem.category : [matchingItem.category]) : [],
            imageUrl: imageUrl,
            // Add other fields if needed, mirroring Exa or source structure
        };

        console.log(`[Semafor] Successfully scraped article content for: ${urlToScrape}`);
        return scrapedData;

    } catch (error) {
        console.error(`[Semafor] Error scraping article ${urlToScrape}:`, error);
        return { url: urlToScrape, text: `[Error scraping article: ${error.message}]`, error: error.message };
    }
};


const semafor = {
    scrapeFeed,
    scrapeArticle, // Add scrapeArticle to the export
};

export { semafor };

// --- Optional Test Function --- 
const testScraper = async () => {
    console.log("--- Testing Semafor Scraper --- ");
    
    // Test scrapeFeed
    console.log("\nTesting scrapeFeed...");
    const feedItems = await scrapeFeed();
    if (feedItems && feedItems.length > 0) {
        console.log(`Found ${feedItems.length} feed items. Displaying first 2:`);
        console.log(JSON.stringify(feedItems.slice(0, 2), null, 2));
        
        // Test scrapeArticle with the first feed item's URL
        const testUrl = feedItems[0].url;
        console.log(`\nTesting scrapeArticle with URL: ${testUrl}`);
        const articleContent = await scrapeArticle({ url: testUrl });
        console.log("\nScraped Article Content:");
        // Display limited text to avoid large output
        if(articleContent && articleContent.text) {
             articleContent.text = articleContent.text.substring(0, 200) + '...';
        }
        console.log(JSON.stringify(articleContent, null, 2));

    } else {
        console.log("No feed items found or error occurred during scrapeFeed test.");
    }
    console.log("\n--- Test Complete --- ");
};

// Uncomment to run the test when executing this file directly
// testScraper();
