import { mongoService } from './mongo.js';
import { scenariosToMarkdown } from '../utils/scenarioModelToString.js';
import { researchTimeline } from "../agents/researchTimeline.js";
import { findScenariosForArticle } from "../services/findScenariosforArticle.js";
import { contextualiser } from "../agents/contextualiser.js";
import { copyEditor } from "../agents/copyEditor.js";

export const createArticlePipeline = async (opts = {}) => {

    console.log('createArticlePipeline started.');

    const {
        article,
        addTimeline = true,
        scenariosN = 20,
        promptsN = 20,
    } = opts;    

    if (!article || !article.title || !article.precis || !article.summary) {
        throw new Error('opts: Missing title, precis and/or summary.');
    }

const articleMd = `# Title:\n ${article.title}\n\n# Precis:\n ${article.precis}\n\n# Summary:\n ${article.summary}`

let timelineStr = null;
if (addTimeline) {
    console.log('researchTimeline started.');
    const timeline = await researchTimeline(articleMd);
    timelineStr = timeline?.md
}
    
    console.log('findScenariosForArticle started.');
    const scenarios = await findScenariosForArticle(articleMd, scenariosN);
    const scenariosStr = scenariosToMarkdown(scenarios);
    
    console.log('contextualiser started.');
    const contextualContent = await contextualiser(
        { article: articleMd, timeline: timelineStr, scenarios: scenariosStr, numberOfPrompts: promptsN });
    
    console.log('----------------');
    console.log('----------------');
    console.log('----------------');
    console.log('contextualContent');
    console.log(contextualContent);
    console.log('----------------');
    console.log('----------------');
    console.log('----------------');
    const { scenariosIncluded, timeline, suggestedPrompts, tags } = contextualContent;

    
    console.log('copyEditor started.');
    const finalArticle = await copyEditor({
        draftArticle: article,
        timeline: timeline,
        scenarios: scenariosIncluded,
        suggestedPrompts: suggestedPrompts,
        tags: tags,
    });

    console.log('copyEditor finished.');
    return finalArticle;
}










(async () => {
    const fs = await import('fs');
    const article = {
        "title": "Black-Red Coalition: Not Every Beginning Holds Magic",
        "precis": "Germany's fifth federal coalition between the Union (CDU/CSU) and SPD has been formed, presenting a coalition agreement focused on stability and responsibility rather than radical change. The agreement prioritizes economic incentives, migration control building on previous policies, and pragmatic defense measures without reinstating conscription.",
        "summary": "The new CDU/CSU and SPD coalition agreement, titled 'Responsibility for Germany,' emphasizes stability over the 'progress' narrative of the previous 'Traffic Light' government. Key economic proposals include tax incentives for investment and overtime work, lower energy costs, and scrapping the national supply chain law. Migration policies largely continue the previous government's direction with border controls and deportations, but add the removal of automatic 'Bürgergeld' for Ukrainian refugees and abolish naturalization after three years. Defense focuses on voluntary service, systematic registration of potential recruits, and accelerating infrastructure and procurement, funded partly by pre-agreed special funds. The analysis suggests that while not revolutionary, this pragmatic approach combined with significant funding might provide needed stability in a turbulent global environment.",
      }

const res = await createArticlePipeline({article});
fs.writeFileSync('res.json', JSON.stringify(res, null, 2));
console.log(res);

await mongoService.disconnect();
})();