import { useAuthStore } from '~/stores/auth';

export default defineNuxtRouteMiddleware((to, from) => {
  // This check runs on the client AFTER the server middleware has populated the store
  const authStore = useAuthStore();

  // Need to ensure the store has potentially been hydrated from the server
  // In Nuxt 3, state should be automatically shared if useFetch/useAsyncData was used correctly
  // If authStore.user isn't populated on direct navigation, hydration might be the issue.

  if (!authStore.isAuthenticated || authStore.user?.role !== 'admin') {
    console.warn('Admin Middleware: Access denied. User:', authStore.user);
    // Redirect non-admins away
    // You can return navigateTo('/login') or navigateTo('/') or show an error
    return navigateTo('/'); // Redirect to homepage for simplicity
  }
  console.log('Admin Middleware: Access granted.');
}); 