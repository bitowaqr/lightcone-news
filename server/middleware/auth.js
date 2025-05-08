import { defineEventHandler, getCookie, createError } from 'h3';
import jwt from 'jsonwebtoken';
import User from '~/server/models/User.model.js'; // Adjust path if needed
// import { useRuntimeConfig } from '#imports'; // Auto-imported

const { JWT_SECRET } = process.env;

export default defineEventHandler(async (event) => {
  // This middleware runs for every server request.
  // It should ONLY protect non-public API routes.

  const config = useRuntimeConfig(event);
  const token = getCookie(event, 'auth_token');
  const path = event.path; // Get the request path

  // --- Step 1: Check if it's an API route --- 
  // Only apply JWT verification logic to API routes
  if (!path?.startsWith('/api/')) {
    // Not an API route, let Nuxt handle page rendering and its own middleware
    return;
  }

  // --- Step 2: Check if it's a PUBLIC API route ---
  const publicApiPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/logout',
    '/api/chat',
    '/api/newsfeed',
    '/api/articles', // For listing all articles
    '/api/scenarios', // For listing all scenarios
    '/api/articles/', // Note the trailing slash for startsWith to catch /api/articles/some-slug
    '/api/scenarios/', // Note the trailing slash for startsWith to catch /api/scenarios/some-id or /api/scenarios/chance
    '/api/_nuxt_icon/', // Add nuxt_icon path as public
    // Add other public API endpoints here (e.g., '/api/newsfeed/public')
  ];
  const privateSubPaths = [
    '/api/scenarios/request',
  ]
  // Adjusted logic for checking public paths, especially for paths with parameters
  let isPublicApiPath = publicApiPaths.some(p => {
    if (p.endsWith('/')) { // If the public path pattern ends with a slash, use startsWith
      return path.startsWith(p);
    } else { // Otherwise, require an exact match (e.g., /api/newsfeed)
      return path === p;
    }
  }) && !privateSubPaths.some(sp => path.startsWith(sp));



  if (isPublicApiPath) {
    // Skip authentication for public API paths
    return;
  }

  // --- Step 3: It's a PROTECTED API route, verify token ---
  if (!token) {
    // No token found for a protected API route
    console.log(`Server Auth Middleware: No token found for protected API path: ${path}`);
    event.context.user = null;
    return;
  }

  if (!config.jwtSecret) {
    console.error('Server Auth Middleware: JWT Secret not configured.');
    throw createError({
      statusCode: 500,
      statusMessage: 'Authentication configuration error.',
    });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, config.jwtSecret);

    // Fetch the full user object from DB using the decoded ID
    // This is good to ensure the user still exists and is active
    const userFromDb = await User.findById(decoded.userId);

    if (userFromDb) {
      // Attach user info using fields from the DECODED JWT PAYLOAD
      // and supplement with any fresh DB info if needed (but JWT is the primary source for its claims)
      event.context.user = {
        id: decoded.userId, // Use userId from token as it's the subject
        userId: decoded.userId, // Consistent key
        email: decoded.email,
        role: decoded.role,
        joinDate: decoded.joinDate,     // Get from decoded token
        lastLogin: decoded.lastLogin,   // Get from decoded token
        // Any other fields from decoded token can be added here
      };
    } else {
      // User ID in token not found in DB (maybe deleted?)
       console.warn(`User not found for token ID: ${decoded.userId}`);
       event.context.user = null;
       // Optionally clear the invalid cookie
       // deleteCookie(event, 'auth_token');
    }
  } catch (error) {
    // Token verification failed (expired, invalid)
    console.error('Auth token verification failed:', error.message);
    event.context.user = null;
     // Optionally clear the invalid cookie
     // deleteCookie(event, 'auth_token');
  }
}); 