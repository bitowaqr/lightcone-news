import { defineEventHandler, createError, getRouterParam } from 'h3';
import mongoose from 'mongoose';

// Helper to check for admin role
const requireAdmin = (event) => {
  if (!event.context.user || event.context.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' });
  }
};

// Basic validation for collection names
const isValidCollection = (collectionName) => {
  const allowedCollections = ['Article', 'Scenario', 'SourceDocument', 'User'];
  return allowedCollections.includes(collectionName);
}


export default defineEventHandler(async (event) => {
    requireAdmin(event);

    const collectionName = getRouterParam(event, 'collection');
    const documentId = getRouterParam(event, 'id');

    if (!collectionName || !isValidCollection(collectionName)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid or missing collection name' });
    }
    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid or missing document ID' });
    }

    try {
        const Model = mongoose.model(collectionName);
        // Use lean if you only need to display data, omit if update/delete follows directly
        const document = await Model.findById(documentId); //.lean();

        if (!document) {
            throw createError({ statusCode: 404, statusMessage: 'Document not found' });
        }

        // Special handling for User password (never return it)
        if (collectionName === 'User' && document.password) {
            document.password = undefined; // Or delete document.password;
        }


        return document;

    } catch (error) {
         console.error(`Error fetching document ${collectionName}/${documentId}:`, error);
         if (error.statusCode === 404) throw error; // Re-throw specific errors
         throw createError({ statusCode: 500, statusMessage: 'Could not fetch document' });
    }
}); 