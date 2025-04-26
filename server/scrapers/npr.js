import { parseStringPromise } from 'xml2js';

const RSS_URLS = [
  "https://feeds.npr.org/1001/rss.xml", // News
  "https://feeds.npr.org/1004/rss.xml", // World
  "https://feeds.npr.org/1003/rss.xml", // National
  "https://feeds.npr.org/1014/rss.xml", // Politics
  "https://feeds.npr.org/1006/rss.xml", // Business
  "https://feeds.npr.org/1017/rss.xml", // Economy
  "https://feeds.npr.org/1019/rss.xml", // Technology
  "https://feeds.npr.org/1007/rss.xml", // Science
  "https://feeds.npr.org/1128/rss.xml", // Health
  "https://feeds.npr.org/1167/rss.xml"  // Climate
];

const RETRY_DELAYS = [5000, 15000]; // Standard retry delays

// Basic fetch with retry
const fetchWithRetry = async (url, retries = 0) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if ((response.status >= 500 || response.status === 429) && retries < RETRY_DELAYS.length) {
                 const delay = RETRY_DELAYS[retries];
                 console.warn(`[NPR] Fetch error ${response.status} for ${url}. Retrying after ${delay / 1000}s...`);
                 await new Promise(resolve => setTimeout(resolve, delay));
                 return fetchWithRetry(url, retries + 1);
            }
            throw new Error(`Failed to fetch NPR RSS feed ${url}: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        if (retries < RETRY_DELAYS.length) {
             const delay = RETRY_DELAYS[retries];
             console.warn(`[NPR] Network error for ${url} (${error.message}). Retrying after ${delay / 1000}s...`);
             await new Promise(resolve => setTimeout(resolve, delay));
             return fetchWithRetry(url, retries + 1);
        }
        console.error(`[NPR] Final fetch attempt failed for ${url}:`, error);
        throw error; 
    }
};

const scrapeFeed = async () => {
    let allItems = [];

    for (const url of RSS_URLS) {
        try {
            const data = await fetchWithRetry(url);
            // NPR feeds seem standard, no special namespace handling needed for basic fields
            const parsedData = await parseStringPromise(data, { explicitArray: false }); 

            if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
                console.warn(`[NPR] Invalid RSS structure received from ${url}`);
                continue;
            }

            const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];

            const feedItems = items.map(item => {
                // Extract categories if present
                let tags = [];
                if (item.category) {
                     if (Array.isArray(item.category)) {
                        tags = item.category.map(cat => typeof cat === 'object' ? cat._ : cat).filter(Boolean);
                     } else if (typeof item.category === 'object' && item.category._) {
                         tags = [item.category._];
                     } else if (typeof item.category === 'string') {
                         tags = [item.category];
                     }
                }

                return {
                    title: item.title?.trim() || null,
                    url: item.link?.trim() || null,
                    description: item.description?.trim() || null,
                    meta: {
                        publisher: "NPR",
                        language: 'en',
                        publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
                        tags: tags, // Use extracted tags
                        // No specific author field standard in NPR RSS, might be in description sometimes
                    }
                };
            }).filter(item => item.url && item.title); // Basic validation

            allItems = allItems.concat(feedItems);

        } catch (error) {
            console.error(`[NPR] Error processing feed ${url}:`, error);
        }
    }

    // Filter duplicates
    const uniqueItems = allItems.filter((item, index, self) =>
        index === self.findIndex((t) => t.url === item.url)
    );

    // Filter for last 48 hours
    const now = new Date();
    const recentItems = uniqueItems.filter(item => {
        if (!item.meta.publishedDate) return false;
        const itemDate = new Date(item.meta.publishedDate);
        // Standard Date parsing handles RSS date format with timezone info
        return itemDate > new Date(now.getTime() - 48 * 60 * 60 * 1000);
    });

    return recentItems;
};

const npr = {
    scrapeFeed,
    // Exa will be used for article scraping via index.js
};

export { npr };


// // test
// (async () => {
//     const articles = await scrapeFeed();
//     console.log(articles.length);
// })();