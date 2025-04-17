import slugify from 'slugify';
import mongoose from 'mongoose';
import Lineup from '../models/Lineup.model.js';
import Article from '../models/Article.model.js';
import Scenario from '../models/Scenario.model.js';
import StoryIdeas from '../models/StoryIdeas.model.js';
import dotenv from 'dotenv';
dotenv.config();

class MongoService {
    constructor() {
    this.mongoUri = process.env.MONGODB_URI;
    this.connection = mongoose.connection;
  }

  async connect() {
    if (mongoose.connection.readyState >= 1) return;
    try {
      await mongoose.connect(this.mongoUri);
    } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async disconnect() {
    if (mongoose.connection.readyState === 1) {
        await mongoose.disconnect();
    }
  }


  async updateScenario(scenario) {
    await this.connect();
    const _scenario = await Scenario.findOneAndUpdate({ _id: scenario._id }, { $set: scenario }, { new: true });
    return _scenario;
  }

  async saveScenarios(scenarios) {
    throw new Error('Not implemented');
      
    if (!scenarios || scenarios.length === 0) {
        throw new Error('No scenarios to save');
    }
    await this.connect();
    const savedScenarios = [];
    for (const scenario of scenarios) {
      const filter = {
        platform: scenario.platform,
        platformScenarioId: scenario.platformScenarioId,
      };

      if (!scenario.platform || !scenario.platformScenarioId) {
        console.error(
          `Scenario missing platform or platformScenarioId: ${scenario}`
        );
        continue;
      }

      try {
        const existing = await Scenario.findOne(filter).lean();
          // If scenario exists, only update specific fields
          let _scenario;
          if (existing) {
            const updateFields = {
              ...scenario,
            };
            _scenario = await Scenario.findOneAndUpdate(filter, { $set: updateFields }, { new: true }).lean();
          } else {
            _scenario = await Scenario.create(scenario);
          }
          _scenario.isNew = !existing;
        
        savedScenarios.push(_scenario);
      } catch (error) {
        console.error(
          `Error saving scenario (ID: ${
            scenario.platformScenarioId
          }, Question: "${scenario.question.substring(0, 30)}..."):`,
          error
        );
      }
    }

    // console.log(
    //   `MongoDB Summary: \nTotal: ${scenarios.length}, Created: ${savedScenarios.length}, Failed: ${
    //     scenarios.length - savedScenarios.length
    //   }`
    // );

    return savedScenarios;
  }


  
  
  // save lineup
  async saveLineup(lineup) {
    await this.connect();
    const _lineup = await Lineup.create(lineup);
    return _lineup;
  }

  // async getLatestLineup() {
  //   await this.connect();
  //   const lineup = await Lineup.findOne().sort({ createdAt: -1 });
  //   return lineup;
  // }

  async saveStoryIdeas(storyIdeas) {
    await this.connect();
    const _storyIdeas = await StoryIdeas.create(storyIdeas);
    return _storyIdeas;
  }

  async getStoryIdeasFromLatestLineup(ideaStatusOnly = true) {
    await this.connect();
    const storyIdeaFromLatestLineup = await StoryIdeas.findOne({ lineupId: { $exists: true } }).sort({ createdAt: -1 });
    const lastLineupId = storyIdeaFromLatestLineup.lineupId;
    const storyIdeas = await StoryIdeas.find({ lineup: lastLineupId._id }).sort({ priority: 1 });
    if (ideaStatusOnly) return storyIdeas.filter(story => story.status === 'idea');
    
    return storyIdeas;
  }
  
  // save (draft) article - Refactored to use .save()
  async saveArticle(articleData) {
    await this.connect();

    if (!articleData.storyId) {
        // Handle cases where storyId might be missing, depending on requirements
        // Maybe throw an error, or generate a default article without linking?
        // For now, let's assume storyId is essential for finding/creating.
        // If not, adjust the logic.
        console.warn("Attempting to save article without a storyId. Upsert might behave unexpectedly or create duplicates if title is used as key.");
        // As a fallback, let's try finding by title if storyId is missing, but this is less reliable
        // This fallback assumes title is unique enough for draft stages or requires manual intervention later.
        if (!articleData.title) throw new Error("Cannot save article without storyId or title.");
        // Let's proceed assuming findOrCreate logic based on storyId OR title (if storyId missing)
    }

    const query = articleData.storyId ? { storyId: articleData.storyId } : { title: articleData.title }; // Prioritize storyId

    try {
        let article = await Article.findOne(query);

        if (article) {
            // Article exists, update it
            // Update fields carefully, especially arrays/objects if needed
            Object.keys(articleData).forEach(key => {
                // Avoid overwriting the _id or potentially version key __v
                if (key !== '_id' && key !== '__v') {
                    article[key] = articleData[key];
                }
            });
            // Note: If updating arrays/nested objects, more specific logic might be needed
            // e.g., article.tags = articleData.tags; etc.
            console.log(`Updating existing article with storyId: ${articleData.storyId || 'N/A'} / title: ${articleData.title}`);
        } else {
            // Article doesn't exist, create a new one
            console.log(`Creating new article with storyId: ${articleData.storyId || 'N/A'} / title: ${articleData.title}`);
            article = new Article(articleData);
        }

        // Crucially, call .save() to trigger middleware (including slug generation)
        const savedArticle = await article.save();
        return savedArticle;

    } catch (error) {
        console.error(`Error saving article with storyId: ${articleData.storyId || 'N/A'} / title: ${articleData.title}:`, error);
        // Re-throw or handle as appropriate for your application flow
        throw error;
    }
  }
  
}

// Create and export a singleton instance
export const mongoService = new MongoService();
