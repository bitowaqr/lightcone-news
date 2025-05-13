import { defineEventHandler, getCookie, createError } from 'h3';
import jwt from 'jsonwebtoken';
import User from '~/server/models/User.model.js'; // Adjust path if needed
// import { useRuntimeConfig } from '#imports'; // Auto-imported

const { JWT_SECRET } = process.env;
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export default defineEventHandler(async (event) => {
  // This middleware runs for every server request.
  // It attempts to identify the user from the token if present.
  // It ONLY enforces authentication (throws error if no valid token) for protected routes.

  const config = useRuntimeConfig(event);
  const token = getCookie(event, 'auth_token');
  const path = event.path; // Get the request path

  // Default user context to null
  event.context.user = null;

  // --- Step 1: Check if it's an API route ---
  if (!path?.startsWith('/api/')) {
    // Not an API route, let Nuxt handle page rendering and its own middleware
    return;
  }

  // --- Step 2: Define PROTECTED API route prefixes ---
  // Routes listed here will require a valid JWT.
  const protectedApiPrefixes = [
    '/api/admin/',
    '/api/user/bookmarks', // Example: A future user-specific endpoint
    // Add other prefixes that absolutely require a logged-in user
  ];

  const isProtectedRoute = protectedApiPrefixes.some(prefix => path.startsWith(prefix));

  // --- Step 3: Attempt to verify token if it exists ---
  if (token) {
    if (!config.jwtSecret) {
      console.error('Server Auth Middleware: JWT Secret not configured.');
      // Only throw an error if it's a protected route, otherwise just log and continue
      if (isProtectedRoute) {
        throw createError({
          statusCode: 500,
          statusMessage: 'Authentication configuration error.',
        });
      } else {
        // For public routes, log the error but don't block the request
        return; 
      }
    }

    try {
      // Verify the token
      const decoded = jwt.verify(token, config.jwtSecret);

      // Attach decoded claims to context first for immediate use if needed
      event.context.user = {
        id: decoded.userId,
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };

      // --- Session Activity Logic ---
      try {
        const userFromDb = await User.findById(decoded.userId);
        if (userFromDb) {
          const now = new Date();
          let updateFields = { lastActivityAt: now };
          let newSessionStarted = false;

          if (!userFromDb.lastActivityAt || (now.getTime() - new Date(userFromDb.lastActivityAt).getTime()) > SESSION_TIMEOUT) {
            // If no last activity OR last activity was > SESSION_TIMEOUT ago, start new session
            if (!userFromDb.sessionActivityLog) userFromDb.sessionActivityLog = []; // Initialize if undefined
            userFromDb.sessionActivityLog.push(now);
            newSessionStarted = true;
             // Optional: Limit the size of sessionActivityLog
            // const maxHistory = 100;
            // if (userFromDb.sessionActivityLog.length > maxHistory) {
            //   userFromDb.sessionActivityLog = userFromDb.sessionActivityLog.slice(-maxHistory);
            // }
          }
          
          userFromDb.lastActivityAt = now; // Always update lastActivityAt
          await userFromDb.save(); // Save changes (lastActivityAt and potentially sessionActivityLog)

          // For debugging: console.log(`User ${decoded.userId} activity. New session: ${newSessionStarted}`);

        } else {
          console.warn(`Server Auth Middleware: User ${decoded.userId} from token not found in DB for activity update.`);
          event.context.user = null; // Invalidate context user if DB user not found
        }
      } catch (dbError) {
        console.error('Server Auth Middleware: DB error during user activity update:', dbError);
        // Don't fail the whole request for this, but user might not be fully populated in context
        // If user in context is critical, you might reconsider error handling here.
      }
      // --- End Session Activity Logic ---

    } catch (error) {
      // Token verification failed (expired, invalid)
      console.warn(`Server Auth Middleware: Token verification failed for path ${path}: ${error.message}`);
      // Clear the potentially invalid cookie? Maybe not automatically.
      // deleteCookie(event, 'auth_token'); 

      // If it's a protected route, throw an error
      if (isProtectedRoute) {
        throw createError({
          statusCode: 401,
          statusMessage: 'Authentication required.',
        });
      }
      // Otherwise (public route), failure is acceptable, user remains null.
    }
  }

  // --- Step 4: Enforce authentication ONLY for protected routes ---
  if (isProtectedRoute && !event.context.user) {
    // If it's a protected route and we *still* don't have a user (no token, invalid token, config error handled above),
    // then deny access.
    console.log(`Server Auth Middleware: Access denied for protected path ${path}. No valid user context.`);
    throw createError({
      statusCode: 401, // Unauthorized
      statusMessage: 'Authentication required.',
    });
  }

  // --- Step 5: Allow request to proceed ---
  // For public routes, or protected routes with a valid user, continue to the API handler.
  // The API handler (e.g., articles/[slug].get.js) can now check event.context.user
  // It will be null for anonymous users or logged-out users on public routes.
  // It will contain user info for logged-in users on any route (public or protected).
  // console.log(`Server Auth Middleware: Allowing request for path ${path}. User context:`, event.context.user ? event.context.user.id : 'null');
}); 