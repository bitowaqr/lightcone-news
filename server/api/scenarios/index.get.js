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
  // Base filter conditions
  let baseFilter = {
    status: 'OPEN', // Default to showing only OPEN scenarios
  };
  let orBranches = [
    { relatedArticleIds: { $exists: true, $not: { $size: 0 } } },
    { platform: 'Lightcone' }
  ];

  if (query.status) {
    const validStatuses = ['OPEN', 'CLOSED', 'RESOLVING', 'RESOLVED', 'CANCELED', 'UPCOMING', 'UNKNOWN'];
    const requestedStatuses = query.status.split(',').map(s => s.trim().toUpperCase());
    const validRequested = requestedStatuses.filter(s => validStatuses.includes(s));
    if (validRequested.length > 0) {
      if (validRequested.includes('ALL')) {
          baseFilter.status = { $in: validRequested.filter(s => s !== 'ALL') };
          if (!baseFilter.status.$in || baseFilter.status.$in.length === 0) {
              delete baseFilter.status;
          }
      } else {
         baseFilter.status = { $in: validRequested };
      }
    } 
  }

  if (query.platform) {
    const platforms = query.platform.split(',').map(p => p.trim());
    if (platforms.every(p => typeof p === 'string' && p.length > 0)) {
      const includeLightcone = platforms.includes('Lightcone');
      const nonLightconePlatforms = platforms.filter(p => p !== 'Lightcone');
      orBranches = [];
      if (nonLightconePlatforms.length > 0) {
        // Apply platform filter ONLY to the relatedArticleIds branch
        orBranches.push({ relatedArticleIds: { $exists: true, $not: { $size: 0 } }, platform: { $in: nonLightconePlatforms } });
      }
      if (includeLightcone) {
        orBranches.push({ platform: 'Lightcone' });
      }
      if (orBranches.length === 0) {
        orBranches.push({ _id: null }); // Match nothing
      }
    }
  }

  baseFilter.$or = orBranches;

  // --- Combine with Search Filter using $and ---
  let finalFilter = baseFilter; // Start with the base filter

  if (query.q) {
    const searchQuery = query.q.trim();
    if (searchQuery.length > 0) {
      const searchFilter = {
        $or: [
          { question: { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } },
          // { tags: { $regex: searchQuery, $options: 'i' } } // Optional: search tags
        ]
      };
      // Combine base filter and search filter
      finalFilter = { $and: [baseFilter, searchFilter] };
    }
  }

  // --- Debug: log the final filter ---
  // console.log('Scenario API finalFilter:', JSON.stringify(finalFilter, null, 2));

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
      Scenario.find(finalFilter) // Use finalFilter
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('_id question questionNew platform platformScenarioId status resolutionData.expectedResolutionDate resolutionData.resolutionDate volume liquidity createdAt description') // Added description
        .lean(),
      Scenario.countDocuments(finalFilter) // Use finalFilter
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