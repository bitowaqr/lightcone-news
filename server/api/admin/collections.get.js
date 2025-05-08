import { defineEventHandler, createError } from 'h3';
import mongoose from 'mongoose';

// Explicitly import models to ensure they are registered with Mongoose
import Article from '~/server/models/Article.model.js';
import Scenario from '~/server/models/Scenario.model.js';
import SourceDocument from '~/server/models/SourceDocument.model.js';
import User from '~/server/models/User.model.js';
import StoryIdeas from '~/server/models/StoryIdeas.model.js';
import Forecaster from '~/server/models/Forecaster.model.js';
// --- End model imports ---

// Create a mapping from model name (string) to the imported Mongoose model object
const modelMap = {
    Article,
    Scenario,
    SourceDocument,
    User,
    StoryIdeas,
    Forecaster
};

// Helper to check for admin role
const requireAdmin = (event) => {
  if (!event.context.user || event.context.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' });
  }
};

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  try {
    // Define the models managed by the admin panel by their name
    const manageableModelNames = ['Article', 'Scenario', 'SourceDocument', 'User', 'StoryIdeas', 'Forecaster'];

    // Get the list of actual collection names from the database
    const existingCollections = (await mongoose.connection.db.listCollections().toArray()).map(c => c.name);

    // Filter the manageable model *names* based on whether their corresponding collection exists
    const availableModelNames = manageableModelNames.filter(modelName => {
        const Model = modelMap[modelName]; // Get the imported model object from the map
        if (!Model) {
            console.warn(`Model not found in map for name: ${modelName}`);
            return false; // Skip if the name isn't in our map
        }
        try {
            // Get the collection name directly from the imported model object
            const collectionName = Model.collection.name;
            // Check if this collection name exists in the database list
            return existingCollections.includes(collectionName);
        } catch (modelError) {
             // Should be less likely now, but good to keep defensively
             console.error(`Error accessing collection name for model ${modelName}:`, modelError);
             return false;
        }
    });

    return availableModelNames; // Return the names of the models whose collections exist

  } catch (error) {
    console.error("Error processing collections:", error);
    throw createError({ statusCode: 500, statusMessage: 'Could not fetch or process collections' });
  }
}); 