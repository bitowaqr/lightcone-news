import { defineEventHandler, createError } from 'h3';

export default defineEventHandler(async (event) => {
  // The server/middleware/auth.js should have already run and populated
  // event.context.user if the auth_token cookie was valid.

  if (!event.context.user) {
    // This should technically not happen if the server middleware is working correctly
    // for protected routes, but provides a safeguard.
    console.log('/api/auth/user: No user found in context.')
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
    });
  }

  // Return the user data obtained from the verified JWT payload
  // Ensure no sensitive data is accidentally included in the payload itself
  return {
    user: event.context.user,
  };
}); 