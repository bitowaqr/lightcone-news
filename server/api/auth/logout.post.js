import { defineEventHandler, deleteCookie } from 'h3';

export default defineEventHandler((event) => {
  // Clear the authentication cookie
  deleteCookie(event, 'auth_token', {
    httpOnly: true,
    path: '/',
    // Secure and SameSite should match the settings used when setting the cookie
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  console.log('Logout: Cleared auth_token cookie.')

  return { message: 'Logout successful' };
}); 