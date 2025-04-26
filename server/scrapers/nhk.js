import { parseStringPromise } from 'xml2js';

const RSS_URLS = [
  "https://www.nhk.or.jp/rss/news/cat0.xml", // Main News
  "https://www.nhk.or.jp/rss/news/cat3.xml", // Science & Medical News
  "https://www.nhk.or.jp/rss/news/cat4.xml", // Political News
  "https://www.nhk.or.jp/rss/news/cat5.xml", // Economic News
  "https://www.nhk.or.jp/rss/news/cat6.xml", // International News
  "https://www.nhk.or.jp/rss/news/cat-live.xml", // Live News
];

const RETRY_DELAYS = [5000, 15000]; // Standard retry delays

// Basic fetch with retry
const fetchWithRetry = async (url, retries = 0) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if ((response.status >= 500 || response.status === 429 || response.status === 403) && retries < RETRY_DELAYS.length) { 
                 const delay = RETRY_DELAYS[retries];
                 console.warn(`[NHK] Fetch error ${response.status} for ${url}. Retrying after ${delay / 1000}s...`);
                 await new Promise(resolve => setTimeout(resolve, delay));
                 return fetchWithRetry(url, retries + 1);
            }
            throw new Error(`Failed to fetch NHK RSS feed ${url}: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        if (retries < RETRY_DELAYS.length) {
             const delay = RETRY_DELAYS[retries];
             console.warn(`[NHK] Network error for ${url} (${error.message}). Retrying after ${delay / 1000}s...`);
             await new Promise(resolve => setTimeout(resolve, delay));
             return fetchWithRetry(url, retries + 1);
        }
        console.error(`[NHK] Final fetch attempt failed for ${url}:`, error);
        throw error; 
    }
};

const scrapeFeed = async () => {
    let allItems = [];

    for (const url of RSS_URLS) {
        try {
            const data = await fetchWithRetry(url);
            // NHK uses standard RSS 2.0 format
            const parsedData = await parseStringPromise(data, { explicitArray: false }); 

            if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
                console.warn(`[NHK] Invalid RSS structure received from ${url}`);
                continue;
            }

            const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];

            const feedItems = items.map(item => {
                // Description is usually present and usable directly
                const description = item.description?.trim() || null;
                // No standard category/tag field in these feeds

                return {
                    title: item.title?.trim() || null,
                    url: item.link?.trim() || null,
                    description: description, 
                    meta: {
                        publisher: "NHK",
                        language: 'ja', // Assuming Japanese based on domain
                        publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
                        tags: [], 
                    }
                };
            }).filter(item => item.url && item.title); // Basic validation

            allItems = allItems.concat(feedItems);

        } catch (error) {
            console.error(`[NHK] Error processing feed ${url}:`, error);
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
        return itemDate > new Date(now.getTime() - 48 * 60 * 60 * 1000);
    });

    return recentItems;
};

const nhk = {
    scrapeFeed,
    // Exa will be used for article scraping via index.js
};

export { nhk };


// // test
// (async () => {
//     const articles = await scrapeFeed();
//     console.log(articles.length);
// })();