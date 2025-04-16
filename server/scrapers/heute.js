import { parseStringPromise } from 'xml2js';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
puppeteer.use(StealthPlugin());


const RSS_URL = "https://www.zdf.de/rss/zdf/nachrichten"

const scrapeFeed = async () => {
    const response = await fetch(RSS_URL)
    const data = await response.text()
    const parsedData = await parseStringPromise(data, { explicitArray: false })
    
    const items = parsedData.rss.channel.item.map(item => {
      // Try extracting description from different possible fields
      let description = item.description;
      if (typeof item['media:group']?.['media:description'] === 'string') {
          description = item['media:group']['media:description'];
      }

      return {
        url: item.link,
          title: item.title,
        subtitle: item.category,
        description: description, // Use extracted description
        meta: {
          publisher: "ZDFheute",
          language: 'de', // Assuming German
          publishedDate: new Date(item.pubDate).toISOString(),
        }
      }
    })
  let now = new Date();
  // filter: last 48 hours
  return items.filter(item => {
    let itemDate = new Date(item.meta.publishedDate);
    return itemDate > new Date(now.getTime() - 48 * 60 * 60 * 1000);
  })
}

const scrapeArticle = async (url) => {
    let browser = null;
    try {
        console.log(`Launching Puppeteer for ZDFheute article: ${url}`);
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: 'new',
        });
        const page = await browser.newPage();
        // It's generally good practice to set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        const htmlContent = await page.content();
        console.log(`Successfully fetched content for: ${url}`);

        const $ = cheerio.load(htmlContent);

        const articleData = {
            title: null,
            author: null,
            publishedDate: null,
            rawContent: '',
            tags: [],
            sourceAttribution: null,
        };

        // --- Metadata Extraction (Purely Semantic) ---

        // Title: Prefer H1 within main, fallback to first H1/H2 on page
        articleData.title = $('main h1').first().text().trim();
        if (!articleData.title) {
             articleData.title = $('h1').first().text().trim();
        }
         if (!articleData.title) {
             articleData.title = $('h2').first().text().trim(); // Last resort fallback
        }
        // Removed class-specific title check

        // Date: Look for <time datetime="..."> within main or header
        articleData.publishedDate = $('main time[datetime], header time[datetime]').first().attr('datetime');
        if (!articleData.publishedDate) {
             articleData.publishedDate = $('meta[property="article:published_time"]').attr('content') || $('meta[name="date"]').attr('content');
        }

        // Author: Meta tag is the most reliable semantic source
        articleData.author = $('meta[name="author"]').attr('content');

        // --- Body Content Extraction (Strictly Semantic Tags & Filtering) ---
        let bodyContent = [];
        const mainContent = $('main');
        const addedTexts = new Set(); // Prevent adding duplicate paragraphs if structure is odd

        // Function to clean text
        const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

        // Function to check if an element or its ancestors should be skipped based on TAGS ONLY
        const isSkippable = (el) => {
             const skipTags = ['script', 'style', 'iframe', 'nav', 'aside', 'footer', 'button', 'input', 'figure']; // Figure added to skip images/videos by default
             if (skipTags.includes(el.prop('tagName')?.toLowerCase())) {
                 return true;
             }
             // Check closest ancestors for skip tags
             if (el.closest('nav, aside, footer, figure').length > 0) {
                  return true;
             }
             return false;
        };

        if (mainContent.length) {
             // Find potential content blocks: p, h2-h6, li, blockquote, and potentially divs (handle with care)
             mainContent.find('*').each((index, element) => { // Iterate through all descendants
                const el = $(element);

                 // 1. Skip based on tag name or ancestor tag name
                 if (isSkippable(el)) {
                     return; // Skip this element
                 }

                 // 2. Process based on specific allowed tags
                 const tagName = el.prop('tagName')?.toLowerCase();
                 let text = '';
                 let markdownPrefix = '';
                 let markdownSuffix = '';
                 let requiresDirectText = false; // Flag for divs

                 switch (tagName) {
                     case 'p':
                     case 'blockquote':
                         text = cleanText(el.text());
                         if (tagName === 'blockquote' && text) markdownPrefix = '> ';
                         break;
                     case 'h2':
                     case 'h3':
                     case 'h4':
                     case 'h5':
                     case 'h6':
                         text = cleanText(el.text());
                         if (text) {
                             markdownPrefix = '\n**';
                             markdownSuffix = '**\n';
                         }
                         break;
                     case 'li':
                         // Check parent, don't process if already handled by ul/ol logic potentially
                         if (!el.parent().is('ul, ol')) return;
                         text = cleanText(el.text());
                         if (el.parent().is('ul')) markdownPrefix = '* ';
                         else markdownPrefix = `${el.index() + 1}. `;
                         if (el.is(':last-child')) markdownSuffix = '\n';
                         break;
                     case 'ul':
                     case 'ol':
                         // We process LIs directly, so skip UL/OL containers
                         return;
                      case 'div':
                         // Process DIV text only if it's a 'leaf' node textually
                         if (el.children('p, h2, h3, h4, h5, h6, ul, ol, li, blockquote, div').length === 0) {
                            text = cleanText(el.text());
                         } else {
                             // Don't process text of divs that contain other block elements
                             return;
                         }
                         break;
                     default:
                         // Ignore other tags like span, a, time, etc. directly
                         return;
                 }

                 // 3. Add text if meaningful and not duplicate
                 if (text && text.length > 5 && !addedTexts.has(text)) {
                    bodyContent.push(markdownPrefix + text + markdownSuffix);
                    addedTexts.add(text);
                 }
            });
            articleData.rawContent = bodyContent.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();

            // --- Extract Source Attribution (Heuristic at the end) ---
            if (bodyContent.length > 0) {
                 const lastBlock = bodyContent[bodyContent.length - 1].replace(/\*\*|\* |> |\d+\. /g, '').trim();
                 if (lastBlock.startsWith('Quelle:')) {
                     articleData.sourceAttribution = lastBlock.replace('Quelle:', '').trim();
                     bodyContent.pop();
                 } else if (lastBlock.startsWith('Source:')) {
                      articleData.sourceAttribution = lastBlock.replace('Source:', '').trim();
                      bodyContent.pop();
                 }
                  articleData.rawContent = bodyContent.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
            }

        } else {
            console.warn(`Could not find <main> content container for ${url}`);
             articleData.rawContent = null;
        }

        // Final checks
        if (articleData.rawContent && articleData.rawContent.length < 100) {
             console.warn(`Extracted content seems very short (<100 chars) for ${url}. Check result.`);
        } else if (!articleData.rawContent) {
            console.error(`Failed to extract substantial content for ${url}`);
        }

        const formattedArticle = {
            url: url,
            title: articleData.title,
            rawContent: articleData.rawContent,
            meta: {
                publisher: "ZDFheute",
                language: 'de',
                author: articleData.author,
                publishedDate: articleData.publishedDate,
                tags: [], // Tags removed
                sourceAttribution: articleData.sourceAttribution
            },
            scrapedDate: new Date(),
        };

        if (!formattedArticle.title || !formattedArticle.rawContent) {
             console.error(`Scraping failed to produce title or substantial content for ${url}. Returning error.`);
             return { url: url, title: formattedArticle.title, rawContent: null, meta: { publisher: "ZDFheute", language: 'de' }, error: "Missing title or substantial content after scraping." };
        }
        return formattedArticle;

    } catch (error) {
        console.error(`Error scraping ZDFheute article ${url}:`, error);
        return { url: url, title: null, rawContent: null, meta: { publisher: "ZDFheute", language: 'de' }, error: error.message };
    } finally {
        if (browser) {
            console.log(`Closing Puppeteer for ZDFheute article: ${url}`);
            await browser.close();
        }
    }
};

const heute = {
    scrapeFeed,
    scrapeArticle,
}

export { heute };
  
  
// (async () => {
//     const art_url = "https://www.zdf.de/nachrichten/politik/wein-zoelle-winzer-eu-usa-100.html"
//     const article = await scrapeArticle(art_url);
//     console.log(article);
// })();