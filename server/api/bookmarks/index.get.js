import { defineEventHandler, createError } from 'h3';
import User from '../../models/User.model';
import Article from '../../models/Article.model';
import Scenario from '../../models/Scenario.model';

export default defineEventHandler(async (event) => {
    const user = event.context.user;

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized: no user.',
    });
  }


  // --- Database User Lookup --- 
  let dbUser;
  try {
    dbUser = await User.findOne({ _id: user.id }).lean();
    if (!dbUser) {
        throw createError({
          statusCode: 404, // Or 401/403 depending on desired behavior
          statusMessage: 'Authenticated user not found in database.',
        });
    }
  } catch (dbError) {
      console.error(`[API /api/bookmarks GET] Database error looking up user ID ${user.id}:`, dbError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error retrieving user information.',
      });
  }
  
  try {
      const articleIds = dbUser.bookmarkedArticles?.map(article => article?.toString());
    const articles = await Article.find({ 
        _id: { $in: articleIds }
      })
      .select('_id slug title precis publishedDate imageUrl sources') // Select needed fields
        .lean();
      
      

    // Fetch scenarios using the IDs from the user document
    const scenariosRaw = await Scenario.find({ 
        _id: { $in: dbUser.bookmarkedScenarios || [] } 
      })
       .select('_id question platform platformScenarioId scenarioType currentProbability description') // Added description
      .lean();
    const scenarios = scenariosRaw.map(s => ({
        ...s,
        _id: s._id, // Keep original _id for bookmark logic
        scenarioId: s._id.toString(), // Add scenarioId for the link
        name: s.question // Rename question to name
    }));
      
    return {
      articles,
      scenarios
    };
  } catch (fetchError) {
      console.error(`[API /api/bookmarks GET] Error fetching bookmarked items for user ${dbUser._id}:`, fetchError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Database error retrieving bookmarked items.',
      });
  }
}); 