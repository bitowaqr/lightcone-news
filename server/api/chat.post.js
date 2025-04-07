import { defineEventHandler, createError, readBody } from 'h3';

export default defineEventHandler(async (event) => {
  // Authentication check
  if (!event.context.user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized - Mock Auth Required' });
  }

  const body = await readBody(event);
  const { prompt, contextId } = body;

  if (!prompt || !contextId) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request: Missing prompt or contextId' });
  }

  // Mock AI response
  const mockResponse = `This is a mock AI response regarding your question "${prompt}" about context ID: ${contextId}. Lorem ipsum generator activated: Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.`;

  // Add a 2-second delay to simulate AI processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    response: mockResponse,
    timestamp: new Date().toISOString()
  };
}); 