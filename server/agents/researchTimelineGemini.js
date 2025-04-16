import { extractJsonFromString } from '../utils/extractJson.js';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const fetchGroundedTimeline = async (prompt, systemInstruction) => {
  const response = await gemini.models.generateContent({
    // model: "gemini-2.5-pro-exp-03-25",
    model: "gemini-2.0-flash",
    contents: [
        prompt,
    ],
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction,
      temperature: 0.2,
      responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                  properties: {
                    date: {
                      type: Type.STRING,
                      description: "The date of the historical event.",
                    },
                    description: {
                      type: Type.STRING,
                      description: "A clear and concise, factual description of the historical event.",
                      nullable: false,
                    },
                },
                },
              },
            },
  });
  const json = extractJsonFromString(response.text);
  return json?.timelineData || [];
}


const SYSTEM_PROMPT = `# Role: You are an AI research agent working for Lightcone.news. Our platform aims to provide users with deep, factual context surrounding important news events. Your specific role is to research and compile a **comprehensive historical timeline** related to a given news article. This timeline should capture events leading up to, causing, or providing essential background for the topic discussed in the article.

# Core Task: Research and Compile Comprehensive Timeline Events

# Instructions & Guidelines:
1.  **Research Focus:** Analyze the provided news article to identify the key entities (people, organizations, places), topics, and the core event. Use these as starting points for your historical research.
2.  **Identify Relevant Events:** Search for specific dates, actions, decisions, statements, previous occurrences, and significant developments that form the historical background or causal chain leading to the situation described in the news article.
3.  **Prioritize Relevance:** Gather a wide range of relevant data points, but only return events that immediately help readers understand the news article better. In most cases, the timeline should have 5-12 events, depending on the history of the topic.
4.  **Temporal Scope:** Determine an appropriate start date for the timeline based on the topic's origins. The timeline should extend up to the date of the news article or the events immediately preceding it. Consider increasing the density of events (granularity) as you approach the present day.
5.  **Factual Accuracy & Sourcing:** Focus on factual events reported by reliable sources (e.g., established news outlet, official government/organization site, academic paper, historical archive).
6.  **Event Descriptions:** Write clear, extremely concise, objective descriptions for each event. Avoid interpretation or analysis - just state the facts.
7.  **Language:** Use sources in whatever language is most likely to provide the most relevant information. Provide your response in English.

# Output Format:
Return a single, valid JSON object. This object should contain one key: "timelineData". The value associated with this key must be a list of timeline event objects. Each event object within the list must strictly adhere to the following structure:
\`\`\`json
{
  "timelineData": [
    {
      "date": "YYYY-MM-DD" or "YYYY-MM" or "YYYY", // Be as precise as the source allows
      "event": "A clear and concise, factual description of the historical event.",
      "sourceUrl": "URL String of a reputable source, or null if none found/applicable"
    },
    // ... potentially many more event objects
  ]
}
\`\`\``;

const PROMPT = `What events led to, caused or provided essential background for the situation described in the news article below?`;

export const researchTimeline = async (draftArticle, opts = {}) => {

    const prompt = (opts.prompt || PROMPT) + draftArticle;
    const systemPrompt = (opts.systemPrompt || SYSTEM_PROMPT);
    
  const result = await fetchGroundedTimeline(prompt, systemPrompt);
  console.log(result);
  process.exit(0);

    const content = result.choices[0].message.content;
    const timelineJson = extractJsonFromString(content);
      let timelineMd = 'No timeline found';
      if (timelineJson && timelineJson.timelineData && timelineJson.timelineData.length) {
        timelineMd = "# Timeline\n\n";
        timelineJson.timelineData.forEach(event => {
            timelineMd += `- ${event.date}: ${event.event}`
            if(event.sourceUrl) timelineMd += ` (${event.sourceUrl})`;
            timelineMd += "\n";
        });
    }

    return {
      citations: result.citations || [],
      related_questions: result.related_questions || [],
      raw_content: content,
      json: timelineJson ?? [],
      md: timelineMd,
    };
  
};

//  // Test with german article
const fs = await import('fs');
const draftArticle = `Musk kritisiert Trump-Berater
"Navarro ist dümmer als ein Sack Ziegel"
Stand: 08.04.2025 20:52 Uhr
Das von den USA ausgelöste Zollchaos sorgt für offenen Streit unter den Beratern von Präsident Trump. Tech-Milliardär Musk nannte den Architekten der Zollpolitik, Navarro, einen "Idioten". Dieser hatte zuvor Musks Firma Tesla kritisiert.Tech-Milliardär Elon Musk eskaliert seine Fehde mit dem Architekten von Donald Trumps Zoll-Rundumschlag mit öffentlichen Beschimpfungen. Peter Navarro sei "wirklich ein Idiot" und "dümmer als ein Sack Ziegel", schrieb Musk auf seiner Online-Plattform X.`;
const res = await researchTimeline(draftArticle);
fs.writeFileSync('res.json', JSON.stringify(res, null, 2));
