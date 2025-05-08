<template>
  <!-- Updated main container for responsive grid -->
  <div class="md:grid md:grid-cols-5 md:gap-x-2 lg:gap-x-4 max-w-screen-xl mx-auto">

    <!-- Main Content Column (Articles) -->
    <div class="md:col-span-3">
      <!-- Loading State -->
      <CommonWelcomeBanner />
      <div v-if="pending && !newsfeedData">Loading newsfeed...</div>

      <!-- Fetch Error State -->
      <div v-else-if="fetchError">
        <p class="text-red-600">Error loading newsfeed: {{ error.data?.message || error.message }}. Please try again later.</p>
      </div>


      <!-- Success State - Article Teasers -->
      <div v-else-if="newsfeedData?.teaserGroups?.length > 0" class="">
          <!-- Start Inlined TeaserFeed -->
            <div class="flex flex-col space-y-4 pb-4 pt-2 md:pt-4">
              <template v-for="(group,i) in newsfeedData.teaserGroups" :key="i" >
                <div :class="{
                  'border-b border-dotted border-fg-muted': i < newsfeedData.teaserGroups.length - 1, // Apply border always for separation
                  'pt-4': i > 0, // Add padding top except for the first item
                  }">

                  <ArticleTeaser 
                    :group="group"
                    :layoutOption="'vertical'"  
                    class="" 
                  />
                </div>
                <WelcomeBannerInside v-if="i === 4" class="my-6 md:my-8" />
              </template>
            </div>
          
          <!-- REMOVED: Old Scenarios Feed Section -->
      </div>

       <!-- Fallback if no teaser groups -->
      <div v-else-if="!pending && newsfeedData?.teaserGroups?.length === 0">
        <p class="p-4 text-center text-fg-muted">No news stories found.</p>
      </div>

      <!-- Fallback if no data and no specific error -->
      <div v-else-if="!pending && !newsfeedData">
        <p class="p-4 text-center text-fg-muted">No newsfeed data available.</p>
      </div>
    </div>

    <!-- UPDATED: Unified Sidebar Container -->
    <div 
      class="hidden md:block md:col-span-2 
             sticky top-12 lg:h-[calc(100vh-160px)] overflow-y-auto p-4"
    >
        <!-- Bookmarked Scenarios Section (Inside Scrollable Container) -->
        <div 
          v-if="authStore.isAuthenticated" 
          class="mb-6" 
        >
          <h2 class="text-base font-semibold text-fg mb-3 pb-2 border-b border-bg-muted">My Bookmarked Scenarios</h2>
          <!-- Loading State -->
          <div v-if="bookmarkStore.isLoading" class="text-center py-4">
             <Icon name="line-md:loading-twotone-loop" class="w-6 h-6 text-fg-muted animate-spin inline-block" />
          </div>
          <!-- Bookmarks List -->
          <div v-else-if="bookmarkStore.bookmarkedScenarios?.length > 0" class="flex flex-col gap-1">
              <ScenarioTeaser 
                  v-for="scenario in bookmarkStore.bookmarkedScenarios.slice(0, 5)" 
                  :key="scenario.scenarioId" 
                  :scenario="scenario" 
               />
               <!-- View All Link -->
               <NuxtLink 
                 v-if="bookmarkStore.bookmarkedScenarios.length > 5" 
                 to="/scenarios?tab=bookmarks"
                 class="text-xs text-primary hover:underline mt-1 block pl-1"
               >
                 View all ({{ bookmarkStore.bookmarkedScenarios.length }})
              </NuxtLink>
          </div>
          <!-- No Bookmarks Message -->
          <div v-else class="text-sm text-fg-muted text-center py-4">
            No bookmarked scenarios yet.
          </div>
        </div>

        <!-- Featured Scenarios Section (Inside Scrollable Container) -->
        <div> 
           <!-- REMOVED hidden md:block, padding, border, bg, sticky, top, max-h, overflow -->
          <!-- Loading indicator (Simplified - shows if main feed loads slow) -->
          <div v-if="pending && !newsfeedData" class="text-center py-4"> 
              <Icon name="line-md:loading-twotone-loop" class="w-6 h-6 text-fg-muted animate-spin inline-block" />
          </div> 
          <!-- Content -->
          <div v-else-if="newsfeedData?.featuredScenarios?.length > 0">
           <h2 class="text-base font-semibold text-fg mb-3 pb-2 border-b border-bg-muted">Featured Scenarios</h2>
            <div class="flex flex-col gap-1">
               <ScenarioTeaser 
                  v-for="scenario in newsfeedData.featuredScenarios" 
                  :key="scenario.scenarioId" 
                  :scenario="scenario" 
               />
            </div>
          </div>
          <!-- Empty State -->
         <div v-else-if="!pending">
           <p class="text-sm text-fg-muted text-center pt-4">No related scenarios found for the current news.</p>
         </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'; // Ensure onMounted is imported
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks'; // Import bookmark store
// Import components used in the template
import ArticleTeaser from '~/components/article/Teaser.vue';
import ScenarioTeaser from '~/components/scenario/Teaser.vue';
import WelcomeBannerInside from '~/components/common/WelcomeBannerInside.vue'; // Added import

