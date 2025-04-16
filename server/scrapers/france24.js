import { parseStringPromise } from 'xml2js';

const RSS_URL = "https://www.france24.com/en/rss";

const scrapeFeed = async () => {
    try {
        console.log(`Fetching France 24 RSS feed from: ${RSS_URL}`);
        const response = await fetch(RSS_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch France 24 RSS feed: ${response.status} ${response.statusText}`);
        }
        const data = await response.text();
        // France 24 feed might have extra namespaces, ignore them for simplicity if parseStringPromise handles it
        const parsedData = await parseStringPromise(data, { explicitArray: false, ignoreAttrs: true });

        if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
            console.warn(`Invalid RSS structure received from ${RSS_URL}`);
            return [];
        }

        const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];

        const rssItems = items.map(item => {
             // Description might be nested or need cleaning
            let description = item.description || '';
            // Example: Clean potential CDATA sections if parser doesn't handle it
            if (typeof description === 'object' && description._) {
                description = description._;
            }

            // Extract guid as potential unique ID if link is problematic
            const guid = item.guid && typeof item.guid === 'object' ? item.guid._ : item.guid;
            const url = item.link || guid;

            return {
                title: item.title?.trim() || null,
                url: url?.trim() || null,
                description: description.trim(),
                meta: {
                    publisher: 'France 24',
                    language: 'en', // Assuming 'en' based on URL
                    publishedDate: item.pubDate ? new Date(item.pubDate).toISOString() : null,
                    // France 24 RSS doesn't seem to have standard category tags
                    tags: [],
                },
            };
        }).filter(item => item.url && item.title);

        // Filter for recent items (last 48 hours)
        const now = new Date();
        const filteredItems = rssItems.filter(item => {
            if (!item.meta.publishedDate) return false;
            const publishedDate = new Date(item.meta.publishedDate);
            const hoursDiff = (now - publishedDate) / (1000 * 60 * 60);
            return hoursDiff <= 48;
        });

        console.log(`Successfully parsed ${filteredItems.length} recent items from France 24 RSS feed.`);
        return filteredItems;

    } catch (error) {
        console.error(`Error fetching or parsing France 24 RSS feed:`, error);
        return [];
    }
};

const france24 = {
    scrapeFeed,
};

export { france24 };

// // // // test RSS Feed
// const testRss = async () => {
//     const rssItems = await scrapeFeed()
//     console.log(rssItems)
//     console.log(rssItems ? rssItems.length : 0)
// }
// testRss();