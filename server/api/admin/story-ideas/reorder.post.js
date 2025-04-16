import { defineEventHandler, readBody, createError } from 'h3';
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

    const { lineupId, orderedIds } = await readBody(event);

    // --- Input Validation ---
    if (!lineupId) {
        throw createError({ statusCode: 400, statusMessage: 'Missing lineupId.' });
    }
    if (!Array.isArray(orderedIds)) {
        throw createError({ statusCode: 400, statusMessage: 'Missing or invalid orderedIds array.' });
    }

    // Validate ObjectIds within the ordered list
    const invalidIds = orderedIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
         throw createError({ statusCode: 400, statusMessage: `Invalid document IDs in ordered list: ${invalidIds.join(', ')}` });
    }
    // --- End Validation ---

    if (orderedIds.length === 0) {
        console.log(`Admin Reorder: No IDs provided for lineup ${lineupId}, no action taken.`);
        return { success: true, message: 'No IDs provided, nothing to reorder.' };
    }

    // Use a transaction for atomicity if available/needed, otherwise perform bulk updates.
    // Mongoose doesn't directly support bulk update with different values easily without raw MongoDB commands or looping.
    // We'll loop through the IDs and update priority based on index.
    const bulkOps = orderedIds.map((id, index) => ({
        updateOne: {
            filter: { _id: id, lineupId: lineupId }, // Ensure the ID belongs to the correct lineup
            update: { $set: { priority: index } } // Set priority based on array index (0, 1, 2...)
        }
    }));

    try {
        if (bulkOps.length > 0) {
             const result = await StoryIdeas.bulkWrite(bulkOps);
             console.log(`Admin Reorder: Reordered stories for lineup ${lineupId}. Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
             // Optional: check if matchedCount equals orderedIds.length
             if (result.matchedCount !== orderedIds.length) {
                console.warn(`Admin Reorder Warning: Not all provided story IDs for lineup ${lineupId} were found or matched. Expected: ${orderedIds.length}, Matched: ${result.matchedCount}`);
                // Decide if this should be an error or just a warning
             }
        }

        return { success: true, message: `Successfully updated order for ${bulkOps.length} stories.` };

    } catch (error) {
         console.error(`Error reordering story ideas for lineup ${lineupId}:`, error);
         throw createError({ statusCode: 500, statusMessage: 'Could not reorder story ideas.' });
    }
}); 