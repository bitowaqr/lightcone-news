import { defineEventHandler, readBody, createError, setCookie } from 'h3';
import jwt from 'jsonwebtoken';
import User from '../../models/User.model'; // Adjust path as needed
// import { useRuntimeConfig } from '#imports'; // Auto-imported

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const body = await readBody(event);
  const { email, password } = body;

  if (!email || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Email and password are required.',
    });
  }

  if (!config.jwtSecret || !config.jwtExpiresIn) {
    console.error('JWT Secret or Expiry not configured in runtimeConfig');
    throw createError({
      statusCode: 500,
      statusMessage: 'Authentication configuration error.',
    });
  }

  try {
    // Find user by email. Explicitly select password field which is excluded by default.
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      throw createError({
        statusCode: 401, // Unauthorized
        statusMessage: 'Invalid credentials.',
      });
    }

    // Compare the provided password with the stored hash
    // The comparePassword method requires the user object to have the password field
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      throw createError({
        statusCode: 401, // Unauthorized
        statusMessage: 'Invalid credentials.',
      });
    }

    // --- Password is correct, proceed with JWT --- 

    // --- >>> START: Update Login/Session History <<< ---
    const now = new Date();
    user.lastLogin = now; // Timestamp of this specific login
    user.lastActivityAt = now; // Also update last activity to now
    
    // Initialize sessionActivityLog if it doesn't exist
    if (!user.sessionActivityLog) {
      user.sessionActivityLog = [];
    }
    user.sessionActivityLog.push(now); // Record this login as a session start

    // Optional: Limit the size of sessionActivityLog
    // const maxHistory = 100;
    // if (user.sessionActivityLog.length > maxHistory) {
    //   user.sessionActivityLog = user.sessionActivityLog.slice(-maxHistory);
    // }

    await user.save(); // Save the updated timestamps and history
    // --- >>> END: Update Login/Session History <<< ---

    // Create JWT Payload - Use userId consistently
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
      // joinDate: user.joinDate, // These can be large, consider omitting if not needed in JWT
      // lastLogin: user.lastLogin, // Use DB value if needed
      // Add any other non-sensitive info needed frequently
    };

    // Sign the token
    const token = jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });

    // Set HttpOnly cookie
    setCookie(event, 'auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      sameSite: 'lax', // Can be 'strict' or 'lax' or 'none' (if secure: true)
      maxAge: parseInt(config.jwtExpiresIn) * 24 * 60 * 60, // Convert expiry (e.g., '7d') to seconds, adjust calculation if format differs
      path: '/',
    });

    // Return user info (excluding password and other sensitive fields)
    return {
      user: {
        id: user._id,
        userId: user._id,
        email: user.email,
        role: user.role,
        joinDate: user.joinDate,
        lastLogin: user.lastLogin,
        // Add other fields needed by the frontend here
      },
      message: 'Login successful!',
    };

  } catch (error) {
    if (error.statusCode) { // Re-throw H3 errors
        throw error;
    }
    console.error("Login Error:", error);
    // Generic server error for other cases
    throw createError({
      statusCode: 500,
      statusMessage: 'An unexpected error occurred during login.',
    });
  }
}); 