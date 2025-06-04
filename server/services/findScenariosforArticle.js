import { embeddingService } from './embedding.js';
import { chromaService } from './chroma.js';
import Scenario from '../models/Scenario.model.js';
import { mongoService } from './mongo.js';

/**
 * Finds potentially relevant scenarios for a given article by embedding its content
 * and querying a vector database (ChromaDB).
 * @param {object} article - The article object (matching Article.model.js structure).
 * @param {number} [k=10] - The maximum number of relevant scenarios to retrieve.
 * @param {object} [filter={}] - Optional filter criteria to apply to the ChromaDB query (Where clause).
 * @returns {Promise<Array<string>>} - A promise that resolves to an array of relevant scenario IDs.
 * @throws {Error} If the article object is missing, embedding fails, or ChromaDB query fails.
 */
export async function findScenariosForArticle(article, nResults = 50, filter = {}) {
    
    if (!article) throw new Error('Article is required.');

    let articleText;
    if (typeof article === 'string') {
        articleText = article;
    } else {
        if(!article.title) throw new Error('Article title is required.');   
        // 1. Process article content for embedding if it's article object
        articleText = embeddingService.processArticleForEmbedding(article);
    }

    // 2. Generate embedding for the article
    let embeddings;
    
    embeddings = await embeddingService.generate([articleText]);
    const articleEmbedding = embeddings[0]; 

    // 3. Query ChromaDB for relevant scenarios
    const _similarScenarios = await chromaService.getScenarios([articleEmbedding], nResults, filter);
    
    let scenarios = [];
    if (_similarScenarios?.ids?.[0]?.length > 0) {
        await mongoService.connect();
        scenarios = await Scenario.find({ 
            _id: { $in: _similarScenarios?.ids?.[0] },
            platform: { $regex: /^polymarket$/i } // Case-insensitive match for 'polymarket'
        }).lean();
        scenarios.forEach((scenario, index) => {
            scenario.distance = _similarScenarios?.distances?.[0][index];
        });
    }

    // 4. Return the results
    return scenarios;
}

// export async function selectScenariosForArticle(article, scenarioIds, distances) {
//     const scenarios = await Scenario.find({ _id: { $in: scenarioIds } }).lean();
//     return scenarios;
// }


// Optional: Example Usage/Testing (Uncomment and adapt as needed)
// import Article from '../models/Article.model.js'; 
// import { mongoService } from './mongo.js';       // Adjust path as needed
// import dotenv from 'dotenv';
// dotenv.config(); // Ensure environment variables are loaded

// async function testFindScenarios() {
//     try {
//         await mongoService.connect(); // Ensure DB connection is established

//         // Fetch a sample published article (adjust query as needed)
//         const testArticle = await Article.findOne({ status: 'PUBLISHED' }).lean();


//         console.log("testArticle");
//         console.log(testArticle);
//         if (!testArticle) {
//             console.log("No published article found in the database for testing.");
//             return;
//         }

//         console.log(`Testing with article: "${testArticle.title}" (ID: ${testArticle._id})`);

//         // Find the top 5 relevant scenarios
//         const {ids, distances, metadatas} = await findScenariosForArticle(testArticle, 5);

//         console.log("ids");
//         console.log(ids);

//         console.log("distances");
//         console.log(distances);


//         const scenarios = await Scenario.find({ _id: { $in: scenarioIds } }).lean();

//         console.log("scenarios");
//         console.log(scenarios);

//         console.log("-------------------------------");

//     } catch (error) {
//         console.error("Test failed:", error);
//     } finally {
//         await mongoService.disconnect(); // Close DB connection
//         // Ensure ChromaDB client connection doesn't keep process alive if applicable
//         // (ChromaClient might not require explicit disconnect depending on implementation)
//         console.log("Test finished.");
//     }
// }

// // testFindScenarios(); // Uncomment to run the test function

