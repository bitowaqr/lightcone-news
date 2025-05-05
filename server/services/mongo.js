import slugify from 'slugify';
import mongoose from 'mongoose';
import Lineup from '../models/Lineup.model.js';
import Article from '../models/Article.model.js';
import Scenario from '../models/Scenario.model.js';
import StoryIdeas from '../models/StoryIdeas.model.js';
import Forecaster from '../models/Forecaster.model.js';
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

  // Add the new saveScenario function here
  async saveScenario(scenarioData) {
    await this.connect();
    try {
        // Set default status if not provided (should generally be set before calling)
        const dataToSave = {
            ...scenarioData,
            status: scenarioData.status || 'PENDING', // Ensure status is PENDING
        };

        // Handle linking article if articleId is present
        if (scenarioData.articleId) {
            // Ensure it's a valid ObjectId if using mongoose refs
            if (mongoose.Types.ObjectId.isValid(scenarioData.articleId)) {
                 // Add articleId to the relatedArticleIds array
                 // Use $addToSet to avoid duplicates if scenarioData already has it
                dataToSave.relatedArticleIds = [
                    ...(scenarioData.relatedArticleIds || []),
                    scenarioData.articleId
                ];
                // Remove potential duplicate if it was already there
                dataToSave.relatedArticleIds = [...new Set(dataToSave.relatedArticleIds.map(id => id.toString()))];

            } else {
                console.warn(`Invalid articleId (${scenarioData.articleId}) provided when saving scenario. Skipping linking.`);
            }
            // Remove articleId from top level as it's now in relatedArticleIds
            // delete dataToSave.articleId; // Keep it for now, model might handle it
        }

        console.log('Attempting to create Scenario with data:', dataToSave);
        const newScenario = new Scenario(dataToSave);
        const savedScenario = await newScenario.save();
        console.log(`Saved new scenario with ID: ${savedScenario._id}`);

        // **Important**: Manually trigger the Article update if needed here
        // The Scenario post-save hook updates Articles, but only if relatedArticleIds CHANGES during save.
        // Since we are setting it on CREATE, the hook might not see a change.
        // We need to explicitly update the related Article here.
        if (savedScenario.relatedArticleIds && savedScenario.relatedArticleIds.length > 0) {
             console.log(`Explicitly updating related articles: ${savedScenario.relatedArticleIds.join(', ')} to add scenario ${savedScenario._id}`);
             await Article.updateMany(
                { _id: { $in: savedScenario.relatedArticleIds } },
                { $addToSet: { relatedScenarioIds: savedScenario._id } }
             );
        }

        return savedScenario;
    } catch (error) {
        console.error('Error saving scenario:', error);
        // Check for specific errors like duplicate keys if needed
        if (error.code === 11000) { // Duplicate key error
             console.error(`Duplicate key error saving scenario. Platform/ID: ${scenarioData.platform}/${scenarioData.platformScenarioId}`);
             // Handle duplicate scenario error - maybe return existing or throw specific error
             throw new Error(`Duplicate scenario error for ${scenarioData.platform}/${scenarioData.platformScenarioId}`);
        }
        throw error; // Re-throw other errors
    }
  }

  async getStoryIdeasFromLatestLineup(ideaStatusOnly = true) {
    await this.connect();
    const storyIdeaFromLatestLineup = await StoryIdeas.findOne({ lineupId: { $exists: true } }).sort({ createdAt: -1 });
    const lastLineupId = storyIdeaFromLatestLineup.lineupId;
    const storyIdeas = await StoryIdeas.find({ lineup: lastLineupId._id }).sort({ priority: 1 });
    if (ideaStatusOnly) return storyIdeas.filter(story => story.status === 'idea');
    
    return storyIdeas;
  }

  async updateStoryStatus(storyId, status) {
    await this.connect();
    const story = await StoryIdeas.findOneAndUpdate({ _id: storyId }, { $set: { status } }, { new: true });
    return story;
  }
  
  // save (draft) article - Refactored to use .save()
  async saveArticle(articleData) {
    await this.connect();

    // Determine the primary key for finding/updating
    // Priority: _id > storyId > title
    let query;
    if (articleData._id) {
        query = { _id: articleData._id };
        console.log(`Attempting to save article using provided _id: ${articleData._id}`);
    } else if (articleData.storyId) {
        // Handle cases where storyId might be missing, depending on requirements
        // Maybe throw an error, or generate a default article without linking?
        // For now, let's assume storyId is essential for finding/creating.
        // If not, adjust the logic.
        query = { storyId: articleData.storyId };
        console.log(`Attempting to save article using storyId: ${articleData.storyId}`);
    } else if (articleData.title) {
        // Fallback to title if _id and storyId are missing
        console.warn("Attempting to save article using title as key (fallback). Ensure title is unique or handle potential issues.");
        query = { title: articleData.title };
    } else {
        throw new Error("Cannot save article: requires _id, storyId, or title.");
    }

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
  
  // Add this function to your mongoService implementation
  /**
   * Fetches articles based on a list of statuses.
   * @param {string[]} statuses - An array of statuses (e.g., ['DRAFT', 'PUBLISHED']).
   * @returns {Promise<Array<object>>} - A promise resolving to an array of article documents.
   */
  async getArticlesByStatus(statuses = []) {
    if (!this.isConnected) await this.connect();
    if (!Array.isArray(statuses) || statuses.length === 0) {
        console.warn('getArticlesByStatus called with invalid or empty statuses array.');
        return [];
    }
    try {
      // Ensure you import your Article model correctly at the top of mongo.js
      // e.g., import Article from '../models/Article.model.js';
      const articles = await Article.find({ status: { $in: statuses } }).lean();
      return articles;
    } catch (error) {
      console.error(`Error fetching articles with statuses ${statuses.join(', ')}:`, error);
      throw error; // Re-throw to be handled by caller
    }
  }

  // Add this function to your mongoService implementation
 /**
  * Updates the status and priority of multiple articles based on curation decisions.
  * @param {Array<object>} curationDecisions - Array from feedCurator output.
  * Each object should have _id, newStatus, newPriority.
  * @returns {Promise<object>} - A promise resolving to the bulk write result.
  */
 async updateMultipleArticleStatusesAndPriorities(curationDecisions = []) {
    if (!this.isConnected) await this.connect();
    if (!Array.isArray(curationDecisions) || curationDecisions.length === 0) {
      console.warn('updateMultipleArticleStatusesAndPriorities called with no decisions.');
      return { ok: 1, nModified: 0 }; // Indicate success with no changes
    }

    const bulkOps = curationDecisions.map(decision => ({
      updateOne: {
        filter: { _id: decision._id },
        // Update status and priority. Set publishedDate if status changes to PUBLISHED
        update: {
          $set: {
            status: decision.newStatus,
            priority: decision.newPriority,
            // Set publishedDate only when transitioning to PUBLISHED *from* a non-published state
            ...(decision.newStatus === 'PUBLISHED' && decision.currentStatus !== 'PUBLISHED' && { publishedDate: new Date() }),
          }
        }
      }
    }));

    try {
      // Ensure you import your Article model correctly at the top of mongo.js
      const result = await Article.bulkWrite(bulkOps, { ordered: false }); // ordered: false allows other updates if one fails
      console.log(`[MongoService] Bulk update status/priority result: Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
      if (result.writeErrors && result.writeErrors.length > 0) {
          console.error('[MongoService] Bulk update finished with write errors:', result.writeErrors);
      }
       if (result.hasWriteErrors()) {
           console.error('[MongoService] Bulk update encountered write errors.');
            // Depending on severity, you might want to throw an error here
            // throw new Error('Bulk update encountered write errors.');
       }
      return result;
    } catch (error) {
      console.error('Error during bulk article status/priority update:', error);
      throw error; // Re-throw for handling in the worker
    }
  }

  // Add this function to fetch a single article by its ID
  async getArticleById(articleId) {
    if (!this.isConnected) await this.connect();
    if (!articleId) {
        console.warn('getArticleById called with no articleId.');
        return null;
    }
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
        console.warn(`getArticleById called with invalid ObjectId: ${articleId}`);
        return null;
    }
    try {
        const article = await Article.findById(articleId).lean();
        return article;
    } catch (error) {
        console.error(`Error fetching article with ID ${articleId}:`, error);
        throw error; // Re-throw to be handled by caller
    }
  }
}

// Create and export a singleton instance
export const mongoService = new MongoService();
