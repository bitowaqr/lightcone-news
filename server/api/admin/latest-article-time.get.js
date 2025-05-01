import { defineEventHandler, createError } from 'h3';
import Article from '../../models/Article.model.js'; // Adjust path as necessary

export default defineEventHandler(async (event) => {
  // This endpoint should be protected by the admin middleware for /api/admin/*

  try {
    const latestArticle = await Article.findOne({ status: 'PUBLISHED' })
      .sort({ publishedDate: -1 })
      .select('publishedDate') // Only fetch the required field
      .lean();

    if (!latestArticle) {
      // Return null or a specific message if no published articles are found
      return { latestPublishedDate: null };
    }

    return {
      latestPublishedDate: latestArticle.publishedDate,
    };
  } catch (error) {
    console.error('Error fetching latest article publish time:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Failed to fetch latest article time.',
    });
  }
}); 