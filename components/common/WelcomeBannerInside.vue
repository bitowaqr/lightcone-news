<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';

const router = useRouter();
const showBanner = ref(false);
const consentKey = 'lightcone_welcome_banner_status'; // localStorage key

onMounted(() => {
  // Check localStorage only on client-side
  if (process.client) {
    const currentStatus = localStorage.getItem(consentKey);
    // Only show if status is null/undefined (first visit) or explicitly 'show'
    if (!currentStatus || currentStatus === 'show') {
      // Use setTimeout to delay the banner appearance
      setTimeout(() => {
        // Double-check status hasn't changed in the meantime (unlikely but safe)
        const latestStatus = localStorage.getItem(consentKey);
        if (!latestStatus || latestStatus === 'show') {
             showBanner.value = true;
             // Optionally set status to show if it was null, though not strictly necessary
             if (!latestStatus) {
                 localStorage.setItem(consentKey, 'show');
             }
        }
      }, 100); // 1 second delay
    }
  }
});

function learnMore() {
  dismiss(); // Hide banner immediately
  router.push('/about'); // Navigate to ABOUT page
}

function dismiss() {
  showBanner.value = false;
}

function dismissPermanently() {
  showBanner.value = false;
  // Persist decision
  if (process.client) {
    localStorage.setItem(consentKey, 'never');
  }
}
</script>

<template>
  <transition
    enter-active-class="transition ease-out duration-500"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="showBanner"
      class="pointer-events-none lg:px-4" 
    >
      <div class="w-full bg-article dark:bg-primary-900/30 pointer-events-auto text-center p-6 md:p-8 relative">
        <img src="~/assets/logos/logo-naked.svg" alt="Lightcone News Logo" class="w-12 h-12 mx-auto mb-4 dark:invert" />
        
        <div class="text-base md:text-lg text-fg dark:text-fg-dark mb-6">
          
          <h3 class="text-lg font-bold mb-6">
            New to Lightcone News? 
          </h3>
          <p class="leading-relaxed">Follow the link below to
            learn more about how to read our forecasts.</p>
        </div>

        <div class="flex justify-center mb-6">
          <button
            @click="learnMore"
            class="px-6 py-2 border bg-primary hover:bg-primary-dark  rounded text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-primary-50 text-white dark:text-primary-900 dark:focus:ring-offset-primary-900/30"
          >
            About Us
          </button>
        </div>

        <button 
          @click="dismissPermanently" 
          class="absolute top-3 right-3 text-fg-muted hover:text-primary p-1 rounded-full transition-colors"
          aria-label="Close welcome banner permanently"
          title="Don't show this again"
        >
          <Icon icon="heroicons:x-mark-20-solid" class="w-5 h-5" /> 
        </button>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Styles are now minimal, leveraging Tailwind */
</style> 