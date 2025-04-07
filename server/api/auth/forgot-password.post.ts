import { defineEventHandler, readBody, createError } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const email = body?.email;

  // Basic validation
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Please provide a valid email address.',
    });
  }

  // Simulate processing and sending email (without actual database check or email sending)
  console.log(`Mock forgot password request for: ${email}`);

  // Return a success message that avoids confirming email existence
  // Inspired by the tone in error.vue
  return {
    message: 'If an account associated with your email is found, we have sent the necessary instructions. Please check your inbox and spam folder!'
  };
}); 