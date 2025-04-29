import { defineEventHandler, readBody, createError } from 'h3';
import User from '../../models/User.model'; // Adjust path as needed

// Store the activation code securely, e.g., in environment variables
// For now, hardcoding for demonstration. Replace with process.env.ACTIVATION_CODE in production.
const VALID_ACTIVATION_CODE = 'rosebud';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  // Destructure activationCode along with email and password
  const { email, password, activationCode } = body;

  // --- Activation Code Check ---
  if (!activationCode || activationCode !== VALID_ACTIVATION_CODE) {
    console.warn(`Registration attempt failed: Invalid or missing activation code from ${email || 'unknown'}`);
    throw createError({
        statusCode: 403, // Forbidden
        statusMessage: 'A valid activation code is required to register.',
      });
  }
  // ---------------------------

  // Basic Input Validation
  if (!email || !password) {
    throw createError({
      statusCode: 400, // Bad Request
      statusMessage: 'Email and password are required.',
    });
  }

  // Consider adding more robust validation (e.g., password complexity)
  if (password.length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password must be at least 6 characters long.',
      });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw createError({
        statusCode: 409, // Conflict
        statusMessage: 'User already exists with this email address.',
      });
    }

    // Create new user (password will be hashed by the pre-save hook in the model)
    const newUser = new User({
      email: email, // Consider normalizing: email.toLowerCase().trim()
      password: password, // Provide the plain password, the model will hash it
      // Add any other default fields if necessary
    });

    await newUser.save();

    console.log(`User registered (with valid code): ${newUser.email}`);

    // Don't send back the user object or password hash
    return {
      message: 'Registration successful!',
      userId: newUser._id // Optionally return the new user ID
    };

  } catch (error) {
    // Handle Mongoose validation errors or other issues
    if (error.statusCode) { // Re-throw H3 errors (like our 403, 400, 409)
      throw error;
    }
    console.error("Registration Error (post-activation check):", error);
    // Check for Mongoose validation errors
    if (error.name === 'ValidationError') {
      // Extract meaningful messages from validation errors
      const messages = Object.values(error.errors).map(e => e.message);
      throw createError({
        statusCode: 400, // Bad Request
        statusMessage: `Validation failed: ${messages.join(', ')}`,
      });
    }
    // Generic server error for other cases
    throw createError({
      statusCode: 500,
      statusMessage: 'An unexpected error occurred during registration.',
    });
  }
}); 