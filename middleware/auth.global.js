import { useAuthStore } from '~/stores/auth';
import { defineNuxtRouteMiddleware, navigateTo, useState } from '#app';

export default defineNuxtRouteMiddleware(async (to, from) => {
  const authStore = useAuthStore();
  const serverFetchInitiated = process.server ? useState('serverAuthFetchInitiated', () => false) : null;

  if (process.server && authStore.status === 'idle' && !serverFetchInitiated.value) {
    serverFetchInitiated.value = true;
    console.log('Global Auth Middleware (Server): Auth idle, awaiting fetchUser...');
    await authStore.fetchUser();
    console.log('Global Auth Middleware (Server): fetchUser complete. Status:', authStore.status);
  }

  const publicPages = ['/','/login', '/register', '/newsfeed', '/about', '/contact', '/privacy', '/terms', '/forgot-password', '/articles/*', '/scenarios/*'];
  const guestPages = ['/','/login', '/register', '/newsfeed', '/about', '/contact', '/privacy', '/terms', '/forgot-password', '/articles/*', '/scenarios/*'];
  const isAuthenticated = authStore.isAuthenticated;

  const isApiPath = to.path.startsWith('/api/');
  const isStaticAsset = process.server && /\.\w+$/.test(to.path);

  if (isApiPath || isStaticAsset) {
      return;
  }

  const isPublicPage = publicPages.some(page => {
    if (page.endsWith('/*')) {
      // Handle wildcard routes like /articles/*
      const base = page.substring(0, page.length - 2); // Remove /*
      return to.path.startsWith(base + '/');
    }
    // Handle exact matches
    return to.path === page;
  });
  const isGuestPage = guestPages.includes(to.path);
  const isAdminRoute = to.path.startsWith('/admin');

  console.log(`Global Auth Middleware (${process.server ? 'Server' : 'Client'}): Path: ${to.path}, IsAuth: ${isAuthenticated}, IsAdminRoute: ${isAdminRoute}, IsPublicPage: ${isPublicPage}, Status: ${authStore.status}`);

  if (!isPublicPage && !isAdminRoute && !isAuthenticated) {
      console.log(`Global Auth Middleware: Protected page ${to.path} requires auth, redirecting to login.`);
      return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`, { replace: true });
  }

  if (isAdminRoute && !isAuthenticated) {
       console.log(`Global Auth Middleware: Admin page ${to.path} requires auth, redirecting to login.`);
       return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`, { replace: true });
  }

  // if (isGuestPage && isAuthenticated) {
  //     console.log(`Global Auth Middleware: Already authenticated, redirecting from guest page ${to.path} to /newsfeed`);
  //     return navigateTo('/newsfeed', { replace: true });
  // }

  if (to.path === '/' ) {
       console.log('Global Auth Middleware: Authenticated user accessing /, redirecting to /newsfeed');
       return navigateTo('/newsfeed', { replace: true });
  }

  if (isAdminRoute && isAuthenticated) {
       console.log('Global Auth Middleware: Authenticated user accessing /admin, allowing admin middleware to check role.');
       return;
  }

  console.log(`Global Auth Middleware: Allowing navigation to ${to.path}`);
}); 