const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore(); // Initialize bookmark store

// Attempt to fetch newsfeed data
const { data: newsfeedData, pending, error, refresh } = await useFetch('/api/newsfeed', {
  key: 'newsfeedPageData' // Add key for potential caching benefits
});

// We assume the user is authenticated to reach this page (handled by middleware or index redirect)
const fetchError = computed(() => error.value && error.value.statusCode !== 401);

// ADDED: Fetch bookmarks when the newsfeed component mounts
onMounted(() => {
  if (authStore.isAuthenticated) {
    // console.log('[NewsfeedPage] Component mounted, fetching bookmarks...');
    bookmarkStore.fetchBookmarks();
  }
});

// You might also want to refetch if the user logs in WHILE on this page
// watch(() => authStore.isAuthenticated, (isAuth) => {
//   if (isAuth) {
//     bookmarkStore.fetchBookmarks();
//   }
// });

// Corrected: Compute aggregated scenarios from teaserGroups
// const aggregatedScenarios = computed(() => { // REMOVE THIS ENTIRE COMPUTED PROPERTY
//   if (!newsfeedData.value?.teaserGroups) {
//     return [];
//   }

//   const allScenarios = newsfeedData.value.teaserGroups.reduce((acc, group) => {
//     if (group.scenarios) {
//       acc.push(...group.scenarios);
//     }
//     return acc;
//   }, []);

//   // Ensure uniqueness based on scenarioId
//   const uniqueScenarios = [];
//   const seenIds = new Set();
//   for (const scenario of allScenarios) {
//     if (scenario.scenarioId && !seenIds.has(scenario.scenarioId)) {
//       uniqueScenarios.push(scenario);
//       seenIds.add(scenario.scenarioId);
//     }
//   }
  
//   // Optional: Sort the scenarios if needed (e.g., by platform, name?)
//   uniqueScenarios.sort((a, b) => a.name.localeCompare(b.name));

//   // let randomOrder = Math.random(); // REMOVE THIS LINE - CAUSES HYDRATION MISMATCH
//   // max 7 scenarios shown
//   return uniqueScenarios.slice(0, 7); // REMOVE THE RANDOM SORT, use the deterministic sort from above
// });

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

// Add middleware if this page strictly requires authentication
// definePageMeta({
//   middleware: 'auth' // Assuming an 'auth' middleware exists
// });

</script>

<style scoped>
.sticky { /* Basic sticky positioning */
  position: sticky;
}
.top-20 { /* Keep updated based on current value */
  top: 80px; /* Example: 5rem */
}
</style>