import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());



const RSS_URL = "https://feeds.bbci.co.uk/news/"

const scrapeSectionRSSFeed = async (section) => {
    let url;
    if(section === 'news') {
        url = `${RSS_URL}rss.xml`
    } else {
        url = `${RSS_URL}${section}/rss.xml` // Corrected path for sections
    }
    try {
        const response = await fetch(url)
        if (!response.ok) {
             throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
        }
        const data = await response.text()
        const parsedData = await parseStringPromise(data, { explicitArray: false })
        
        // Add basic error handling/validation for parsed data
        if (!parsedData || !parsedData.rss || !parsedData.rss.channel || !parsedData.rss.channel.item) {
            console.warn(`Invalid RSS structure received from ${url}`);
            return []; // Return empty array if structure is invalid
        }
        // Ensure item is always an array
        const items = Array.isArray(parsedData.rss.channel.item) ? parsedData.rss.channel.item : [parsedData.rss.channel.item];
        const rssItems = items.map(item => ({ 
            title: item.title,
            url: item.link,
            description: item.description,
            meta: {
                publishedDate: new Date(item.pubDate)?.toISOString() || null,
                publisher: 'BBC',
                language: 'en',
                section: section,
            },
        }));
        let now = new Date()
        // last 48 hours only
        return rssItems.filter(item => {
            const publishedDate = new Date(item.meta.publishedDate)
            const hoursDiff = (now - publishedDate) / (1000 * 60 * 60)
            return hoursDiff <= 48
        })
    } catch (error) {
        console.error(`Error fetching or parsing BBC RSS feed for ${section}:`, error);
        return []; // Return empty array on error
    }
}


const scrapeFeed = async () => {
    const sections = [
        'news',
        'world',
        'politics',
        'technology',
        'science_and_environment',
    ]
    const rssFeeds = await Promise.all(sections.map(section => scrapeSectionRSSFeed(section)))
    const flattenedFeeds = rssFeeds.flat()
    // remove duplicates
    const uniqueFeeds = flattenedFeeds.filter((feed, index, self) =>
        index === self.findIndex((t) => t.url === feed.url)
    );
    return uniqueFeeds
}

// // // test RSS Feed
// const testRss = async () => {
//     const rssItems = await getBBCRSSFeeds()
//     console.log(rssItems)
//     console.log(rssItems ? rssItems.length : 0)
// }
// testRss();



const scrapeArticle = async (url) => {
  let browser = null;
  try {
    console.log(`Launching Puppeteer for BBC URL: ${url}`);
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: 'new',
    });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    const htmlContent = await page.content();
    console.log(`Successfully fetched content for: ${url}`);

    const $ = cheerio.load(htmlContent);

    const articleData = {
      headline: null,
      publishedDate: null,
      authors: [],
      body: '' // Initialize body as an empty string
    };

    // Extract Headline
    articleData.headline = $('h1[class*="headline"]').first().text().trim();
    if (!articleData.headline) {
        articleData.headline = $('article h1').first().text().trim();
    }

    // Extract Published Date
    const timeElement = $('time[datetime]').first();
    if (timeElement) {
        articleData.publishedDate = timeElement.attr('datetime');
    }

    // Extract Author(s)
    $('div[data-testid="byline-new-contributors"] div[class*="sc-b42e7a8f-5"]').each((i, el) => {
        const name = $(el).find('span[class*="sc-b42e7a8f-7"]').text().trim();
        const description = $(el).find('div[class*="sc-b42e7a8f-8"] span').first().text().trim();
        if (name) {
            articleData.authors.push({ name, description });
        }
    });

    // Extract Body Content preserving structure
    const contentBlocks = $('article > div[data-component]'); // Select direct children of article with data-component
    let bodyContent = [];

    contentBlocks.each((i, el) => {
        const componentType = $(el).data('component');

        if (componentType === 'text-block') {
            $(el).find('p').each((j, p) => {
                const text = $(p).text().trim();
                 // Check if it contains bold text often used for inline "subheadings"
                const boldText = $(p).find('b').first().text().trim();
                if (boldText && text.startsWith(boldText)) {
                    bodyContent.push(`\n**${boldText}**\n${text.substring(boldText.length).trim()}`);
                } else {
                    bodyContent.push(text);
                }
            });
        } else if (componentType === 'subheadline-block') {
            const subhead = $(el).find('h2').text().trim();
            if (subhead) {
                bodyContent.push(`\n## ${subhead}\n`);
            }
        } else if (componentType === 'image-block') {
            const img = $(el).find('img');
            const src = img.attr('src');
            const alt = img.attr('alt') || '';
            if (src) {
                 bodyContent.push(`\n![${alt}](${src})\n`);
            }
             const caption = $(el).next('div[data-component="caption-block"]').find('figcaption').text().trim();
            if (caption) {
                bodyContent.push(`*${caption}*\n`);
            }
        } else if (componentType === 'video-block') {
            bodyContent.push(`\n[Video Content]\n`); // Placeholder for video
            const caption = $(el).next('div[data-component="caption-block"]').find('figcaption').text().trim();
            if (caption) {
                bodyContent.push(`*${caption}*\n`);
            }
        } else if (componentType === 'list-block') {
             $(el).find('ul > li').each((k, li) => {
                 const linkText = $(li).find('a').text().trim();
                 const linkHref = $(li).find('a').attr('href');
                 if(linkText && linkHref) {
                     bodyContent.push(`* [${linkText}](${linkHref})`);
                 } else if (linkText) { // Handle potential list items without links
                     bodyContent.push(`* ${linkText}`);
                 }
             });
             bodyContent.push('\n'); // Add space after list
        }
        // Add other component types as needed (e.g., embed-block)
    });

    articleData.body = bodyContent.join('\n\n').replace(/\n{3,}/g, '\n\n').trim(); // Join with double newline, remove excess newlines

    // Basic cleanup for headline
     if (articleData.headline) {
      articleData.headline = articleData.headline.replace(/\s+/g, ' ').trim();
    }

     // Format the output
    const formattedArticle = {
        url: url,
        title: articleData.headline,
        rawContent: articleData.body,
        meta: {
            publisher: "BBC",
            publishedDate: articleData.publishedDate,
            authors: articleData.authors,
            // Potentially extract tags if available (e.g., from a tags component)
            tags: $('div[data-component="tags"] a').map((i, el) => $(el).text().trim()).get()
        },
        scrapedDate: new Date(),
    };

    // console.log("Formatted BBC Article:", formattedArticle);
    return formattedArticle;

  } catch (error) {
    console.error(`Error scraping BBC article ${url}:`, error);
    return { title: null, rawContent: null, meta: { publisher: "BBC" }, error: error.message };
  } finally {
    if (browser) {
      console.log(`Closing Puppeteer for BBC URL: ${url}`);
      await browser.close();
    }
  }
};

// // Test function
// const runTest = async () => {
//     const testArtUrl = "https://www.bbc.com/news/articles/c4g86jy6jggo"
//   const articleContent = await scrapeArticle(testArtUrl);
//   console.log("\n--- Scraped BBC Article Content ---");
//   console.log(JSON.stringify(articleContent, null, 2));
//   if (articleContent.error) {
//       console.error("Scraping error:", articleContent.error);
//   }
// }

// runTest();

const bbc = {
    scrapeSectionRSSFeed,
    scrapeFeed,
    scrapeArticle
}

export { bbc };