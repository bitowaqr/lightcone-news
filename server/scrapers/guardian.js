import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GUARDIAN_API_KEY;
const scrapeFeed = async () => {
    const API_URL = "https://content.guardianapis.com/search?api-key=" + API_KEY + "&page-size=50&page=1"
    const response = await fetch(API_URL);
    const data = await response.json();
    console.log(data);
}

const scrapeArticle = async (articleId) => {
    "https://content.guardianapis.com/education/2025/apr/14/stress-taking-immense-toll-on-teachers-in-england-as-union-debates-industrial-action?api-key=77ab8ef1-de88-41f4-b91a-ac40dbf81fb5&show-fields=firstPublicationDate,byline,headline,trailText,bodyText"
}

scrapeFeed();