import Exa from "exa-js"
import dotenv from "dotenv"
import { tool } from "@langchain/core/tools"
import { z } from "zod"
dotenv.config()

const exa = new Exa(process.env.EXA_API_KEY);

export const exaSearch = tool(
    async ({ query, numResults = 10, searchPrompt = null, fullText = true }) => {

        let livecrawl = true;
        const params = {
            type: "auto",
            numResults: Math.min(numResults, 25),
        }
        if (searchPrompt) params.summary = {query: searchPrompt}
        if (fullText) {
            params.text = {
                maxCharacters: 5_000,
                includeHtmlTags: false,
            }
        }
        if(livecrawl) params.livecrawl = "always"
         

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
            searchPrompt: z.string().describe("A prompt to summarize the search results with respect to a specific question. If not provided, the search results will not be summarized. For example you can search for 'FC Barcelona vs Real Madrid betting odds' and then provide a prompt to 'Extract the odds for each team', or you could search for 'Election results Germany' and then provide a prompt to 'extract the results for each party as a percentage in the form 'Party X: 25%, Party Y: 30%, ...'. If used, you should add instructions on how to respond if no relevant information is not found, e.g. 'If no relevant information is found, respond with 'No relevant information found (no need to explain)'. You can leave this blank to receive the full text of the search results.and summarise them yourself.").optional(),
        }),
    }
);



// Example usage
// (async () => {
//     const result = await exaSearch.invoke({ query: "blog post about Rust" })
//     console.log(result)
// })()