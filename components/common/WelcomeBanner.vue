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
    <div v-if="showBanner" class="pointer-events-none md:px-2 lg:px-6">
      <div
        class="w-full bg-primary-600 dark:bg-primary-300 pointer-events-auto flex flex-col relative "
      >
        <div
          class="flex flex-col items-center justify-between gap-1 max-w-4xl mx-auto p-4"
        >
          <div class="flex items-start justify-center">
            <p class="text-base text-white text-left grow dark:text-primary-900">
              Visiting this page for the first time? Follow the link below to
              learn more about Lightcone News and how to read our forecasts.
            </p>
            <button title="Don't show this again"
            aria-label="Close welcome banner"
            class="p-1 hover:text-primary -mt-2 rounded-full "
            >

            <Icon
              icon="heroicons:x-mark-20-solid"
              class="w-6 h-6 text-white hover:opacity-70 dark:text-primary-900"
              @click="dismissPermanently"
            />
            </button>
          </div>

          <div
            class="flex items-center justify-center text-white italic text-base me-auto gap-1 py-1 dark:text-primary-900"
            @click="learnMore"
            role="button"
          >
            About Us
            <Icon icon="heroicons:chevron-right" class="w-4 h-4 text-white dark:text-primary-900" />
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
</style>
