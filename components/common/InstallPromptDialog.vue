<template>
  <Transition name="fade">
    <div 
      v-if="show" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4" 
      @click.self="dismiss"
    >
      <div class="bg-bg rounded-lg shadow-xl max-w-sm w-full p-6 text-center transform transition-all">
        <!-- Optional: Add an icon -->
        <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 mb-4">
          <Icon name="heroicons:arrow-down-tray-20-solid" class="h-6 w-6 text-primary-600" aria-hidden="true" />
        </div>
        
        <h3 class="text-lg font-semibold leading-6 text-fg mb-2" id="modal-title">
          Install Lightcone News?
        </h3>
        <div class="mt-2 mb-5">
          <p class="text-sm text-fg-muted">
            Add Lightcone News to your home screen for faster access and an optimised experience.
          </p>
        </div>
        <div class="flex flex-col sm:flex-row-reverse gap-3">
          <button 
            type="button" 
            @click="install"
            class="w-full inline-flex justify-center rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          >
            Install App
          </button>
          <button 
            type="button" 
            @click="dismiss" 
            class="w-full inline-flex justify-center rounded-md bg-bg-muted px-3 py-2 text-sm font-semibold text-fg shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-bg-input focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
          >
            Maybe Later
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
/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Optional: Add a subtle scale effect */
.fade-enter-active .transform,
.fade-leave-active .transform {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from .transform,
.fade-leave-to .transform {
  opacity: 0;
  transform: scale(0.95);
}
.fade-enter-to .transform,
.fade-leave-from .transform {
  opacity: 1;
  transform: scale(1);
}
</style> 