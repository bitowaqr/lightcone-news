<script setup>
import { ref } from 'vue';
import { useRouter } from '#app';

const router = useRouter();
const email = ref('');
const message = ref('');
const isError = ref(false);
const isLoading = ref(false);

async function handleForgotPassword() {
  message.value = '';
  isError.value = false;
  isLoading.value = true;

  if (!email.value) {
    message.value = 'Please enter your email address.';
    isError.value = true;
    isLoading.value = false;
    return;
  }

  try {
    const response = await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    });
    message.value = response.message; 
    isError.value = false; // Explicitly set to false on success
  } catch (error) {
    console.error('Forgot password error:', error.data || error);
    message.value = error.data?.message || 'An unexpected error occurred. Please try again.';
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
}

definePageMeta({
  layout: 'default',
});
</script>

<template>
  <div class="w-full max-w-md mx-auto mt-10 px-4 sm:px-0">
    <h1 class="text-2xl font-bold mb-6 text-center text-fg dark:text-white">Forgot Password</h1>
    <ClientOnly>
      <div>
        <p class="text-sm text-fg-muted mb-6 text-center">
        </p>
        <form @submit.prevent="handleForgotPassword" class="space-y-6 p-6 bg-bg shadow-md rounded-lg border border-accent-bg">
          <div>
            <label for="forgot-email" class="block text-sm font-medium text-fg-muted">Email</label>
            <input
              type="email"
              id="forgot-email"
              v-model="email"
              required
              autocomplete="email"
              :disabled="isLoading"
              class="mt-1 block w-full px-3 py-2 border border-accent-bg rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-bg text-fg disabled:opacity-60 disabled:bg-bg-muted"
            >
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:bg-primary-300 dark:disabled:bg-primary-800 dark:disabled:text-fg-muted transition-colors"
          >
            {{ isLoading ? 'Sending...' : 'Send Reset Instructions' }}
          </button>

          <div v-if="message" :class="isError ? 'bg-red-100 border border-red-400 text-red-700' : 'bg-green-100 border border-green-400 text-green-700'" class="p-2 rounded-md text-sm text-center">
            {{ message }}
          </div>
        </form>

        <p class="mt-6 text-center text-sm">
          <NuxtLink
            to="/login"
            class="underline text-fg-muted hover:text-primary dark:hover:text-primary-400 transition-colors"
          >
            ← Back to Login
          </NuxtLink>
        </p>
      </div>

      <!-- SSR fallback -->
      <template #fallback>
        <div class="flex justify-center py-8">
         <div class="animate-pulse w-full max-w-sm">
           <div class="h-6 bg-bg-muted rounded w-48 mb-8 mx-auto"></div> <!-- Title placeholder -->
           <div class="h-4 bg-bg-muted rounded w-3/4 mb-6 mx-auto"></div> <!-- Subtitle placeholder -->
           <div class="space-y-6 p-6 bg-bg-muted shadow-md rounded-lg border border-accent-bg">
             <div class="h-4 bg-accent-bg rounded w-1/4"></div> <!-- Label -->
             <div class="h-10 bg-accent-bg rounded"></div>   <!-- Input -->
             <div class="h-10 bg-primary-300 dark:bg-primary-800 rounded mt-2"></div> <!-- Button -->
           </div>
           <div class="h-4 bg-bg-muted rounded w-1/3 mx-auto mt-6"></div> <!-- Link placeholder -->
         </div>
       </div>
      </template>
    </ClientOnly>
  </div>
</template> 