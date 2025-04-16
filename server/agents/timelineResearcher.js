import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import dotenv from 'dotenv';
dotenv.config();

const MODEL = "gemini-2.5-pro-exp-03-25";
// const MODEL = "gemini-2.0-flash";

const model = new ChatGoogleGenerativeAI({
  model: MODEL ,
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 1,
  maxRetries: 3,
}).bindTools([{ googleSearch: {} }]);


const system = `# Role: You are an AI research agent working for Lightcone.news. Our news aggregation platform aims to provide users with deep, factual context surrounding important news events. Your specific role is to research and compile a **comprehensive historical timeline** related to a given news article. This timeline should capture events leading up to, causing, or providing essential background for the topic discussed in the article.

# Core Task: Research and Compile Comprehensive Timeline Events

# Instructions & Guidelines:
1.  **Research Focus:** Analyze the provided news article to identify the key entities (people, organizations, places), topics, and the core event. Use these as starting points for your historical research.
2.  **Identify Relevant Events:** Search for specific dates, actions, decisions, statements, previous occurrences, and significant developments that form the historical background or causal chain leading to the situation described in the news article.
3.  **Prioritize Relevance:** Gather a wide range of relevant data points, but only return events that immediately help readers understand the news article better. In most cases, the timeline should have 5-12 events, depending on the history of the topic.
4.  **Temporal Scope:** Determine an appropriate start date for the timeline based on the topic's origins. The timeline should extend up to the date of the news article or the events immediately preceding it. Consider increasing the density of events (granularity) as you approach the present day.
5.  **Factual Accuracy & Sourcing:** Focus on factual events reported by reliable sources (e.g., established news outlet, official government/organization site, academic paper, historical archive).
6.  **Event Descriptions:** Write clear, extremely concise, objective descriptions for each event. Avoid interpretation or analysis - just state the facts.
7.  **Language:** Use sources in whatever language is most likely to provide the most relevant information. Provide your response in English.
8.  **Sources**: Only use reputable, trustworthy, authoritative sources. NEVER reference sources that are clickbait, fake news, or otherwise unreliable, or which may be perceived as such. The quality of the sources must reflect the high journalistic standards of Lightcone.news.

# Output Format:
Return a single, valid JSON object. This object should contain an array of event objects. Each event object within the array must strictly adhere to the following structure:
\`\`\`json
[
    {
      "date": "YYYY-MM-DD" or "YYYY-MM" or "YYYY", // Be as precise as the source allows
      "event": "A clear and concise, factual description of the historical event.",
      "sourceUrl": "URL String of the reputable source from which the information was extracted, or null if none found/applicable"
    },
    // ... potentially many more event objects
  ]
\`\`\`

Note: the system uses javascript, so please pay extra attention to escaping any quotation marks inside the event description. Failure to do so will result in a syntax error.`;

const prompt = `What events led to, caused or provided essential background for the situation described in the news article below?`;


export const timelineResearcher = async (articleMd) => {
  
  const messages = [{role: "system", content: system}, {role: "user", content: prompt + "\n\n" + articleMd}];
  const researchResults = await model.invoke(messages);
  return researchResults.content;
  
};

//  // Test with german article
// const fs = await import('fs');
// const { extractJsonFromString } = await import('../utils/extractJson.js');
// const draftArticle = `Musk kritisiert Trump-Berater
// "Navarro ist dümmer als ein Sack Ziegel"
// Stand: 08.04.2025 20:52 Uhr
// Das von den USA ausgelöste Zollchaos sorgt für offenen Streit unter den Beratern von Präsident Trump. Tech-Milliardär Musk nannte den Architekten der Zollpolitik, Navarro, einen "Idioten". Dieser hatte zuvor Musks Firma Tesla kritisiert.Tech-Milliardär Elon Musk eskaliert seine Fehde mit dem Architekten von Donald Trumps Zoll-Rundumschlag mit öffentlichen Beschimpfungen. Peter Navarro sei "wirklich ein Idiot" und "dümmer als ein Sack Ziegel", schrieb Musk auf seiner Online-Plattform X.`;
// const res = await timelineResearcher(draftArticle);
// console.log(extractJsonFromString(res));
// fs.writeFileSync('res.json', JSON.stringify(res, null, 2));
