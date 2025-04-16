import { defineEventHandler, readBody, createError, getRouterParam } from 'h3';
import mongoose from 'mongoose';

// Helper to check for admin role
const requireAdmin = (event) => {
  if (!event.context.user || event.context.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' });
  }
};

// Basic validation for collection names
const isValidCollection = (collectionName) => {
  const allowedCollections = ['Article', 'Scenario', 'SourceDocument', 'User', 'Lineup'];
  return allowedCollections.includes(collectionName);
}

export default defineEventHandler(async (event) => {
    requireAdmin(event);

    const collectionName = getRouterParam(event, 'collection');
    const documentId = getRouterParam(event, 'id');
    const updates = await readBody(event);

    if (!collectionName || !isValidCollection(collectionName)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid or missing collection name' });
    }
     if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid or missing document ID' });
    }
     if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid update data format' });
    }

    // Prevent updating critical fields directly (like _id or potentially password for User)
    delete updates._id;
    delete updates.createdAt; // Generally shouldn't be updated manually
    delete updates.updatedAt; // Mongoose handles this
    if (collectionName === 'User') {
        delete updates.password; // Prevent direct password update via this generic endpoint
        // Add a dedicated password reset endpoint if needed
    }


    try {
        const Model = mongoose.model(collectionName);
        const document = await Model.findById(documentId);

        if (!document) {
            throw createError({ statusCode: 404, statusMessage: 'Document not found' });
        }

        // Apply updates
        Object.assign(document, updates);

        // Mongoose's save() will trigger validation and middleware (like password hashing if implemented correctly)
        await document.save();

        console.log(`Document updated: ${collectionName}/${documentId}`);

        // Return the updated document (Mongoose object)
        // Exclude sensitive fields like password for User model before returning
         if (collectionName === 'User') {
             const userObj = document.toObject();
             delete userObj.password;
             return userObj;
         }

        return document;

    } catch (error) {
        console.error(`Error updating document ${collectionName}/${documentId}:`, error);
         if (error instanceof mongoose.Error.ValidationError) {
             // Extract meaningful messages from validation errors
             const messages = Object.values(error.errors).map(e => e.message);
             throw createError({ statusCode: 400, statusMessage: `Validation failed: ${messages.join(', ')}` });
         }
         if (error.statusCode === 404) throw error;
         throw createError({ statusCode: 500, statusMessage: 'Could not update document' });
    }
}); 