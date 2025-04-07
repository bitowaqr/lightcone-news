import { useAuthStore } from '~/stores/auth';

/**
 * Auth plugin - primarily provides helpers now.
 * Initial user fetch should be handled in app.vue or default layout using await callOnce.
 * @param {Object} nuxtApp - The Nuxt app context
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  // Access auth store
  const authStore = useAuthStore();

  // Add a helper function to check auth status on the nuxtApp instance (optional)
  nuxtApp.provide('isAuthenticated', () => {
    // Ensure you're checking the getter or the derived state correctly
    return authStore.isAuthenticated;
  });

  // Log initial status check (will reflect status AFTER app.vue load)
  // console.log(`Auth plugin (${process.server ? 'server' : 'client'}): Plugin loaded. Current store status: ${authStore.status}`);
}); 