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
  const allowedCollections = ['Article', 'Scenario', 'SourceDocument', 'User', 'Lineup'];
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
        const result = await Model.findByIdAndDelete(documentId);

        if (!result) {
            throw createError({ statusCode: 404, statusMessage: 'Document not found for deletion' });
        }

        console.log(`Document deleted: ${collectionName}/${documentId}`);
        return { success: true, message: 'Document deleted successfully', id: documentId };

    } catch (error) {
        console.error(`Error deleting document ${collectionName}/${documentId}:`, error);
        if (error.statusCode === 404) throw error;
        throw createError({ statusCode: 500, statusMessage: 'Could not delete document' });
    }
}); 