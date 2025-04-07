<template>
  <div class="w-full max-w-md mx-auto mt-10 px-4 sm:px-0">
    <h1 class="text-2xl font-bold mb-6 text-center text-fg dark:text-white">Sign up</h1>
    <ClientOnly>
      <div>
        <!-- Merged Register Form -->
        <form @submit.prevent="handleRegister" class="space-y-6 p-6 bg-bg shadow-md rounded-lg border border-accent-bg">
            <div>
              <label for="register-email" class="block text-sm font-medium text-fg-muted">Email</label>
              <input
                type="email"
                id="register-email"
                v-model="email"
                required
                autocomplete="email"
                :disabled="isLoading"
                class="mt-1 block w-full px-3 py-2 border border-accent-bg rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-bg text-fg disabled:opacity-60 disabled:bg-bg-muted"
              >
            </div>
            <div>
              <label for="register-password" class="block text-sm font-medium text-fg-muted">Password</label>
              <input
                type="password"
                id="register-password"
                v-model="password"
                required
                autocomplete="new-password"
                :disabled="isLoading"
                class="mt-1 block w-full px-3 py-2 border border-accent-bg rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-bg text-fg disabled:opacity-60 disabled:bg-bg-muted"
                placeholder="Min. 6 characters"
              >
            </div>
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-fg-muted">Confirm Password</label>
              <input
                  type="password"
                  id="confirmPassword"
                  v-model="confirmPassword"
                  required
                  autocomplete="new-password"
                  :disabled="isLoading"
                  class="mt-1 block w-full px-3 py-2 border border-accent-bg rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-bg text-fg disabled:opacity-60 disabled:bg-bg-muted"
                >
            </div>
            <button
              type="submit"
              :disabled="isLoading"
              class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:bg-primary-300 dark:disabled:bg-primary-800 dark:disabled:text-fg-muted transition-colors"
            >
              {{ isLoading ? 'Sending...' : 'Sign up' }}
            </button>
            <p v-if="message" class="text-sm text-center pt-2" :class="isError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
              {{ message }}
            </p>
        </form>
        <!-- End Merged Register Form -->

        <p class="mt-6 text-center text-sm">
          <span class="text-fg-muted">Already have an account?</span>
          <NuxtLink 
            to="/login" 
            class="ml-1 underline text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition-colors font-medium"
          >
            Login here
          </NuxtLink>
        </p>
      </div>

      <!-- SSR fallback -->
      <template #fallback>
         <div class="flex justify-center py-8">
          <div class="animate-pulse w-full max-w-sm">
            <div class="h-6 bg-bg-muted rounded w-32 mb-8 mx-auto"></div> 
            <div class="space-y-6 p-6 bg-bg-muted shadow-md rounded-lg border border-accent-bg">
              <div class="h-4 bg-accent-bg rounded w-1/4"></div>
              <div class="h-10 bg-accent-bg rounded"></div>   
              <div class="h-4 bg-accent-bg rounded w-1/4"></div>
              <div class="h-10 bg-accent-bg rounded"></div>   
              <div class="h-4 bg-accent-bg rounded w-1/4"></div>
              <div class="h-10 bg-accent-bg rounded"></div>   
              <div class="h-10 bg-primary-300 dark:bg-primary-800 rounded mt-2"></div> 
            </div>
            <div class="h-4 bg-bg-muted rounded w-1/2 mx-auto mt-6"></div> 
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRouter } from '#app';

const authStore = useAuthStore();
const router = useRouter();
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const message = ref('');
const isError = ref(false);
const isLoading = ref(false);

async function handleRegister() {
  message.value = ''; // Clear previous message
  isError.value = false;
  isLoading.value = true;

  // Client-side validation
  if (password.value !== confirmPassword.value) {
    message.value = 'Passwords do not match.';
    isError.value = true;
    isLoading.value = false;
    return;
  }
  if (password.value.length < 6) {
      message.value = 'Password must be at least 6 characters long.';
      isError.value = true;
      isLoading.value = false;
      return;
  }

  const success = await authStore.register({
      email: email.value,
      password: password.value
  });

  isLoading.value = false;

  if (success) {
    message.value = 'Registration successful! Redirecting to login...';
    // Redirect to login after a short delay
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } else {
    message.value = authStore.error || 'Registration failed. Please try again.';
    isError.value = true;
  }
}

definePageMeta({
  layout: 'default',
});
</script> 