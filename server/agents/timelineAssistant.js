import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const MODEL = "gemini-2.0-flash";

const timelineSchema = z.array(z.object({
  date: z.string(),
  event: z.string(),
  sourceUrl: z.string().optional(),
}));

const summariser = new ChatGoogleGenerativeAI({
  model: MODEL,
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0.1,
  maxRetries: 3,
})

const structuredSummariser = summariser.withStructuredOutput(timelineSchema);

export const timelineAssistant = async (timelineData) => {
  
  const system = {
    role: "system", content: `# Role: You are an AI Assistant working togehter with an AI researcher. The AI researcher is investigating the historical context of some news events, but they failed to provide the data in the right format. Your task is to format the researcher's data and return it into a strutured way. Look at the potentially unstructured data and return a list of events in the provided format. Do not include any events for which you cannot find a date (for historical events, a year or a range of years may be sufficient, depending on the context).
    If you cannot find any timeline data in the provided data, return an empty array: [].`};
  
  const prompt = { role: "user", content: "Here is the timeline data: \n\n" + JSON.stringify(timelineData?.content || timelineData) };
  
  const messages = [system,prompt];
  const response = await structuredSummariser.invoke(messages);
  return response;  
  
};

// //  // Test with german article
// const {timelineResearcher} = await import('./timelineResearcher.js');
// const draftArticle = `Musk kritisiert Trump-Berater
// "Navarro ist dümmer als ein Sack Ziegel"
// Das von den USA ausgelöste Zollchaos sorgt für offenen Streit unter den Beratern von Präsident Trump. Tech-Milliardär Musk nannte den Architekten der Zollpolitik, Navarro, einen "Idioten". Dieser hatte zuvor Musks Firma Tesla kritisiert.Tech-Milliardär Elon Musk eskaliert seine Fehde mit dem Architekten von Donald Trumps Zoll-Rundumschlag mit öffentlichen Beschimpfungen. Peter Navarro sei "wirklich ein Idiot" und "dümmer als ein Sack Ziegel", schrieb Musk auf seiner Online-Plattform X.`;
// const data = await timelineResearcher(draftArticle);
// const structuredData = await timelineAssistant(data);
// console.log(structuredData);
