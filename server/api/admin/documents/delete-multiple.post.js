import { defineEventHandler, readBody, createError } from 'h3';
import mongoose from 'mongoose';

// Explicitly import the model we allow deletion for
import StoryIdeas from '~/server/models/StoryIdeas.model.js';

// Helper to check for admin role
const requireAdmin = (event) => {
  if (!event.context.user || event.context.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' });
  }
};

export default defineEventHandler(async (event) => {
    requireAdmin(event);

    const { collectionName, documentIds } = await readBody(event);

    // --- Input Validation ---
    // Currently, only allow this operation for StoryIdeas for safety
    if (collectionName !== 'StoryIdeas') {
        throw createError({ statusCode: 400, statusMessage: 'Bulk deletion is only allowed for StoryIdeas at this time.' });
    }

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
        throw createError({ statusCode: 400, statusMessage: 'Missing or empty array of document IDs.' });
    }

    // Validate ObjectIds
    const validObjectIds = [];
    const invalidIds = [];
    for (const id of documentIds) {
        if (mongoose.Types.ObjectId.isValid(id)) {
            validObjectIds.push(id);
        } else {
            invalidIds.push(id);
        }
    }

    if (invalidIds.length > 0) {
         console.warn('Invalid ObjectIds received for bulk delete:', invalidIds);
         // Decide whether to proceed with valid IDs or throw error.
         // Let's throw an error for now to be safe.
         throw createError({ statusCode: 400, statusMessage: `Invalid document IDs provided: ${invalidIds.join(', ')}` });
    }
    // --- End Validation ---

    if (validObjectIds.length === 0) {
        return { deletedCount: 0 }; // Nothing valid to delete
    }

    try {
        const Model = mongoose.model(collectionName); // Use the validated collectionName

        const deleteResult = await Model.deleteMany({
            _id: { $in: validObjectIds }
        });

        console.log(`Admin Bulk Delete: Deleted ${deleteResult.deletedCount} documents from ${collectionName}`);

        return { deletedCount: deleteResult.deletedCount };

    } catch (error) {
         console.error(`Error bulk deleting documents from ${collectionName}:`, error);
         throw createError({ statusCode: 500, statusMessage: 'Could not delete documents.' });
    }
}); 