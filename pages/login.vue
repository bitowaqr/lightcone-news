<template>
  <div class="w-full max-w-md mx-auto mt-12 px-4 sm:px-0">
    <h1 class="text-2xl font-bold mb-6 text-center text-fg dark:text-white">Login</h1>
    <ClientOnly>
      <div>
        <!-- Merged Login Form -->
        <form @submit.prevent="handleLogin" class="space-y-6 p-6 bg-article shadow-md rounded-md border border-accent-bg">
          <div>
            <label for="email" class="block text-sm font-medium text-fg-muted">Email</label>
            <input 
              type="email" 
              id="email" 
              v-model="email" 
              required 
              autocomplete="email" 
              :disabled="isLoggingIn || authStore.isLoading" 
              class="mt-1 block w-full px-3 py-2 border border-accent-bg rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-bg text-fg disabled:opacity-60 disabled:bg-bg-muted"
            >
          </div>
          <div class="">
            <label for="password" class="block text-sm font-medium text-fg-muted flex justify-between">Password 
              <NuxtLink to="/forgot-password" class="underline text-fg-muted hover:text-primary dark:hover:text-primary-400 transition-colors">
                Forgot password?
              </NuxtLink>
            </label>
            <input 
              type="password" 
              id="password" 
              v-model="password" 
              required 
              autocomplete="current-password" 
              :disabled="isLoggingIn || authStore.isLoading" 
              class="mt-1 block w-full px-3 py-2 border border-accent-bg rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-bg text-fg disabled:opacity-60 disabled:bg-bg-muted"
            >
          </div>
          
          <button
            type="submit"
            :disabled="isLoggingIn || authStore.isLoading"
            class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:bg-primary-300 dark:disabled:bg-primary-800 dark:disabled:text-fg-muted transition-colors"
          >
            {{ isLoggingIn || authStore.isLoading ? 'Logging in...' : 'Login' }}
          </button>
          <p v-if="loginError" class="text-sm text-red-600 dark:text-red-400 text-center pt-2">{{ loginError }}</p>
        </form>
        <!-- End Merged Login Form -->

        <div class="mt-4 text-center text-sm flex justify-end gap-1.5">
          <p class="text-fg-muted">No account yet? </p>
          <NuxtLink to="/register" class="underline text-fg-muted hover:text-primary dark:hover:text-primary-400 transition-colors font-medium"> Sign up
          </NuxtLink>
        </div>
      </div>

      <template #fallback>
        <div class="flex justify-center py-8">
          <div class="animate-pulse w-full max-w-sm">
            <div class="h-6 bg-bg-muted rounded w-32 mb-8 mx-auto"></div>
            <div class="space-y-6 p-6 bg-bg-muted shadow-md rounded-lg border border-accent-bg">
              <div class="h-4 bg-accent-bg rounded w-1/4"></div>
              <div class="h-10 bg-accent-bg rounded"></div>
              <div class="h-4 bg-accent-bg rounded w-1/4"></div>
              <div class="h-10 bg-accent-bg rounded"></div>
              <div class="h-10 bg-primary-300 dark:bg-primary-800 rounded mt-2"></div>
            </div>
            <div class="h-4 bg-bg-muted rounded w-1/2 mx-auto mt-4"></div>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRouter, useRoute } from '#app';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const loginError = ref(null);
const isLoggingIn = ref(false);
const email = ref('');
const password = ref('');

// Check if we're already authenticated on component mount
onMounted(() => {
  // Reset error state when component mounts
  loginError.value = null;

  // If already authenticated, redirect (handled by global middleware now, but keep as safeguard)
  if (authStore.isAuthenticated) {
    const redirectPath = route.query.redirect?.toString() || '/';
    router.push(redirectPath);
  }

  // Reset store status if stuck from previous attempt
  if (authStore.isLoading) {
    authStore.status = 'idle';
  }
});

async function handleLogin() {
  // Reset error and set local loading state
  loginError.value = null;
  isLoggingIn.value = true;

  try {
    // Pass credentials to the store action
    const success = await authStore.login({ 
      email: email.value,
      password: password.value 
    });

    if (success) {
      // Redirect to intended page after successful login
      const redirectPath = route.query.redirect?.toString() || '/newsfeed'; // Default to newsfeed
      await router.push(redirectPath);
    } else {
      // Use error from store if available
      loginError.value = authStore.error || 'Login failed. Please check credentials.';
    }
  } catch (error) {
    // Handle unexpected errors during the login process itself
    console.error('Login page error:', error);
    loginError.value = 'An unexpected error occurred. Please try again.';
    if (authStore.isLoading) {
       authStore.status = 'error';
    }
  } finally {
    isLoggingIn.value = false;
  }
}

definePageMeta({
  layout: 'default',
});
</script> 