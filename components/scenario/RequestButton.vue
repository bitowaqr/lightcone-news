<template>
  <NuxtLink
    :to="requestLink"
    class="bg-accent-bg/30 px-2 md:px-4 py-4 relative overflow-hidden hover:bg-accent-bgHover/80 transition-colors duration-100 group h-full flex items-center border border-accent-bg/30 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-bg"
  >
    <div class="flex justify-between items-center space-x-2 leading-tight grow">
      <!-- Left Side: Title & Description -->
      <div class="flex flex-col flex-1 min-w-0">
         <div class="font-semibold text-fg w-full text-sm leading-tight sm:leading-tight line-clamp-3 group-hover:">
           Request a Forecast
         </div>
         <div class="text-[11px] text-fg-muted opacity-90 mt-0.5 truncate">
           Suggest a topic for a new probabilistic forecast.
         </div>
      </div>
      
      <!-- Right Side: Icon & Label -->
      <div class="flex justify-end items-center shrink-0 min-w-12 space-x-1 text-right">
        <!-- Icon Display -->
        <div class="flex flex-col items-center justify-center h-full w-full">
           <Icon name="heroicons:plus-circle-solid" class="w-7 h-7 text-primary opacity-80 group-hover:opacity-100 transition-opacity mb-0.5" />
           <span class="text-[10px] text-fg-muted block leading-none"> Request </span>
        </div>
        <!-- Chevron Icon -->
        <div class="flex items-center h-full">
           <Icon name="heroicons:chevron-right-20-solid" class="w-6 h-6 text-fg-muted opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all duration-100" />
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  articleId: {
    type: String,
    default: null,
  },
  articleTitle: {
    type: String,
    default: null,
  },
});

// Generate the link to /scenarios with query parameters
const requestLink = computed(() => {
  const query = { view: 'request' }; // Always set view to request
  if (props.articleId) {
    query.articleId = props.articleId;
  }
  // Optionally include title for display convenience
  if (props.articleTitle) {
    query.articleTitle = props.articleTitle;
  }
  // Target the main scenarios page with these query params
  return { path: '/scenarios', query }; 
});

</script>

<style scoped>
/* Styles are minimal, mimicking Teaser layout but with distinct background/border */
</style>
