import { defineEventHandler, createError } from 'h3';
import Scenario from '../../../models/Scenario.model.js';
import Forecaster from '../../../models/Forecaster.model.js';
import mongoose from 'mongoose';

export default defineEventHandler(async (event) => {
  const forecasterId = event.context.params?.id;

  if (!forecasterId || !mongoose.Types.ObjectId.isValid(forecasterId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Forecaster ID provided.',
    });
  }

  try {
    const forecaster = await Forecaster.findById(forecasterId).select('_id').lean();
    if (!forecaster) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Forecaster not found.',
      });
    }

    const scenariosWithHistory = await Scenario.aggregate([
      {
        $match: {
          $or: [
            { 'probabilityHistory.forecasterId': new mongoose.Types.ObjectId(forecasterId) },
            { 'valueHistory.forecasterId': new mongoose.Types.ObjectId(forecasterId) },
            { 'optionHistory.options.forecasterId': new mongoose.Types.ObjectId(forecasterId) }
          ]
        }
      },
      {
        $project: {
          _id: 1,
          question: 1,
          platform: 1,
          scenarioType: 1,
          status: 1,
          updatedAt: 1, // Keep for sorting
          probabilityHistory: {
            $filter: {
              input: '$probabilityHistory',
              as: 'probHistory',
              cond: { $eq: ['$$probHistory.forecasterId', new mongoose.Types.ObjectId(forecasterId)] }
            }
          },
          valueHistory: {
            $filter: {
              input: '$valueHistory',
              as: 'valHistory',
              cond: { $eq: ['$$valHistory.forecasterId', new mongoose.Types.ObjectId(forecasterId)] }
            }
          },
          optionHistory: {
            // For optionHistory, filter the outer array first if it might be empty or irrelevant
            $filter: {
              input: '$optionHistory',
              as: 'optHistEntry',
              cond: { 
                $gt: [ // Check if any option within this entry matches the forecasterId
                  { 
                    $size: {
                      $filter: {
                        input: '$$optHistEntry.options',
                        as: 'optionItem',
                        cond: { $eq: ['$$optionItem.forecasterId', new mongoose.Types.ObjectId(forecasterId)] }
                      }
                    }
                  }, 0
                ]
              }
            }
          }
        }
      },
      {
        // Secondary projection to refine optionHistory.options
        $project: {
          _id: 1,
          question: 1,
          platform: 1,
          scenarioType: 1,
          status: 1,
          updatedAt: 1,
          probabilityHistory: 1,
          valueHistory: 1,
          optionHistory: {
            $map: {
              input: '$optionHistory',
              as: 'entry',
              in: {
                timestamp: '$$entry.timestamp',
                options: {
                  $filter: {
                    input: '$$entry.options',
                    as: 'option',
                    cond: { $eq: ['$$option.forecasterId', new mongoose.Types.ObjectId(forecasterId)] }
                  }
                }
              }
            }
          }
        }
      },
      {
        $sort: { updatedAt: -1 } // Sort by when the scenario was last updated
      },
      {
        $limit: 50
      }
    ]);

    // Transform scenariosWithHistory into a flat list of forecasts
    const allForecasts = [];
    scenariosWithHistory.forEach(scenario => {
      if (scenario.probabilityHistory) {
        scenario.probabilityHistory.forEach(forecast => {
          if (forecast.forecasterId) { // Ensure the entry has forecasterId after filtering
            allForecasts.push({
              scenarioId: scenario._id,
              scenarioQuestion: scenario.question,
              scenarioPlatform: scenario.platform,
              scenarioType: scenario.scenarioType,
              type: 'PROBABILITY',
              timestamp: forecast.timestamp,
              probability: forecast.probability,
              rationalSummary: forecast.rationalSummary,
            });
          }
        });
      }
      if (scenario.valueHistory) {
        scenario.valueHistory.forEach(forecast => {
          if (forecast.forecasterId) {
            allForecasts.push({
              scenarioId: scenario._id,
              scenarioQuestion: scenario.question,
              scenarioPlatform: scenario.platform,
              scenarioType: scenario.scenarioType,
              type: 'VALUE',
              timestamp: forecast.timestamp,
              value: forecast.value,
              rationalSummary: forecast.rationalSummary,
            });
          }
        });
      }
      if (scenario.optionHistory) {
        scenario.optionHistory.forEach(historyEntry => {
          if (historyEntry.options) {
            historyEntry.options.forEach(optionForecast => {
              // The options array should already be filtered by forecasterId from the $project stage
              allForecasts.push({
                scenarioId: scenario._id,
                scenarioQuestion: scenario.question,
                scenarioPlatform: scenario.platform,
                scenarioType: scenario.scenarioType,
                type: 'OPTION',
                optionName: optionForecast.name,
                timestamp: historyEntry.timestamp,
                probability: optionForecast.probability,
                rationalSummary: optionForecast.rationalSummary,
              });
            });
          }
        });
      }
    });

    allForecasts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return allForecasts.slice(0, 100); // Limit total individual forecasts

  } catch (error) {
    console.error(`Error fetching forecast history for forecaster ${forecasterId}:`, error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'An error occurred while fetching forecast history (Stage 2 - Transformation).'
    });
  }
}); 