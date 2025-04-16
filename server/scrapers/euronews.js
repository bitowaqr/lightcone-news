import { parseStringPromise } from 'xml2js';

// Standard RSS feed URL for Euronews (common pattern)
const RSS_URL = "https://www.euronews.com/rss";

const scrapeFeed = async () => {
    try {
        console.log(`Fetching Euronews RSS feed from: ${RSS_URL}`);
        const response = await fetch(RSS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch Euronews RSS feed: ${response.status} ${response.statusText}`);
        }
        const data = await response.text();
        const parsedData = await parseStringPromise(data, { explicitArray: false });

        if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
            console.warn(`Invalid RSS structure received from ${RSS_URL}`);
            return []; // Return empty array if structure is invalid
        }

        // Ensure item is always an array
        const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];

        const rssItems = items.map(item => {
            // Extract relevant data, cleaning up description if needed
            let description = item.description || '';
            // Optional: Add logic here if description needs specific parsing (e.g., from media:description)

            return {
                title: item.title?.trim() || null,
                url: item.link?.trim() || null,
                description: description,
                meta: {
                    publisher: 'Euronews',
                    language: 'en', // Assuming 'en', could potentially be dynamic based on feed if needed
                    publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
                    // Euronews RSS seems to use <category> for tags/sections
                    tags: item.category ? (Array.isArray(item.category) ? item.category : [item.category]) : [],
                },
            };
        }).filter(item => item.url && item.title); // Ensure essential fields are present

        // Optional: Filter for recent items (e.g., last 48 hours) like in other scrapers
        const now = new Date();
        const filteredItems = rssItems.filter(item => {
            if (!item.meta.publishedDate) return false; // Skip items without a date
            const publishedDate = new Date(item.meta.publishedDate);
            const hoursDiff = (now - publishedDate) / (1000 * 60 * 60);
            return hoursDiff <= 48;
        });

        console.log(`Successfully parsed ${filteredItems.length} recent items from Euronews RSS feed.`);
        return filteredItems;

    } catch (error) {
        console.error(`Error fetching or parsing Euronews RSS feed:`, error);
        return []; // Return empty array on error
    }
};

// No article scraping needed as per request

const euronews = {
    scrapeFeed,
    // scrapeArticle function would go here if needed
};

export { euronews };

// // // // test RSS Feed
// const testRss = async () => {
//     const rssItems = await scrapeFeed()
//     console.log(rssItems)
//     console.log(rssItems ? rssItems.length : 0)
// }
// testRss();