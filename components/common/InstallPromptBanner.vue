<template>
  <Transition name="slide-up">
    <div 
      v-if="show" 
      class="fixed bottom-0 left-0 right-0 z-40 p-4 flex justify-center"
      aria-live="polite"
    >
      <div class="bg-bg rounded-sm shadow-lg w-full max-w-lg p-4 flex items-center gap-4 border border-bg-muted">
        <!-- Icon -->
        <div class="flex-shrink-0 hidden sm:block">
          <div class="flex items-center justify-center h-12 w-12 rounded-full bg-article">
            <Icon name="heroicons:arrow-down-tray-20-solid" class="h-5 w-5 text-primary-600" aria-hidden="true" />
          </div>
        </div>
        
        <!-- Text Content -->
        <div class="flex-grow">
          <h3 class="text-sm font-semibold leading-5 text-fg mb-0.5" id="banner-title">
            Install Lightcone News App?
          </h3>
          <p class="text-xs text-fg-muted leading-tight">
            Add Lightcone News to your home screen for faster access and an optimised experience.
          </p>
        </div>

        <!-- Buttons -->
        <div class="flex-shrink-0 flex gap-4">
          <button 
            type="button" 
            @click="install"
            class="inline-flex items-center rounded-sm bg-primary px-4 py-1 text-xs font-semibold text-white hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 grow-0"
          >
            Install
          </button>
          <button 
            type="button" 
            @click="dismiss" 
            aria-label="Dismiss install prompt"
            class="inline-flex items-center rounded-md p-1 text-fg-muted hover:bg-bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
          >
             <Icon name="heroicons:x-mark-20-solid" class="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['install', 'dismiss']);

const install = () => {
  emit('install');
};

const dismiss = () => {
  emit('dismiss');
};
</script>

<style scoped>
/* Slide-up Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.4s ease, opacity 0.4s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

.slide-up-enter-to,
.slide-up-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style> 