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
        class="w-full bg-article pointer-events-auto flex flex-col relative"
      >
        <div
          class="flex flex-col items-center justify-between gap-1 max-w-4xl mx-auto px-4 pt-8 pb-6"
        >
          <div class="flex items-start justify-center">
            <div class="flex flex-col gap-2 text-lg w-full text-center">

              <img src="~/assets/logos/logo-naked.svg" alt="Lightcone News Logo" class="w-12 h-12 mx-auto dark:invert" />

              <h3 class="text-lg font-semibold mb-1">
                Lightcone News
              </h3>
            <p class="text-base text-fg text-center grow  font-medium">
              Important news with useful context and probabilistic forecasts.
            </p>
            <p class="text-base text-fg text-center grow  font-medium">
              To help you make more sense of the world.
            </p>
            </div>
            <button title="Don't show this again"
            aria-label="Close welcome banner"
            class="p-1 hover:text-primary -mt-2 rounded-full absolute right-4 top-4"
            >

            <Icon
              icon="heroicons:x-mark-20-solid"
              class="w-6 h-6 text-fg hover:opacity-70 dark:text-primary-900"
              @click="dismissPermanently"
            />
            </button>
          </div>


          <div class="flex justify-center mb-2 mt-4">
          <button
            @click="learnMore"
            class="px-4 py-1.5 border bg-primary hover:bg-primary-dark  rounded text-sm font-medium transition-colors focus:outline-none focus:none focus:ring-none text-white "
          >
            About Us
          </button>
        </div>

          <!-- <div
            class="flex items-center justify-center text-white italic text-base me-auto gap-1 py-1 dark:text-primary-900"
            @click="learnMore"
            role="button"
          >
            About Us
            <Icon icon="heroicons:chevron-right" class="w-4 h-4 text-white dark:text-primary-900" />
          </div> -->
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
