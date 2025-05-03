import { defineEventHandler, getQuery, createError } from 'h3';
import Scenario from '../../models/Scenario.model';

const DEFAULT_LIMIT = 20; // Default number of scenarios per page
const MAX_LIMIT = 2_000; // Max limit to prevent abuse

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  // --- Pagination --- 
  let page = parseInt(query.page) || 1;
  let limit = parseInt(query.limit) || DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT); // Ensure limit doesn't exceed max
  const skip = (page - 1) * limit;

  // --- Filtering --- 
  const filter = { 
      status: 'OPEN', // Default to showing only OPEN scenarios
      relatedArticleIds: { $exists: true, $not: { $size: 0 } } // ADDED: Ensure linked to at least one article
  }; 

  if (query.status) {
    const validStatuses = ['OPEN', 'CLOSED', 'RESOLVING', 'RESOLVED', 'CANCELED', 'UPCOMING', 'UNKNOWN'];
    // Allow comma-separated statuses or single status
    const requestedStatuses = query.status.split(',').map(s => s.trim().toUpperCase());
    const validRequested = requestedStatuses.filter(s => validStatuses.includes(s));
    if (validRequested.length > 0) {
      // If 'ALL' is specified, remove the default OPEN filter
      if (validRequested.includes('ALL')) {
          // Still keep the relatedArticleIds filter
          // delete filter.status; // Don't delete the whole status filter, just potentially modify it
          filter.status = { $in: validRequested.filter(s => s !== 'ALL') }; // Apply other valid statuses
          if (!filter.status.$in || filter.status.$in.length === 0) {
              delete filter.status; // If only 'ALL' was requested, remove status filter entirely
          }
      } else {
         filter.status = { $in: validRequested };
      }
    } 
    // If invalid status provided, the default 'OPEN' filter remains
  }

  if (query.platform) {
    // Allow comma-separated platforms or single platform
    const platforms = query.platform.split(',').map(p => p.trim());
    // Basic validation: Ensure platforms are strings
    if (platforms.every(p => typeof p === 'string' && p.length > 0)) {
      filter.platform = { $in: platforms };
    }
  }

  // --- Search --- 
  if (query.q) {
    const searchQuery = query.q.trim();
    if (searchQuery.length > 0) {
      // Case-insensitive regex search on question and description
      filter.$or = [
        { question: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        // { tags: { $regex: searchQuery, $options: 'i' } } // Optional: search tags
      ];
    }
  }

  // --- Sorting --- 
  let sort = { createdAt: -1 }; // Default: newest first
  if (query.sort) {
    switch (query.sort) {
      case 'newest':
        sort = { createdAt: -1 };
        break;
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'closing_soon': // Sort by expected resolution or actual resolution date
        sort = { 'resolutionData.expectedResolutionDate': 1, 'resolutionData.resolutionDate': 1, createdAt: -1 }; 
        break;
      case 'highest_volume': // Need to handle null/undefined volume
        sort = { volume: -1, createdAt: -1 };
        break;
       case 'highest_liquidity': // Need to handle null/undefined liquidity
        sort = { liquidity: -1, createdAt: -1 };
        break;
       case 'recently_updated':
         sort = { updatedAt: -1 };
         break;
      // Add more sorting options as needed
    }
  }

  try {
    // Fetch scenarios and total count matching the filters
    const [scenarios, totalCount] = await Promise.all([
      Scenario.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('_id question questionNew platform platformScenarioId status resolutionData.expectedResolutionDate resolutionData.resolutionDate volume liquidity createdAt description') // Added description
        .lean(),
      Scenario.countDocuments(filter)
    ]);

    // Format data for the frontend (similar to ScenarioTeaser needs)
    const formattedScenarios = scenarios.map(scenario => ({
      scenarioId: scenario._id.toString(),
      name: scenario.questionNew || scenario.question, // Use 'question' as 'name' for consistency with Teaser
      platform: scenario.platform,
      platformScenarioId: scenario.platformScenarioId,
      description: scenario.description, // Added description
      // Add other fields if needed by the UI, e.g., close date for display
      status: scenario.status,
      // Determine a 'closing' date for potential display/sorting clarity
      closeDate: scenario.resolutionData?.resolutionDate || scenario.resolutionData?.expectedResolutionDate,
      volume: scenario.volume,
      liquidity: scenario.liquidity
      // No need for 'chance' here, Teaser fetches it dynamically
    }));

    return {
      scenarios: formattedScenarios,
      pagination: {
        total: totalCount,
        page: page,
        limit: limit,
        totalPages: Math.ceil(totalCount / limit),
      }
    };

  } catch (error) {
    console.error('Error fetching scenarios feed:', error); // Keep critical error log
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error fetching scenarios' });
  }
}); 