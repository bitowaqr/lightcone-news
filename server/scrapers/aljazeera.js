import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { URL } from 'url'; // To handle relative URLs

puppeteer.use(StealthPlugin());

const MAIN_URL = "https://www.aljazeera.com/";

const scrapeFeed = async () => {
    let browser = null;
    try {
        console.log(`Launching Puppeteer for Al Jazeera`);
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new', // Use 'new' headless mode
        });
        const page = await browser.newPage();

        // Improve page load reliability
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });


        await page.goto(MAIN_URL, { waitUntil: 'networkidle0', timeout: 30000 }); // Increased timeout, wait for network idle

        // console.log("Waiting for JS rendering..."); // Added log
        await new Promise(resolve => setTimeout(resolve, 1000)); 
        // scroll down to the bottom of the page
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 2000));
        

        const htmlContent = await page.content();
        // console.log(`Successfully fetched content from: ${MAIN_URL}`);

        const $ = cheerio.load(htmlContent);
        const articles = [];
        const seenUrls = new Set(); // Keep track of URLs to avoid duplicates

        // Go back to searching all article tags, be more aggressive with selectors
        $('article').each((index, element) => {
            const articleElement = $(element);

            // --- Check if inside Opinion section and skip if so ---
            if (articleElement.closest('.card-opinion-collection').length > 0) {
                // console.log(`Skipping article index ${index}: Inside opinion section.`); // Optional debug log
                return true; // Skips this iteration, like 'continue'
            }
            // --- End Check ---

            // --- Find Title (More Aggressive) ---
            // Primary: Look for h3 containing the class 'article-card__title' (more robust than exact match + span)
            let title = articleElement.find('h3[class*="article-card__title"]').first().text().trim();
            // Fallback 1: Featured/GC card title (usually inside the link)
            if (!title) title = articleElement.find('.gc__title a').first().text().trim();
            // Fallback 2: Any H3 within the article
            if (!title) title = articleElement.find('h3').first().text().trim();
            // Fallback 3: Any H2 within the article
            if (!title) title = articleElement.find('h2').first().text().trim();
            // Fallback 4: Text inside the first link's span (less reliable)
            if (!title) title = articleElement.find('a[href] span').first().text().trim();
             // Fallback 5: Text inside the first link itself (least reliable)
            if (!title) title = articleElement.find('a[href]').first().text().trim();

            // --- Find URL (More Aggressive) ---
            let urlElement = articleElement.find('a.u-clickable-card__link').first(); // Primary clickable link
            if (!urlElement.length) urlElement = articleElement.find('.gc__title a').first(); // Featured link (contains title)
            if (!urlElement.length) urlElement = articleElement.find('.card-opinion-collection__article__link').first(); // Opinion link
             // Link containing a heading is usually a good sign
            if (!urlElement.length) urlElement = articleElement.find('a:has(h1, h2, h3)').first();
            if (!urlElement.length) urlElement = articleElement.find('a[href]').first(); // First link with href as fallback
            let url = urlElement.attr('href');

            // --- Find Teaser (More Aggressive) ---
            let teaser = articleElement.find('p.article-card__excerpt span').first().text().trim();
            if (!teaser) teaser = articleElement.find('.gc__excerpt p').first().text().trim();
            // Find first paragraph that is a direct child of a main content div, if possible
            if (!teaser) teaser = articleElement.find('.article-card__content-wrap > p, .gc__content > p').first().text().trim();
            // Fallback: any paragraph within the article
            if (!teaser) teaser = articleElement.find('p').first().text().trim();

            // --- Extract Raw Content (All Text + Aggressive Cleaning) ---
            let rawContent = articleElement.text(); // Get ALL text first
            if (rawContent) {
                 rawContent = rawContent
                    .replace(/\s+/g, ' ') // Normalize whitespace
                    // Remove common boilerplate/metadata text
                    .replace(/Live updates,?/gi, '')
                    .replace(/\d+m ago|\d+h ago/gi, '')
                    .replace(/list \d+ of \d+/gi, '')
                    .replace(/Opinion by/gi, '')
                    .replace(/Published On \d+ Apr \d+/gi, '')
                    .replace(/From:/gi, '')
                    .replace(/Inside Story|NewsFeed|Featured|EXPLAINER|LONG READ/gi, '') // Program names/labels
                    .replace(/Video Duration [\d:]+/gi, '')
                    .replace(/play video/gi, '')
                    .replace(/See full coverage/gi, '')
                    .replace(/Read more/gi, '')
                    .replace(/Screen reader text/gi, '')
                    // Attempt to remove author names if they follow a pattern (e.g., after a known phrase)
                    // This is fragile and might need adjustment based on actual patterns
                    // .replace(/by [A-Z][a-z]+ [A-Z][a-z]+/g, '')
                    // Remove the extracted title and teaser to avoid duplication? Optional.
                     .replace(title || '__NO_TITLE__', '') // Remove title if found
                     .replace(teaser || '__NO_TEASER__', '') // Remove teaser if found
                    .replace(/\s+/g, ' ') // Normalize whitespace again after removals
                    .trim();
            }

            // --- Process and Add ---           
            if (title && url) {
                try {
                    // Resolve relative URLs and ensure it's valid
                    const absoluteUrl = new URL(url, MAIN_URL).toString();

                    // Avoid duplicates based on URL
                    if (!seenUrls.has(absoluteUrl)) {
                        articles.push({
                            title: title.replace(/\s+/g, ' ').trim(), // Clean whitespace
                            url: absoluteUrl,
                            description: teaser ? teaser.replace(/\s+/g, ' ').trim() : null, // Clean whitespace
                            rawContent: rawContent ? rawContent.replace(/\s+/g, ' ').trim() : null, // Clean raw content
                            meta: {
                                publisher: "Al Jazeera",
                                language: 'en',
                                section: 'news',
                                publishedDate: null,
                            },
                            scrapedDate: new Date(),
                        });
                        seenUrls.add(absoluteUrl);
                    }
                 } catch (urlError) {
                     console.warn(`Skipping article card at index ${index}: Invalid URL (${url}) - ${urlError.message}`);
                 }
            } else {
                 // Log skipped articles for debugging, showing which field was missing
                 const missingFields = [];
                 if (!title) missingFields.push('title');
                 if (!url) missingFields.push('URL');
                 console.warn(`Skipping article card at index ${index}: Missing ${missingFields.join(' and ')}.`);
                 // console.warn(`HTML: ${articleElement.html().substring(0, 300)}...`); // Uncomment for detailed HTML
            }
        });

        console.log(`Parsed ${articles.length} unique articles from Al Jazeera main feed.`);
        return articles;

    } catch (error) {
        console.error(`Error scraping Al Jazeera main feed:`, error);
        // Return an empty array in case of error to maintain consistent return type
        return [];
    } finally {
        if (browser) {
            console.log(`Closing Puppeteer for Al Jazeera`);
            await browser.close();
        }
    }
};

