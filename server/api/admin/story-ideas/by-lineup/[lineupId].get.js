import { defineEventHandler, createError, getRouterParam } from 'h3';
import mongoose from 'mongoose';

// Import the model
import StoryIdeas from '~/server/models/StoryIdeas.model.js';

// Helper to check for admin role
const requireAdmin = (event) => {
  if (!event.context.user || event.context.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' });
  }
};

export default defineEventHandler(async (event) => {
    requireAdmin(event);

    const lineupId = getRouterParam(event, 'lineupId');

    if (!lineupId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing lineupId parameter' });
    }

    try {
        const stories = await StoryIdeas.find({ lineupId: lineupId })
            .sort({ priority: 1 }) // Sort by priority, ascending (0 first)
            .lean(); // Use lean for performance as we're just reading

        if (!stories) {
            // Return empty array if no stories found for that lineupId, not an error
            return [];
        }

        return stories;

    } catch (error) {
         console.error(`Error fetching story ideas for lineup ${lineupId}:`, error);
         // Handle potential CastError if lineupId format is wrong, though less likely if it comes from selection
         if (error instanceof mongoose.Error.CastError) {
              throw createError({ statusCode: 400, statusMessage: `Invalid lineupId format: ${error.message}` });
         }
         throw createError({ statusCode: 500, statusMessage: 'Could not fetch story ideas' });
    }
}); 