import { defineEventHandler } from 'h3';
import Article from '../../models/Article.model'; // Adjust path as needed

export default defineEventHandler(async (event) => {
  try {
    const articles = await Article.find(
      { status: 'PUBLISHED' }, // Only fetch published articles
      '_id title precis' // Select ID, title, AND precis
    )
    .sort({ publishedDate: -1 }) // Optional: sort by most recent
    .lean(); // Use lean for performance

    // Return the array of {_id, title, precis}
    return articles;

  } catch (error) {
    console.error('Error fetching article titles & precis:', error);
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching article titles & precis' });
  }
}); 