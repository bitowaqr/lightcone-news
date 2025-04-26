import { parseStringPromise } from 'xml2js';

const RSS_URLS = [
    "https://www.cbc.ca/webfeed/rss/rss-topstories",
    "https://www.cbc.ca/webfeed/rss/rss-world",
    "https://www.cbc.ca/webfeed/rss/rss-politics",
    "https://www.cbc.ca/webfeed/rss/rss-business",
    "https://www.cbc.ca/webfeed/rss/rss-technology"
];

const RETRY_DELAYS = [5000, 15000]; // Shorter delays, just in case

// Basic fetch with retry for transient errors
const fetchWithRetry = async (url, retries = 0) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            // Only retry on server errors (5xx) or specific client errors if needed
            if ((response.status >= 500 || response.status === 429) && retries < RETRY_DELAYS.length) {
                 const delay = RETRY_DELAYS[retries];
                 console.warn(`[CBC] Fetch error ${response.status} for ${url}. Retrying after ${delay / 1000}s...`);
                 await new Promise(resolve => setTimeout(resolve, delay));
                 return fetchWithRetry(url, retries + 1);
            }
            throw new Error(`Failed to fetch CBC RSS feed ${url}: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        if (retries < RETRY_DELAYS.length) {
             const delay = RETRY_DELAYS[retries];
             console.warn(`[CBC] Network error for ${url} (${error.message}). Retrying after ${delay / 1000}s...`);
             await new Promise(resolve => setTimeout(resolve, delay));
             return fetchWithRetry(url, retries + 1);
        }
        console.error(`[CBC] Final fetch attempt failed for ${url}:`, error);
        throw error; // Rethrow after final attempt fails
    }
};

const scrapeFeed = async () => {
    let allItems = [];

    for (const url of RSS_URLS) {
        try {
            const data = await fetchWithRetry(url);
            // Explicitly handle namespaces by enabling `explicitCharkey` and accessing prefixed elements
            const parsedData = await parseStringPromise(data, {
                 explicitArray: false, 
                 explicitCharkey: true, // Helps with CDATA
                 tagNameProcessors: [key => key.replace('cbc:', 'cbc_')] // Replace ':' for JS compatibility
                }); 

            if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
                console.warn(`[CBC] Invalid RSS structure received from ${url}`);
                continue; // Skip this feed
            }

            const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];

            const feedItems = items.map(item => {
                let descriptionText = null;
                if (item.description && typeof item.description === 'string') {
                    // Directly use the description string, remove cheerio parsing
                    descriptionText = item.description.trim();
                } else if (item.description && typeof item.description === 'object' && item.description._) {
                    // Handle potential CDATA object for description
                    descriptionText = item.description._.trim();
                }
                 // Handle cases where category might be an object with # charKey
                let category = item.category;
                if (category && typeof category === 'object' && category._) {
                    category = category._;
                }
                let tags = [];
                if (typeof category === 'string' && category) {
                     // Split category string like "News/Canada/Nova Scotia"
                    tags = category.split('/').map(t => t.trim()).filter(Boolean);
                }
                // Extract author name, handle potential object structure
                let author = item.cbc_authorName;
                if (author && typeof author === 'object' && author._) {
                    author = author._;
                }
                return {
                    title: item.title?._ || item.title?.trim() || null, // Handle potential CDATA object
                    url: item.link?._?.trim() || item.link?.trim() || null, // Access ._ first for link
                    description: descriptionText, // Use the potentially raw description
                    meta: {
                        publisher: "CBC",
                        language: 'en',
                        publishedDate: item.pubDate?._ ? new Date(item.pubDate._).toISOString() : (item.pubDate ? new Date(item.pubDate).toISOString() : null), // Access ._ first for pubDate
                        tags: tags,
                        author: author || null
                    }
                };
            }).filter(item => item.url && item.title); // Basic validation

            allItems = allItems.concat(feedItems);

        } catch (error) {
            console.error(`[CBC] Error processing feed ${url}:`, error);
            // Continue to the next feed
        }
    }

    // Filter out duplicates based on URL
    const uniqueItems = allItems.filter((item, index, self) =>
        index === self.findIndex((t) => t.url === item.url)
    );

    // Filter for recent items (last 48 hours)
    const now = new Date();
    const recentItems = uniqueItems.filter(item => {
        if (!item.meta.publishedDate) return false;
        const itemDate = new Date(item.meta.publishedDate);
        // Add timezone offset handling - Assuming EDT/EST is UTC-4/UTC-5
        // RSS dates like "Thu, 24 Apr 2025 05:00:00 EDT" are parsed correctly by Date()
        // We just need to compare against now
        return itemDate > new Date(now.getTime() - 48 * 60 * 60 * 1000);
    });

    return recentItems;
};

const cbc = {
    scrapeFeed,
    // Exa will be used for article scraping via index.js
};

export { cbc };


// (async () => {
//     const articles = await scrapeFeed();
//     console.log(articles.length);
// })();

