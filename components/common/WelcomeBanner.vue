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
      console.log('WelcomeBanner: Status not set or is show, planning to show banner.');
      // Use setTimeout to delay the banner appearance
      setTimeout(() => {
        // Double-check status hasn't changed in the meantime (unlikely but safe)
        const latestStatus = localStorage.getItem(consentKey);
        if (!latestStatus || latestStatus === 'show') {
             showBanner.value = true;
             console.log('WelcomeBanner: Showing banner after delay.');
             // Optionally set status to show if it was null, though not strictly necessary
             if (!latestStatus) {
                 localStorage.setItem(consentKey, 'show');
             }
        }
      }, 100); // 1 second delay
    } else {
      console.log(`WelcomeBanner: Banner status is '${currentStatus}', not showing.`);
    }
  }
});

function learnMore() {
  dismiss(); // Hide banner immediately
  router.push('/about'); // Navigate to ABOUT page
}

function dismiss() {
  showBanner.value = false;
  console.log('WelcomeBanner: Dismissed for this session.');
  // No localStorage change needed for temporary dismiss
}

function dismissPermanently() {
  showBanner.value = false;
  // Persist decision
  if (process.client) {
    localStorage.setItem(consentKey, 'never');
    console.log('WelcomeBanner: Dismissed permanently.');
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
      class="fixed top-0 left-0 right-0 z-[90] p-2 sm:p-4 pointer-events-none max-w-4xl mx-auto" 
    >
      <div class="w-full bg-bg dark:bg-bg sm:rounded shadow-lg py-2 lg:py-4 px-4 lg:px-5 border border-blue-200 dark:border-primary relative pointer-events-auto flex flex-col ">
        <!-- Close Button (Top Right) - Made Larger -->
        <button 
          @click="dismiss"
          class="absolute top-1 right-1 p-1 text-fg-muted hover:text-fg hover:bg-bg-muted rounded-full focus:outline-none"
          aria-label="Close welcome banner"
        >
          <Icon icon="heroicons:x-mark-20-solid" class="w-6 h-6" /> 
        </button>

        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 max-w-4xl mx-auto my-2">
          <p class="text-base text-fg text-center sm:text-left grow">
            ✨ Welcome to Lightcone News! If this is your first time here, click 'Learn More' to see what lightcone news is all about and how the predictions work.
          </p>
          <!-- Button Container - Swapped Order -->
          <div class="flex-shrink-0 flex flex-col xs:flex-row sm:flex-row gap-3  w-full xs:w-auto sm:w-auto mt-4 items-end">
             <!-- Never Show Again - Changed Style -->
            <button
              @click="dismissPermanently"
              class="text-xs text-fg-muted hover:text-primary hover:underline focus:outline-none focus:underline whitespace-nowrap my-auto"
              title="Don't show this banner again"
            >
              Never Show Again
            </button>
            <!-- Learn More - Now on Right -->
            <button
              @click="learnMore"
              class="w-full xs:w-auto px-4 py-2 bg-primary hover:bg-primary-600 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-secondary-bg"
            >
              Learn More
            </button>
           
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