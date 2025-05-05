<template>
  <div class="w-full max-w-md mx-auto mt-10 px-4 sm:px-0">
    <h1 class="text-2xl font-bold mb-6 text-center text-fg dark:text-white">
      {{ viewState === 'register' ? 'Sign up' : 'Join the Waitlist' }}
    </h1>
    <ClientOnly>
      <div>
        <!-- Waitlist Form -->
        <form v-if="viewState === 'waitlist'" @submit.prevent="handleJoinWaitlist" class="space-y-4 p-6 bg-bg shadow-md rounded-lg border border-accent-bg">
          <p class="text-sm text-fg-muted text-center">Lightcone News is currently in closed beta.<br>Sign up to get notified when it launches publicly.</p>
          <div>
            <label for="waitlist-email" class="sr-only">Email</label>
            <input
              type="email"
              id="waitlist-email"
              v-model="waitlistEmail"
              required
              autocomplete="email"
              :disabled="isLoading"
              class="block w-full px-3 py-2 border border-accent-bg rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-bg text-fg disabled:opacity-60 disabled:bg-bg-muted"
              placeholder="your.email@example.com"
            />
          </div>
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:bg-primary-300 dark:disabled:bg-primary-800 dark:disabled:text-fg-muted transition-colors"
          >
            {{ isLoading ? 'Joining...' : 'Join Waitlist' }}
          </button>
          <p v-if="message" class="text-sm text-center pt-1" :class="isError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
            {{ message }}
          </p>
          <div class="text-center pt-2">
            <button type="button" @click="showActivationInput = true" class="text-sm text-primary hover:underline focus:outline-none">
              Have an activation code?
            </button>
          </div>
        </form>

        <!-- Activation Code Input -->
        <form v-if="viewState === 'waitlist' && showActivationInput" @submit.prevent="handleCheckCode" class="mt-4 space-y-3 p-4 bg-bg-muted rounded-lg border border-accent-bg">
           <label for="activation-code" class="block text-sm font-medium text-fg-muted">Activation Code</label>
           <div class="flex space-x-2">
              <input
                type="text"
                id="activation-code"
                v-model="activationCode"
                :disabled="isLoading"
                class="flex-grow block w-full px-3 py-2 border border-accent-bg rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-bg text-fg disabled:opacity-60 disabled:bg-bg-muted"
                placeholder="Enter code"
              />
              <button
                type="submit"
                :disabled="isLoading || !activationCode"
                class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:bg-primary-300 dark:disabled:bg-primary-800 dark:disabled:text-fg-muted transition-colors"
              >
                Activate
              </button>
           </div>
            <p v-if="activationError" class="text-sm text-red-600 dark:text-red-400 pt-1">
              {{ activationError }}
            </p>
        </form>

        <!-- Registration Form (Step 1: Credentials) -->
        <form v-if="viewState === 'register' && registerStep === 1" @submit.prevent="goToSectorStep" class="space-y-6 p-6 bg-bg shadow-md rounded-lg border border-accent-bg">
          <!-- Email Input -->
          <div>
            <label for="register-email" class="block text-sm font-medium text-fg-muted">Email</label>
            <input
              type="email"
              id="register-email"
              v-model="registerEmail"
              required
              autocomplete="email"
              :disabled="isLoading"
              class="mt-1 block w-full px-3 py-2 border border-accent-bg rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm bg-bg text-fg disabled:opacity-60 disabled:bg-bg-muted"
            >
          </div>
          <!-- Password Input -->
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
          <!-- Confirm Password Input -->
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
          <!-- Error Message -->
          <p v-if="isError && message" class="text-sm text-red-600 dark:text-red-400 text-center pt-1">{{ message }}</p>
          <!-- Next Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:bg-primary-300 dark:disabled:bg-primary-800 dark:disabled:text-fg-muted transition-colors"
          >
            Next
          </button>
          <div class="text-center pt-2">
            <button type="button" @click="goBackToWaitlist" class="text-sm text-primary hover:underline focus:outline-none">
              Back to waitlist
            </button>
          </div>
        </form>
        <!-- Registration Form (Step 2: Sector Selection) -->
        <form v-if="viewState === 'register' && registerStep === 2" @submit.prevent="handleRegister" class="space-y-6 p-6 bg-bg shadow-md rounded-lg border border-accent-bg">
          <!-- Instruction Label -->
          <div class="text-sm font-medium text-fg mb-3">Which feeds do you want to subscribe to?</div>
          <!-- News Section -->
          <div class="mb-4">
            <div class="text-xs text-fg-muted mb-1">News</div>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="feed in newsFeeds"
                :key="feed.key"
                type="button"
                :disabled="!feed.enabled"
                @click="feed.enabled ? selectedFeeds = [feed.key] : null"
                :class="[
                  'px-3 py-1 rounded-full border text-xs font-medium transition-colors',
                  feed.enabled ?
                    (selectedFeeds.includes(feed.key)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-bg text-primary border-primary/40 hover:bg-primary/10')
                    : 'bg-bg text-fg-muted border-accent-bg opacity-40 cursor-not-allowed'
                ]"
              >
                {{ feed.label }}
              </button>
            </div>
          </div>
          <!-- Industries Section -->
          <div class="mb-4">
            <div class="text-xs text-fg-muted mb-1">Industries</div>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="feed in industryFeeds"
                :key="feed.key"
                type="button"
                disabled
                class="px-3 py-1 rounded-full border text-xs font-medium bg-bg text-fg-muted border-accent-bg opacity-40 cursor-not-allowed"
              >
                {{ feed.label }}
              </button>
            </div>
          </div>
          <!-- Custom Section -->
          <div class="mb-4">
            <div class="text-xs text-fg-muted mb-1">Custom</div>
            <button type="button" disabled class="px-3 py-1 rounded-full border text-xs font-medium bg-bg text-fg-muted border-accent-bg opacity-40 cursor-not-allowed">
              Request a custom feed
            </button>
          </div>
          <!-- Info Note -->
          <div class="text-xs text-fg-muted mt-2 text-left">
            Currently, only the <span class="font-semibold text-primary">Global</span> feed is available. More options coming soon.
          </div>
          <!-- Back/Submit Buttons -->
          <div class="flex justify-between items-center pt-2">
            <button type="button" @click="goBackToCredentials" class="text-sm text-primary hover:underline focus:outline-none">
              Back
            </button>
            <button
              type="submit"
              :disabled="isLoading"
              class="py-2.5 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:bg-primary-300 dark:disabled:bg-primary-800 dark:disabled:text-fg-muted transition-colors"
            >
              Sign up
            </button>
          </div>
          <!-- Message Area -->
          <p v-if="message" class="text-sm text-center pt-2" :class="isError ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'">
            {{ message }}
          </p>
        </form>
        <!-- End Registration Form -->

        <!-- Login Link (common to both views) -->
        <p v-if="viewState !== 'register'" class="mt-6 text-center text-sm">
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
              <div class="h-10 bg-primary-300 dark:bg-primary-800 rounded mt-2"></div>
              <div class="h-4 bg-accent-bg rounded w-1/3 mx-auto mt-4"></div>
            </div>
            <div class="h-4 bg-bg-muted rounded w-1/2 mx-auto mt-6"></div>
          </div>
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRouter } from '#app'; // Use '#app' for Nuxt 3 router import

