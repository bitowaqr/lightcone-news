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
  
  // save (draft) article
  async saveArticle(article) {
    await this.connect();
    const _article = await Article.findOneAndUpdate({ storyId: article.storyId }, article, { new: true, upsert: true });
    return _article;
  }
  
}

// Create and export a singleton instance
export const mongoService = new MongoService();
