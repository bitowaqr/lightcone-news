import Exa from "exa-js"
import dotenv from "dotenv"
import { tool } from "@langchain/core/tools"
import { z } from "zod"
dotenv.config()

const exa = new Exa(process.env.EXA_API_KEY);

export const exaSearch = tool(
    async ({ query, numResults = null, searchPrompt = null, fullText = true }, config) => {
        console.log("exaSearch", query, numResults, searchPrompt, fullText)


        const params = {
            type: "keyword",
            numResults: numResults || 10,
            text: { 
                includeHtmlTags: true,
                maxCharacters: 1_000 
            },
            highlights: { 
                highlightsPerUrl: 3,
                numSentences: 2,
                query: "highlight query"
            }
        }
        if (searchPrompt) params.summary = {query: searchPrompt}
        if (fullText) {
            params.text = { maxCharacters: 1_000 }
        }
         

        const result = await exa.searchAndContents(
            query,
            params
        );
        const messages = result?.results || [];
        return { messages };
    },
    {
        name: "smart_search",
        description: "Searches the internet for information and provides a summary of the results with respect to a specific search prompt (if provided).",
        schema: z.object({
            query: z.string().describe("The search query (keywords) to find relevant information"),
            numResults: z.number().describe("The number of results to return. Default is 10. Maximum is 25.").optional(),
            searchPrompt: z.string().describe("A prompt to summarize the search results with respect to a specific question. If not provided, the search results will not be summarized. For example you can search for 'FC Barcelona vs Real Madrid betting odds' and then provide a prompt to 'Extract the odds for each team', or you could search for 'Election results Germany' and then provide a prompt to 'extract the results for each party as a percentage in the form 'Party X: 25%, Party Y: 30%, ...'. If used, you should add instructions on how to respond if no relevant information is not found, e.g. 'If no relevant information is found, respond with 'No relevant information found (no need to explain)'").optional(),
        }),
    }
);



// Example usage
// (async () => {
//     const result = await exaSearch.invoke({ query: "blog post about Rust" })
//     console.log(result)
// })()