// // Test function (uncomment to run locally for testing)
// const runTest = async () => {
//   console.log("Starting Al Jazeera scrape test...");
//   const feedItems = await getAljazeeraRSSFeed();
//   if (feedItems && feedItems.length > 0) {
//       console.log("\n--- Scraped Al Jazeera Feed Items ---");
//       console.log(JSON.stringify(feedItems, null, 2)); // Log all items
//       console.log(`Total unique items scraped: ${feedItems.length}`);
//   } else if (feedItems) {
//       console.log("Scraping finished, but no items were found or an error occurred.");
//   } else {
//       console.error("Scraping function returned undefined or null.");
//   }
// };

// runTest(); // Uncomment to run the test


const scrapeArticle = async (url) => {
    let browser = null;
    try {
        console.log(`Launching Puppeteer for Al Jazeera article: ${url}`);
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new',
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.setViewport({ width: 1366, height: 768 });

        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        const htmlContent = await page.content();
        console.log(`Successfully fetched content for: ${url}`);

        const $ = cheerio.load(htmlContent);

        const articleData = {
            title: null,
            subheadline: null,
            body: '', // Initialize as empty string
            publishedDate: null,
            source: null,
        };

        // Extract Title
        articleData.title = $('main#main-content-area header h1').first().text().trim();

        // Extract Subheadline
        articleData.subheadline = $('main#main-content-area header p.article__subhead').first().text().trim();

        // Extract Published Date
        // Al Jazeera often hides the actual date text, using the aria-hidden span
        const dateText = $('div.article-dates div.date-simple span[aria-hidden="true"]').first().text().trim();
        if (dateText) {
            // Basic attempt to parse - might need refinement if formats vary
            try {
                // Assuming format like "12 Apr 2025"
                const parsed = new Date(dateText);
                if (!isNaN(parsed)) {
                    articleData.publishedDate = parsed.toISOString();
                }
            } catch (e) {
                console.warn(`Could not parse date string: ${dateText}`);
            }
        }

        // Extract Source
        articleData.source = $('div.article-source').text().replace('Source:', '').trim();

        // Extract Body Content (more robust approach)
        const contentContainer = $('div.wysiwyg--all-content').first();
        let bodyContent = [];

        if (contentContainer.length) {
            contentContainer.children().each((index, element) => {
                const el = $(element);
                const tagName = el.prop('tagName')?.toLowerCase();

                // Skip known non-content blocks directly
                if (el.hasClass('more-on') || el.hasClass('container--ads') || el.hasClass('sib-newsletter-form')) {
                    return; // like continue
                }

                // Process relevant tags
                if (tagName === 'p') {
                    const paragraphText = el.text().replace(/\s+/g, ' ').trim();
                    if (paragraphText) {
                        bodyContent.push(paragraphText);
                    }
                } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                    // Keep headings as separate paragraphs for now, can format as Markdown later if needed
                    const headingText = el.text().replace(/\s+/g, ' ').trim();
                    if (headingText) {
                        // Prepending with hashes for potential Markdown conversion
                        // bodyContent.push(`${'#'.repeat(parseInt(tagName[1]))} ${headingText}`);
                        bodyContent.push(`**${headingText}**`); // Simple bolding for structure
                    }
                } else if (tagName === 'ul') {
                     el.find('li').each((i, li) => {
                        const itemText = $(li).text().replace(/\s+/g, ' ').trim();
                        if(itemText) bodyContent.push(`* ${itemText}`);
                     });
                } else if (tagName === 'figure' && el.hasClass('article-featured-image')) {
                    // Skip the main featured image already handled elsewhere
                } else if (tagName === 'figure') {
                     const imgSrc = el.find('img').attr('src');
                     const caption = el.find('figcaption').text().replace(/\s+/g, ' ').trim();
                     if (imgSrc) bodyContent.push(`[Image: ${caption || imgSrc}]`); // Placeholder
                }
                // Add handling for other tags like blockquotes, lists if needed
            });
            articleData.body = bodyContent.join('\n\n'); // Join paragraphs
        } else {
            console.warn(`Could not find main content container 'div.wysiwyg--all-content' for ${url}`);
            // Fallback: try to grab all p tags within the main area, less reliable
             articleData.body = $('main#main-content-area p').map((i, el) => $(el).text().trim()).get().join('\n\n');
        }

        // Final formatting
        const formattedArticle = {
            url: url,
            title: articleData.title,
            subheadline: articleData.subheadline,
            rawContent: articleData.body, // Use rawContent for consistency
            meta: {
                publisher: "Al Jazeera",
                language: 'en', // Assuming English
                publishedDate: articleData.publishedDate,
                sourceAttribution: articleData.source
                // Add tags if discoverable later
            },
            scrapedDate: new Date(),
        };

        return formattedArticle;

    } catch (error) {
        console.error(`Error scraping Al Jazeera article ${url}:`, error);
        return { url: url, title: null, rawContent: null, meta: { publisher: "Al Jazeera" }, error: error.message };
    } finally {
        if (browser) {
            console.log(`Closing Puppeteer for Al Jazeera article: ${url}`);
            await browser.close();
        }
    }
};

const aljazeera = {
    scrapeFeed,
    scrapeArticle,
}

export { aljazeera };
