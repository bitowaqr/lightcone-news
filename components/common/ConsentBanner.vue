<script setup>
import { ref, onMounted } from 'vue';

const { gtag } = useGtag();
const showBanner = ref(false);
const consentKey = 'gtag_consent_given';

onMounted(() => {
  // Check localStorage only on client-side
  if (process.client) {
    const consentGiven = localStorage.getItem(consentKey);
    if (!consentGiven) {
      console.log('ConsentBanner: No consent decision found, showing banner.');
      showBanner.value = true;
    } else {
      console.log(`ConsentBanner: Consent decision already made: ${consentGiven}`);
    }
  }
});

function grantConsent() {
  console.log('ConsentBanner: User clicked Allow.');
  // Update gtag consent state
  gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted'
  });
  console.log('ConsentBanner: gtag consent updated to granted.');
  // Persist decision
  if (process.client) {
    localStorage.setItem(consentKey, 'true');
  }
  showBanner.value = false;
}

function declineConsent() {
  console.log('ConsentBanner: User clicked Decline.');
  // Consent remains denied (default state), just persist the decision
  if (process.client) {
    localStorage.setItem(consentKey, 'false');
  }
  console.log('ConsentBanner: gtag consent remains denied.');
  showBanner.value = false;
}
</script>

<template>
  <transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="transform opacity-0 translate-y-4"
    enter-to-class="transform opacity-100 translate-y-0"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="transform opacity-100 translate-y-0"
    leave-to-class="transform opacity-0 translate-y-4"
  >
    <div
      v-if="showBanner"
      class="fixed bottom-0 left-0 right-0 z-[100] p-2 sm:p-4"
    >
      <div class="max-w-4xl mx-auto bg-secondary-bg backdrop-blur-sm rounded-lg shadow-xl p-3 sm:p-5 border border-gray-300 dark:border-gray-700">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p class="text-sm text-fg text-center sm:text-left grow">
            🍪 We use cookies to understand how you use our site and to improve your experience. This includes essential cookies for site functionality and analytics cookies. By clicking "Allow", you consent to our use of cookies.
            You can learn more in our <NuxtLink to="/privacy" class="underline hover:text-primary">Privacy Policy</NuxtLink>.
          </p>
          <!-- Button Container: Stack vertically on small screens, row on larger -->
          <div class="flex-shrink-0 flex flex-col xs:flex-row sm:flex-row gap-2 w-full xs:w-auto sm:w-auto mt-4 sm:mt-0">
            <button
              @click="grantConsent"
              class="w-full xs:w-auto px-5 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary-bg sm:order-last"
            >
              Allow
            </button>
            <button
              @click="declineConsent"
              class="w-full xs:w-auto px-5 py-2 bg-transparent hover:bg-gray-500/10 text-fg-muted hover:text-fg rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-secondary-bg"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Add any specific styles if needed */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
</style> 