const CORRECT_ACTIVATION_CODE = 'rosebud'; // Keep this secret on the client? Maybe fetch from config? For now, hardcode.

const authStore = useAuthStore();
const router = useRouter();

// State Management
const viewState = ref('waitlist'); // 'waitlist', 'register'
const showActivationInput = ref(false);
const activationCode = ref('');
const activationError = ref('');

// Registration Step State
const registerStep = ref(1); // 1 = credentials, 2 = sector selection

// Form Fields
const waitlistEmail = ref('');
const registerEmail = ref(''); // Separate email for registration form
const password = ref('');
const confirmPassword = ref('');

// Sector Selection (mock, only Global enabled)
const selectedFeeds = ref(['global']);
const newsFeeds = [
  { key: 'global', label: 'Global', enabled: true },
  { key: 'us', label: 'US', enabled: false },
  { key: 'uk', label: 'UK', enabled: false },
  { key: 'germany', label: 'Germany', enabled: false },
  { key: 'france', label: 'France', enabled: false },
];
const industryFeeds = [
  { key: 'pharma', label: 'Pharma', enabled: false },
  { key: 'heor', label: 'HEOR', enabled: false },
  { key: 'solar', label: 'Solar', enabled: false },
  { key: 'supplychain', label: 'Supply Chain', enabled: false },
  { key: 'climate', label: 'Climate', enabled: false },
  { key: 'fintech', label: 'Fintech', enabled: false },
  { key: 'energy', label: 'Energy', enabled: false },
  { key: 'agritech', label: 'AgriTech', enabled: false },
  { key: 'cybersecurity', label: 'Cybersecurity', enabled: false },
  { key: 'insurance', label: 'Insurance', enabled: false },
];

