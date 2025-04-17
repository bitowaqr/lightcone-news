<template>
  <div class="bg-article p-md-4  max-w-4xl mx-auto shadow-md">
    <!-- Loading State -->
    <div v-if="pending">Loading newsfeed...</div>

    <!-- Fetch Error State -->
    <div v-else-if="fetchError">
      <p class="text-red-600">Error loading newsfeed: {{ error.data?.message || error.message }}. Please try again later.</p>
    </div>

    <!-- Success State -->
    <div v-else-if="newsfeedData" class="">
      <!-- Start Inlined TeaserFeed -->
      <div class="">
        <div v-if="!newsfeedData.teaserGroups || newsfeedData.teaserGroups.length === 0">
            <p>No content found.</p>
        </div>
        <div v-else class="flex flex-col space-y-8 pb-4">
          <div v-for="(group,i) in newsfeedData.teaserGroups" :key="i" >
            <div :class="{
              'border-b border-dotted border-fg-muted': i !== newsfeedData.teaserGroups.length-1,
            'mt-4 md:mt-8 lg:mt-12': i === 0,}">

            <ArticleTeaser :group="group"
            :layoutOption="i % 2 === 0 ? 'vertical' : 'horizontal'" 
            class="px-2 md:px-4 lg:px-8"
            />
            </div>
          </div>
        </div>
      </div>
      <div v-if="!newsfeedData.scenariosFeed || newsfeedData.scenariosFeed.length === 0">
        <p>No Scenarios found.</p>
      </div>
        <div v-else class="flex flex-col">
          <h2 class="bg-black text-sm text-white dark:text-black dark:bg-white font-semibold py-2 px-4 border-b border-t border-dotted border-fg-muted">Featured Scenarios</h2>
          <div v-for="(scenario, index) in newsfeedData.scenariosFeed" :key="index"  class="border-b border-dotted border-fg-muted">
            <ScenarioTeaser :scenario="scenario" />
          </div>
        </div>
    </div>

    <!-- Fallback if no data and no specific error -->
    <div v-else>
      <p>No newsfeed data available.</p>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth';
const authStore = useAuthStore();

// Attempt to fetch newsfeed data - SSR by default
const { data: newsfeedData, pending, error, refresh } = await useFetch('/api/newsfeed', {
  // Add key for better caching/refetching management if needed
  // key: 'newsfeedPageData'
});

// Watch for authentication changes to refresh data if needed
// Note: This might be less relevant if this page requires auth via middleware
// watch(() => authStore.isAuthenticated, (isAuth, wasAuth) => {
//   // Refresh if the user logs out and then logs back in *while on this page*
//   // or if an initial fetch failed due to auth and they subsequently log in.
//   if (isAuth && !wasAuth && error.value && error.value.statusCode === 401) {
//     console.log('User authenticated, refreshing newsfeed data...');
//     refresh();
//   }
//   // Consider if redirection should happen if user logs out while on this page
//   // else if (!isAuth && wasAuth) {
//   //   navigateTo('/login'); // Or index, depending on desired flow
//   // }
// });

// We assume the user is authenticated to reach this page (handled by middleware or index redirect)
// This computed property helps display fetch errors other than 401 (which shouldn't happen if auth is enforced)
const fetchError = computed(() => error.value && error.value.statusCode !== 401);

// Add middleware if this page strictly requires authentication
// definePageMeta({
//   middleware: 'auth' // Assuming an 'auth' middleware exists
// });

</script>

<style scoped>
/* Add page-specific styles if needed */
</style>