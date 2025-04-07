<script setup>
const props = defineProps({
  error: Object
});

const is404 = computed(() => props.error?.statusCode === 404);

useHead({
  title: is404.value ? 'Page Not Found | Lightcone.news' : 'Error | Lightcone.news',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
});

function handleGoHome() {
  console.log('handleGoHome');
  clearError();
  navigateTo('/');
}

function handleGoBack() {
  clearError();
  // Check if history exists and has entries to go back to
  console.log(window.history);
  if (window.history && window.history.length > 1) {
    history.back();
  } else {
    // If no history, redirect to home
    navigateTo('/');
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-bg">
    <div class="max-w-md w-full text-center">
      <!-- Logo -->
      <div class="mb-8 flex justify-center dark:invert">
        <img 
          src="~/assets/logos/logo-naked.svg" 
          alt="Lightcone.news Logo"
          class="w-24 h-24"
        />
      </div>
      
      <!-- Error Content -->
      <div v-if="is404">
        <h1 class="text-4xl font-medium text-primary mb-4">404: Page Not Found</h1>
        <p class="text-fg-muted mb-6">
          Sorry, we couldn't find the page you were looking for. It might have been moved, deleted, or never existed.
        </p>
      </div>
      <div v-else>
        <h1 class="text-3xl font-medium text-primary mb-4">
          We did not foresee this...
          </h1>
        <p class="text-fg-muted mb-6">
          An unexpected error occurred while processing your request.
        </p>
        <div class="bg-bg-muted p-4 rounded-md text-left mb-6 overflow-auto max-h-48">
          <pre class="text-xs text-fg-muted font-mono">{{ error }}</pre>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          @click="handleGoBack" 
          class="px-4 py-2 border border-fg-muted rounded-md text-fg hover:bg-bg-muted transition-colors"
        >
          ← Go Back
        </button>
        <button 
          @click="handleGoHome" 
          class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
        >
          Return to Home
        </button>
      </div>
      
      <!-- Simple Footer -->
      <div class="mt-12 text-sm text-fg-muted border-t border-bg-muted pt-6">
        Lightcone.news
      </div>
    </div>
  </div>
</template>
