import { defineEventHandler, readBody, createError, getRouterParam } from 'h3';
import mongoose from 'mongoose';

// Helper to check for admin role (can be refactored into a utility)
const requireAdmin = (event) => {
  if (!event.context.user || event.context.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' });
  }
};

// Basic validation for collection names
const isValidCollection = (collectionName) => {
  // Add all models managed by the admin panel
  const allowedCollections = ['Article', 'Scenario', 'SourceDocument', 'User', 'StoryIdeas'];
  return allowedCollections.includes(collectionName);
}

export default defineEventHandler(async (event) => {
  requireAdmin(event);

  const collectionName = getRouterParam(event, 'collection');
  if (!collectionName || !isValidCollection(collectionName)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid or missing collection name' });
  }

  // Read body and set defaults for sort
  const { filters = {}, sort: sortInput = {}, limit = 20, page = 1 } = await readBody(event);

  // Basic sanitization/validation for limit and page
  const effectiveLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100); // Limit between 1 and 100
  const effectivePage = Math.max(1, parseInt(page) || 1);
  const skip = (effectivePage - 1) * effectiveLimit;

  try {
    const Model = mongoose.model(collectionName);

    // Basic input validation for filters (preventing prototype pollution, etc.)
    // For a production app, more robust validation (e.g., using a schema validation library) is needed.
    const sanitizedFilters = {};
    for (const key in filters) {
        // Allow only simple key-value pairs or basic mongo operators starting with $
        // Reject keys containing dots or starting with $ unless it's a known operator structure
        if (typeof filters[key] !== 'object' || filters[key] === null || Array.isArray(filters[key])) {
             if (!key.includes('.') && !key.startsWith('$')) {
                 sanitizedFilters[key] = filters[key];
             }
        } else {
             // Very basic check for operator objects like { $gte: value }
             const subKeys = Object.keys(filters[key]);
             if (subKeys.length === 1 && subKeys[0].startsWith('$')) {
                 sanitizedFilters[key] = filters[key];
             }
        }
    }

    // --- Sort Sanitization ---
    const allowedSortFields = ['createdAt', 'updatedAt', 'title', 'status', 'priority', 'relevance', 'publishedDate']; // Added 'priority' here implicitly, ensure it's present
    const sanitizedSort = {};
    // Expecting sortInput like { fieldName: 1 } or { fieldName: -1 }
    // Or like { fieldName: 'asc' } or { fieldName: 'desc' } which the frontend now sends
    const sortField = Object.keys(sortInput)[0];
    const sortValue = sortInput[sortField];

    if (sortField && allowedSortFields.includes(sortField)) {
        if (sortValue === 1 || sortValue === -1) {
            sanitizedSort[sortField] = sortValue; // Allow direct 1/-1
        } else if (String(sortValue).toLowerCase() === 'asc') {
             sanitizedSort[sortField] = 1;
        } else {
             sanitizedSort[sortField] = -1; // Default to desc if not 'asc'
        }
    } else {
         // Default sort if input is invalid or not provided
         sanitizedSort['updatedAt'] = -1;
    }
    console.log('Applying sort:', sanitizedSort);
    // --- End Sort Sanitization ---

    const totalDocuments = await Model.countDocuments(sanitizedFilters);
    let documents;
    console.log('collectionName', collectionName);
    
      documents = await Model.find(sanitizedFilters)
        .sort(sanitizedSort) // Use sanitized sort object
        .skip(skip)
        .limit(effectiveLimit)
        .lean(); // Use lean for performance if not modifying directly
    

    return {
        documents,
        pagination: {
            currentPage: effectivePage,
            totalPages: Math.ceil(totalDocuments / effectiveLimit),
            totalDocuments,
            limit: effectiveLimit
        }
     };

  } catch (error) {
    console.error(`Error querying collection ${collectionName}:`, error);
    if (error instanceof mongoose.Error.CastError) {
         throw createError({ statusCode: 400, statusMessage: `Invalid filter value: ${error.message}` });
    }
    throw createError({ statusCode: 500, statusMessage: `Could not query collection ${collectionName}` });
  }
}); 