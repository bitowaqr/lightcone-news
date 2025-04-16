import mongoose from 'mongoose';
import { defineEventHandler, readBody, createError } from 'h3';
// Helper to dynamically get the Mongoose model
import models from '~/server/models'; // Assuming an index file exporting all models

const requireAdmin = (event) => {
  if (!event.context.user || event.context.user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Admin access required' });
  }
};

const getModel = (collectionName) => {
  const modelName = collectionName.charAt(0).toUpperCase() + collectionName.slice(1);
  if (!models[modelName]) {
    throw createError({ statusCode: 400, statusMessage: `Invalid collection: ${collectionName}` });
  }
  return models[modelName];
};

export default defineEventHandler(async (event) => {
  // Check if user is admin
  requireAdmin(event);

  const collectionName = event.context.params?.collectionName;
  if (!collectionName) {
    throw createError({ statusCode: 400, statusMessage: 'Collection name is required' });
  }

  let Model;
  try {
    Model = getModel(collectionName);
  } catch (error) {
    return error; // Return the error thrown by getModel
  }

  const body = await readBody(event);

  if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request body' });
  }

  // Basic sanitization/validation (Mongoose handles schema validation)
  // Remove _id if present in the body to prevent conflicts
  delete body._id;

  // Ensure required fields specific to Article creation are handled if needed
  // (e.g., setting publishedDate to null explicitly if status is not PUBLISHED)
  if (collectionName === 'Article') {
    if (body.status !== 'PUBLISHED') {
       body.publishedDate = null; // Ensure publishedDate isn't set unless status is PUBLISHED
    } else {
        // If someone tries to create as PUBLISHED, set the date now
        // Although the frontend prevents this, good to have server-side logic
        body.publishedDate = new Date();
    }
    // Add any other Article-specific defaults or checks here
  }

  try {
    const newDocument = new Model(body);
    await newDocument.save(); // Mongoose handles validation based on the schema here
    return newDocument.toObject(); // Return the created document as a plain object
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      // Mongoose validation error
      throw createError({ statusCode: 422, statusMessage: 'Validation Failed', data: error.errors });
    } else {
      console.error(`Error creating document in ${collectionName}:`, error);
      throw createError({ statusCode: 500, statusMessage: 'Internal Server Error creating document' });
    }
  }
}); 