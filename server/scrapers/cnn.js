import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
puppeteer.use(StealthPlugin());

// scrape: https://openrss.org/www.cnn.com/world
const urls = [
    "https://openrss.org/www.cnn.com/world",
    "https://openrss.org/www.cnn.com/us",
    "https://openrss.org/www.cnn.com/politics",
    "https://openrss.org/www.cnn.com/business",
    "https://openrss.org/www.cnn.com/tech",
    "https://openrss.org/www.cnn.com/health",
    "https://openrss.org/www.cnn.com/entertainment",
    "https://openrss.org/www.cnn.com/travel",
    "https://openrss.org/www.cnn.com/money",
    "https://openrss.org/www.cnn.com/sports",
    "https://openrss.org/www.cnn.com/science",
]

const scrapeCNNWorld = async (url) => {
    let browser = null;

    try {
        console.log(`Launching Puppeteer for URL: ${url}`);
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new',
        });
        const page = await browser.newPage();

        console.log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 }); // Wait until network is idle, max 20s

        // Optional explicit wait if networkidle0 isn't enough
        console.log('Waiting for potential dynamic content...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

        const htmlContent = await page.content();
        console.log(`Successfully fetched content from: ${url}`);

        const $ = cheerio.load(htmlContent);
        const items = [];

        $('div.items details').each((index, element) => {
            const item = {};
            const summarySection = $(element).find('summary section');
            const descriptionSection = $(element).find('section.description');

            item.title = summarySection.find('h2 a').text().trim();
            item.url = summarySection.find('h2 a').attr('href');
            item.publishedDateRaw = summarySection.find('time').attr('datetime');
            item.publishedDateText = summarySection.find('time').text().trim();

            item.imageUrl = descriptionSection.find('a img').attr('src');

            // Extract article content paragraphs
            const paragraphs = [];
            descriptionSection.find('.article__content p.paragraph').each((i, p) => {
                 // Ignore editor's note if present within the paragraphs
                 if (!$(p).hasClass('editor-note')) {
                    paragraphs.push($(p).text().trim());
                 }
            });
            item.content = paragraphs.join('\n\n');

            // Sometimes content might be directly in the description div if no paragraphs
            if (!item.content) {
                 // Attempt to get text directly from article__content, excluding potential nested elements we already capture or don't want
                 const directContent = descriptionSection.find('.article__content')
                    .clone() // Clone to avoid modifying the original DOM
                    .children('div, h2, .related-content') // Select elements to remove
                    .remove() // Remove them
                    .end() // Go back to the cloned .article__content
                    .text()
                    .trim();

                // Basic cleanup
                item.content = directContent.replace(/\s+/g, ' ').trim();
            }


             // Add meta information
             item.meta = {
                publisher: "CNN",
                publishedDate: item.publishedDateRaw ? new Date(item.publishedDateRaw) : null,
             };
             item.scrapedDate = new Date();


            // Add source info if available
             const sourceLocation = descriptionSection.find('.source__location').text().trim();
             const sourceText = descriptionSection.find('.source__text').text().trim();
             if (sourceLocation || sourceText) {
                 item.meta.sourceLocation = sourceLocation || null;
                 item.meta.sourceText = sourceText || null;
             }


            items.push(item);
        });

        console.log(`Parsed ${items.length} items.`);
        // console.log(JSON.stringify(items, null, 2)); // Optional: Log the parsed items
        return items;

    } catch (error) {
        console.error(`Error scraping CNN World feed at ${url}:`, error);
        return { error: error.message };
    } finally {
        if (browser) {
            console.log(`Closing Puppeteer for URL: ${url}`);
            await browser.close();
        }
    }
};


// // Example usage:
// const runScrape = async () => {
//   const articles = await scrapeCNNWorld(urls[urls.length - 1]);
//   if (articles && !articles.error) {
//       console.log(`Successfully scraped ${articles.length} articles.`);
//       fs.writeFileSync('cnn-world.json', JSON.stringify(articles, null, 2));
//     // Further processing or saving logic here...
//     // console.log(articles[0]); // Log the first article for inspection
//   } else {
//     console.error("Scraping failed:", articles?.error);
//   }
// };

// runScrape();

// Export the function if it's meant to be used as a module
export { scrapeCNNWorld };

        