// UI Feedback
const message = ref('');
const isError = ref(false);
const isLoading = ref(false);

// --- Waitlist Logic ---
async function handleJoinWaitlist() {
  message.value = '';
  isError.value = false;
  isLoading.value = true;
  activationError.value = ''; // Clear activation error if any

  try {
    const response = await $fetch('/api/waitlist/join', {
      method: 'POST',
      body: { email: waitlistEmail.value },
    });

    if (response.success) {
      message.value = response.message || "You've joined the waitlist!";
      isError.value = false;
      waitlistEmail.value = ''; // Clear input on success
      showActivationInput.value = false; // Hide code input if open
    } else {
      throw new Error(response.message || 'Failed to join waitlist.');
    }
  } catch (error) {
    console.error("Waitlist Error:", error);
    message.value = error.data?.message || error.message || 'An error occurred.';
    isError.value = true;
  } finally {
    isLoading.value = false;
  }
}

// --- Activation Code Logic ---
function handleCheckCode() {
  isLoading.value = true; // Use loading state for feedback
  activationError.value = '';
  message.value = ''; // Clear waitlist message
  isError.value = false;

  // Simulate check (client-side only for now)
  setTimeout(() => { // Add delay for UX
    if (activationCode.value === CORRECT_ACTIVATION_CODE) {
      viewState.value = 'register';
      message.value = ''; // Clear any previous message
      isError.value = false;
      // Optionally prefill register email if waitlist email was entered?
      // registerEmail.value = waitlistEmail.value;
    } else {
      activationError.value = 'Invalid activation code.';
    }
    isLoading.value = false;
  }, 300); // Short delay
}

// --- Registration Logic ---
async function handleRegister() {
  message.value = ''; // Clear previous message
  isError.value = false;
  isLoading.value = true;
  activationError.value = ''; // Clear activation error

  // Call auth store's register action, now including the activation code
  const success = await authStore.register({
    email: registerEmail.value,
    password: password.value,
    activationCode: activationCode.value, // Send the code used to unlock the form
    feeds: selectedFeeds.value // Only 'global' for now
  });

  isLoading.value = false;

  if (success) {
    message.value = 'Registration successful! Redirecting to login...';
    isError.value = false;
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } else {
    // Display error from auth store or a generic message
    message.value = authStore.error || 'Registration failed. Please try again.';
     // Check if the error is specifically about the activation code from the backend
     if (authStore.error && authStore.error.toLowerCase().includes('activation code')) {
         message.value = authStore.error; // Show specific backend error
     }
    isError.value = true;
  }
}

function goToSectorStep() {
  // Client-side validation for password length and match
  message.value = '';
  isError.value = false;
  if (password.value.length < 6) {
    message.value = 'Password must be at least 6 characters long.';
    isError.value = true;
    return;
  }
  if (password.value !== confirmPassword.value) {
    message.value = 'Passwords do not match.';
    isError.value = true;
    return;
  }
  registerStep.value = 2;
}
function goBackToCredentials() {
  registerStep.value = 1;
}

// --- Navigation ---
function goBackToWaitlist() {
    viewState.value = 'waitlist';
    showActivationInput.value = false; // Reset activation input view
    activationCode.value = ''; // Clear code
    activationError.value = ''; // Clear error
    message.value = ''; // Clear messages
    isError.value = false;
    // Clear registration form fields
    registerEmail.value = '';
    password.value = '';
    confirmPassword.value = '';
    registerStep.value = 1;
}


definePageMeta({
  layout: 'default',
});
</script> 
