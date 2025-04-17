// server/api/articles/[slug].get.js 
// Fetches a single published article by its slug

import { defineEventHandler, getRouterParam, createError } from 'h3';
import mongoose from 'mongoose';
import Article from '~/server/models/Article.model';
import Scenario from '~/server/models/Scenario.model'; // Import Scenario model for populating

export default defineEventHandler(async (event) => {
  // Try accessing the parameter directly from context
  const slug = event.context?.params?.slug; 

  if (!slug) {
    // Log the context params for debugging if slug is missing
    console.error('[API /api/articles/[slug]] Slug not found in event.context.params:', event.context?.params);
    throw createError({
      statusCode: 400,
      statusMessage: 'Article slug is required'
    });
  }

  try {
    // Find the article by slug, ensuring it's published
    // Populate related scenarios with necessary fields for teasers
    const article = await Article.findOne({
      slug: slug,
      status: 'PUBLISHED' // Only fetch published articles via public endpoint
    })
      .populate({
        path: 'relatedScenarioIds',
        select: 'question platform platformScenarioId conditionId url status currentProbability options scenarioType openDate resolutionData.expectedResolutionDate' // Select fields needed for ScenarioTeaser + dynamic chance fetch
      })
      .lean(); // Use lean() for performance if not modifying the doc

    if (!article) {
       console.warn(`[API /api/articles/[slug]] Article not found for slug: ${slug}`);
      throw createError({
        statusCode: 404,
        statusMessage: 'Published article not found'
      });
    }
    
    // --- Data Transformation/Shaping for Frontend --- 
    // (This part depends heavily on how components/scenario/index.vue expects data)
    // We need to structure the response clearly.
    
    const formattedScenarios = article.relatedScenarioIds?.map(scen => ({
        // Map Scenario fields to what ScenarioTeaser/ScenarioDetail might expect
        // Ensure fields needed by useScenarioChance (platform, platformScenarioId) are present!
        scenarioId: scen._id.toString(), // Keep internal ID if needed for links
        name: scen.question, 
        chance: scen.currentProbability, // Pass the potentially stale chance, Teaser will fetch live
        platform: scen.platform, // Required for useScenarioChance
        platformScenarioId: scen.platformScenarioId, // Required for useScenarioChance
        apiUrl: scen.apiUrl, // Pass API URL if Teaser still uses it (though it shouldn't now)
        conditionId: scen.conditionId,
        url: scen.url,
        status: scen.status,
        // Add other fields if the detail view needs them directly
         scenarioType: scen.scenarioType,
         options: scen.options,
         openDate: scen.openDate ? new Date(scen.openDate).toLocaleDateString('en-CA') : null, // Format dates server-side?
         expectedResolutionDate: scen.resolutionData?.expectedResolutionDate ? new Date(scen.resolutionData.expectedResolutionDate).toLocaleDateString('en-CA') : null,
    })) || [];
    
    // Structure the final response payload
    const responsePayload = {
        title: article.title,
        precis: article.precis,
        summary: article.summary,
        summaryAlt: article.summaryAlt,
        imageUrl: article.imageUrl,
        publishedDate: article.publishedDate ? new Date(article.publishedDate).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
        author: article.author,
        tags: article.tags,
        sources: article.sources, // Assuming frontend handles cited sources
        timeline: article.timeline, // Assuming frontend handles timeline
        suggestedPrompts: article.suggestedPrompts,
        // Pass the formatted/selected scenarios
        scenarios: formattedScenarios,
        // Add slug if needed by frontend explicitly (though it's in the URL)
        slug: article.slug,
         // Add _id if still needed for some reason (e.g., chat context)
        _id: article._id.toString(), 
    };

    return responsePayload;

  } catch (error) {
    // Log the original error for more context
    console.error(`[API /api/articles/[slug]] Error fetching article by slug ${slug}:`, error);

    // Handle potential Mongoose errors (e.g., CastError if slug format is weird, though unlikely)
    if (error.name === 'CastError') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid article slug format'
      });
    }
    
    // Re-throw specific errors (like 404) or wrap others
     if (error.statusCode) {
        throw error; // Re-throw H3 errors
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: 'An internal server error occurred'
    });
  }
}); 