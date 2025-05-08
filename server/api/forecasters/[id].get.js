import { defineEventHandler, createError } from 'h3';
import Forecaster from '../../models/Forecaster.model.js';
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
    const forecaster = await Forecaster.findById(forecasterId).lean(); // Use .lean() for plain JS objects

    if (!forecaster) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Forecaster not found.',
      });
    }

    // Optionally, you can select specific fields to return if not all are needed
    // const forecaster = await Forecaster.findById(forecasterId).select('name type avatar description status createdAt').lean();

    return forecaster;
  } catch (error) {
    console.error(`Error fetching forecaster ${forecasterId}:`, error);
    if (error.statusCode) { // If it's an error we threw intentionally
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'An error occurred while fetching the forecaster.',
    });
  }
}); 