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
    '/api/articles',
    '/api/scenarios',
    '/api/articles/*',
    '/api/scenarios/*',
    // Add other public API endpoints here (e.g., '/api/newsfeed/public')
  ];
  const privateSubPaths = [
    '/api/scenarios/request',
  ]
  let isPublicApiPath = publicApiPaths.some(p => path.startsWith(p) && !privateSubPaths.some(sp => path.startsWith(sp)));



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
    // Ensure 'role' is selected (it should be by default unless explicitly excluded)
    const user = await User.findById(decoded.userId).select('+password'); // Select password temporarily if needed for checks, but don't attach it below

    if (user) {
      // Attach user info *without* sensitive data like password hash
      // Make sure 'role' is included
      event.context.user = {
        id: user._id.toString(),
        email: user.email,
        role: user.role, // <-- Crucial: include the role
        // Add other non-sensitive fields if needed by the frontend/API
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