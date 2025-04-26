import { parseStringPromise } from 'xml2js';

const RSS_URLS = [
  "https://www.welt.de/feeds/latest.rss",
  "https://www.welt.de/feeds/section/politik.rss",
  "https://www.welt.de/feeds/section/wirtschaft.rss",
  "https://www.welt.de/feeds/topnews.rss",
];

const RETRY_DELAYS = [20000, 60000]; // 20 seconds, then 60 seconds

const fetchWithRetry = async (url, retries = 0) => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            if (response.status === 429 && retries < RETRY_DELAYS.length) {
                const delay = RETRY_DELAYS[retries];
                console.warn(`[WELT] Rate limit hit for ${url}. Retrying after ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(url, retries + 1);
            }
            throw new Error(`Failed to fetch WELT RSS feed ${url}: ${response.status} ${response.statusText}`);
        }
        return await response.text();
    } catch (error) {
        if (retries < RETRY_DELAYS.length) {
             const delay = RETRY_DELAYS[retries];
             console.warn(`[WELT] Fetch error for ${url} (${error.message}). Retrying after ${delay / 1000}s...`);
             await new Promise(resolve => setTimeout(resolve, delay));
             return fetchWithRetry(url, retries + 1);
        }
        console.error(`[WELT] Final fetch attempt failed for ${url}:`, error);
        throw error; // Rethrow after final attempt fails
    }
};

const scrapeFeed = async () => {
    let allItems = [];

    for (const url of RSS_URLS) {
        try {
            const data = await fetchWithRetry(url);
            const parsedData = await parseStringPromise(data, { explicitArray: false, tagNameProcessors: [key => key.replace(':', '_')] }); // Replace ':' for easier access

            if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
                console.warn(`[WELT] Invalid RSS structure received from ${url}`);
                continue; // Skip this feed if structure is invalid
            }

            const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];

            const feedItems = items.map(item => {
                 // Extract tags from category and media_keywords if they exist
                let tags = [];
                if (item.category) {
                    tags = tags.concat(Array.isArray(item.category) ? item.category : [item.category]);
                }
                // media_keywords seems to be a comma-separated string
                 if (item.media_keywords && typeof item.media_keywords === 'string') {
                     tags = tags.concat(item.media_keywords.split(',').map(t => t.trim()));
                 }
                 // Remove duplicates within tags
                 tags = [...new Set(tags)];

                return {
                    title: item.title?.trim() || null,
                    url: item.link?.trim() || null,
                    description: item.description?.trim() || null,
                    meta: {
                        publisher: "WELT",
                        language: parsedData.rss.channel.language || 'de',
                        publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
                        tags: tags,
                        premium: item.welt_premium === 'true', // Add premium status
                    }
                };
            }).filter(item => item.url && item.title); // Ensure basic validity

            allItems = allItems.concat(feedItems);

        } catch (error) {
            console.error(`[WELT] Error processing feed ${url}:`, error);
            // Continue to the next feed even if one fails
        }
    }

    // Filter out duplicates based on URL
    const uniqueItems = allItems.filter((item, index, self) =>
        index === self.findIndex((t) => t.url === item.url)
    );

    // Filter for recent items (last 48 hours)
    const now = new Date();
    const recentItems = uniqueItems.filter(item => {
        if (!item.meta.publishedDate) return false; // Skip if no date
        const itemDate = new Date(item.meta.publishedDate);
        return itemDate > new Date(now.getTime() - 48 * 60 * 60 * 1000);
    });

    return recentItems;
};

const welt = {
    scrapeFeed,
    // No specific article scraper needed as Exa will be used
};

export { welt };


// // test
// (async () => {
//     const articles = await scrapeFeed();
//     console.log(articles);
// })();