import { parseStringPromise } from 'xml2js';

const RSS_URLS = [
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", // top stories
    "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", // worlds
    "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", // business
    "https://timesofindia.indiatimes.com/rssfeeds/-2128672765.cms", // science
    "https://timesofindia.indiatimes.com/rssfeeds/2647163.cms", // environment
    "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms" // tech
];

const RETRY_DELAYS = [5000, 15000]; // Standard retry delays

// Basic fetch with retry
const fetchWithRetry = async (url, retries = 0) => {
    try {
        // Use a more common User-Agent to potentially avoid blocks
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        if (!response.ok) {
            if ((response.status >= 500 || response.status === 429 || response.status === 403) && retries < RETRY_DELAYS.length) { // Add 403 Forbidden retry
                 const delay = RETRY_DELAYS[retries];
                 console.warn(`[IndiaTimes] Fetch error ${response.status} for ${url}. Retrying after ${delay / 1000}s...`);
                 await new Promise(resolve => setTimeout(resolve, delay));
                 return fetchWithRetry(url, retries + 1);
            }
            throw new Error(`Failed to fetch IndiaTimes RSS feed ${url}: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        if (retries < RETRY_DELAYS.length) {
             const delay = RETRY_DELAYS[retries];
             console.warn(`[IndiaTimes] Network error for ${url} (${error.message}). Retrying after ${delay / 1000}s...`);
             await new Promise(resolve => setTimeout(resolve, delay));
             return fetchWithRetry(url, retries + 1);
        }
        console.error(`[IndiaTimes] Final fetch attempt failed for ${url}:`, error);
        throw error; 
    }
};

const scrapeFeed = async () => {
    let allItems = [];

    for (const url of RSS_URLS) {
        try {
            const data = await fetchWithRetry(url);
            // Basic parsing should work
            const parsedData = await parseStringPromise(data, { explicitArray: false }); 

            if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
                console.warn(`[IndiaTimes] Invalid RSS structure received from ${url}`);
                continue;
            }

            const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];

            const feedItems = items.map(item => {
                // Description often contains HTML, just take it as is for now
                const description = item.description?.trim() || null;
                // No standard category field observed in samples, skip tag extraction

                return {
                    title: item.title?.trim() || null,
                    url: item.link?.trim() || null,
                    description: description, 
                    meta: {
                        publisher: "Times of India",
                        language: 'en',
                        publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
                        tags: [], // No reliable tags found in feed
                    }
                };
            }).filter(item => item.url && item.title); // Basic validation

            allItems = allItems.concat(feedItems);
        } catch (error) {
            console.error(`[IndiaTimes] Error processing feed ${url}:`, error);
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

const indiatimes = {
    scrapeFeed,
    // Exa will be used for article scraping via index.js
};

export { indiatimes };


// test
// (async () => {
//     const articles = await scrapeFeed();
//     console.log(articles.length);
// })();