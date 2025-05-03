<template>
  <!-- Main container with desktop grid layout -->
  <div class="lg:grid lg:grid-cols-5 lg:gap-x-0">

    <!-- Left Column: Tabs, Filters, List, Pagination - Now uses Flexbox for sticky header -->
    <div 
      :class="{
          'lg:col-span-2 lg:flex lg:flex-col lg:h-[calc(100vh-130px)] px-4 lg:px-0 lg:border-r lg:border-bg-muted': true, // Use calc() for height
          'hidden lg:flex': !isDesktop && (rightColumnMode === 'detail' || rightColumnMode === 'requestForm' || rightColumnMode === 'requestSuccess'), // Hide if showing detail OR form OR success on mobile
          'flex flex-col': isDesktop // Ensure flex direction on desktop
      }"
    >
      <!-- Left Column Header (Sticky Part) -->
      <div class="lg:px-4 pt-8 flex-shrink-0 bg-bg z-10 border-b border-bg-muted pb-2">
          <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-bold text-fg">Explore Scenarios</h1> 
             <!-- Request Button -->
             <button 
                @click="showRequestForm"
                class="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1 rounded hover:opacity-90 transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                 <Icon name="heroicons:plus-circle-20-solid" class="w-5 h-5"/>
                 Request
             </button>
          </div>
          <!-- REMOVED Description Paragraph -->
          <!-- <p class="text-fg-muted mb-6">Browse prediction market scenarios linked to news stories.</p> -->

          <!-- Tab Navigation -->
          <div class="mb-3">
            <nav class="-mb-px flex space-x-6" aria-label="Tabs">
              <button 
                @click="activeTab = 'all'"
                :class="[
                  'whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg hover:border-gray-300'
                ]"
              >
                All Scenarios
              </button>
              <button 
                v-if="authStore.isAuthenticated" 
                @click="activeTab = 'bookmarks'"
                :class="[
                  'whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'bookmarks' ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg hover:border-gray-300'
                ]"
              >
                My Bookmarks
                <span v-if="bookmarkStore.bookmarkedScenarios?.length > 0" class="ml-1.5 inline-block bg-primary/10 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {{ bookmarkStore.bookmarkedScenarios.length }}
                </span>
              </button>
            </nav>
          </div>

          <!-- Filters, Search, and Sort Controls (Reduced margin) -->
           <div v-show="activeTab === 'all'" class="mb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 items-end">
              <!-- Search Input -->
              <div class="md:col-span-2 lg:col-span-1">
                <label for="search" class="block text-xs font-medium text-fg-muted mb-1">Search</label>
                <input 
                  type="text" 
                  id="search" 
                  v-model="searchQuery" 
                  @input="debouncedFetchScenarios" 
                  placeholder="Enter keywords..."
                  class="w-full text-sm px-3 py-1.5 border border-bg-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-bg text-fg"
                />
              </div>

              <!-- Status Filter -->
              <div>
                <label for="status" class="block text-xs font-medium text-fg-muted mb-1">Status</label>
                <select 
                  id="status" 
                  v-model="selectedStatus" 
                  @change="fetchScenarios(1)" 
                  class="w-full text-sm px-3 py-1.5 border border-bg-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-bg text-fg"
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="ALL">All Statuses</option>
                  <option value="CANCELED">Canceled</option>
                  <option value="UPCOMING">Upcoming</option>
                </select>
              </div>

              <!-- Sort Dropdown -->
              <div>
                <label for="sort" class="block text-xs font-medium text-fg-muted mb-1">Sort By</label>
                <select 
                  id="sort" 
                  v-model="selectedSort" 
                  @change="fetchScenarios(1)" 
                  class="w-full text-sm px-3 py-1.5 border border-bg-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-bg text-fg"
                >
                  <option value="newest">Newest Created</option>
                  <option value="oldest">Oldest Created</option>
                  <option value="recently_updated">Recently Updated</option>
                  <option value="closing_soon">Closing Soon</option>
                  <option value="highest_volume">Highest Volume</option>
                  <option value="highest_liquidity">Highest Liquidity</option>
                </select>
              </div>
           </div>
      </div> <!-- End Left Column Header -->

      <!-- Left Column Content (Scrollable Part) -->
      <div class="flex-grow overflow-y-auto pb-8 w-full ">
           <!-- Main Scenarios List & Pagination (for 'All' tab) -->
           <div v-if="activeTab === 'all'" class="pt-4">
               <div v-if="pending && !scenariosData?.scenarios?.length" class="text-center py-12">
                  <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-fg-muted animate-spin inline-block" /> <p class="mt-2 text-fg-muted">Loading scenarios...</p>
                  <div class="w-[400px]"></div>
               </div>
               <div v-else-if="error" class="text-center py-12">
                    <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 text-red-500 inline-block" /> <p class="mt-2 text-red-600">Error loading scenarios...</p>
                    <button @click="refresh" class="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark">Retry</button>
                    <div class="w-[400px]"></div>
               </div>
               <div v-else-if="!pending && scenariosData?.scenarios?.length === 0" class="text-center py-12 grid grid-cols-1 gap-3">
               <div class="flex flex-col items-center justify-center">
                    <Icon name="heroicons:magnifying-glass" class="w-8 h-8 text-fg-muted inline-block" /> <p class="mt-2 text-fg-muted">No scenarios found matching filters.</p>
                    <div class="w-[400px]"></div>
               </div>

                    
               </div>
               
               <div v-else class="grid grid-cols-1 gap-3">
                    <ScenarioCard 
                        v-for="scenario in scenariosData.scenarios" 
                        :key="scenario.scenarioId" 
                        :scenario="scenario"
                        @scenario-selected="handleScenarioSelected" 
                    />
               </div>
               <div v-if="scenariosData?.pagination && scenariosData.pagination.totalPages > 1" class="mt-6 flex justify-between items-center">
                    <button @click="fetchScenarios(currentPage - 1)" :disabled="currentPage <= 1 || pending" class="px-3 py-1 border border-bg-muted rounded-md text-sm font-medium text-fg hover:bg-bg-muted disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
                    <span class="text-xs text-fg-muted">Page {{ scenariosData.pagination.page }} of {{ scenariosData.pagination.totalPages }}</span>
                    <button @click="fetchScenarios(currentPage + 1)" :disabled="currentPage >= scenariosData.pagination.totalPages || pending" class="px-3 py-1 border border-bg-muted rounded-md text-sm font-medium text-fg hover:bg-bg-muted disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
               </div>
           </div>

            <!-- Bookmarked Scenarios List (for 'Bookmarks' tab) -->
           <div v-if="activeTab === 'bookmarks'" class="pt-4">
                 <div v-if="bookmarkStore.isLoading" class="text-center py-12">
                    <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-fg-muted animate-spin inline-block" /> <p class="mt-2 text-fg-muted">Loading bookmarks...</p>
                </div>
                <div v-else-if="!bookmarkStore.bookmarkedScenarios?.length" class="text-center py-12">
                    <Icon name="heroicons:bookmark-slash" class="w-8 h-8 text-fg-muted inline-block" />
                    <p class="mt-2 text-fg-muted">You haven't bookmarked any scenarios yet.</p>
                </div>
                <div v-else class="grid grid-cols-1 gap-3">
                    <ScenarioCard 
                        v-for="scenario in bookmarkStore.bookmarkedScenarios" 
                        :key="scenario.scenarioId" 
                        :scenario="scenario" 
                        @scenario-selected="handleScenarioSelected" 
                    />
                </div>
           </div>
      </div> <!-- End Left Column Content -->

    </div> <!-- End Left Column -->

    <!-- Right Column / Mobile Detail View -->
    <div 
      :class="{
          'lg:col-span-3 lg:overflow-y-auto lg:max-h-[calc(100vh-130px)]': true, // Use calc() for max-height
          'fixed inset-0 bg-bg z-50 overflow-y-auto lg:static lg:z-auto lg:bg-transparent': !isDesktop && (rightColumnMode === 'detail' || rightColumnMode === 'requestForm' || rightColumnMode === 'requestSuccess'), 
          'hidden': rightColumnMode === 'placeholder' && !isDesktop  
      }"
    >
       <!-- Mobile Header with Back Button -->
      <div v-if="!isDesktop && (rightColumnMode === 'detail' || rightColumnMode === 'requestForm' || rightColumnMode === 'requestSuccess')" 
           class="sticky top-0 z-10 bg-bg/80 backdrop-blur-sm p-2 border-b border-bg-muted flex justify-between items-center">
          <!-- Back Button -->
          <button @click="closeRightColumn" class="flex items-center text-sm text-fg-muted hover:text-primary">
              <Icon name="heroicons:arrow-left-20-solid" class="w-5 h-5 mr-1" />
              {{ rightColumnMode === 'requestSuccess' ? 'Close' : 'Back to List' }}
          </button>
           <!-- Title reflecting current view -->
           <span class="text-sm font-medium text-fg-muted">
               {{ rightColumnMode === 'detail' ? 'Scenario Details' : (rightColumnMode === 'requestForm' ? 'Request Scenario' : 'Request Submitted') }}
           </span>
            <!-- Placeholder for potential actions -->
           <div class="w-16"></div> 
      </div>
      
       <!-- Desktop Placeholder -->
      <div v-if="isDesktop && rightColumnMode === 'placeholder'" class="hidden lg:flex h-full items-center justify-center text-center text-fg-muted px-6">
        <p>Select a scenario or request a new one.</p>
      </div>

      <!-- Detail Loading/Error/Content -->
      <div class="py-4 lg:py-6 lg:px-2">
          <div v-if="rightColumnMode === 'detail' && detailPending" class="text-center py-10">
              <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-fg-muted animate-spin inline-block" />
          </div>
          <div v-else-if="rightColumnMode === 'detail' && detailError" class="text-center py-10 text-red-500">
              <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 inline-block mb-2" />
              <p>Error loading scenario details.</p>
          </div>
          <ScenarioDetail v-else-if="rightColumnMode === 'detail' && selectedScenarioData" :scenario="selectedScenarioData" :is-embedded="true" />
          
          <!-- Request Form View -->
          <template v-if="rightColumnMode === 'requestForm'">
              <!-- Optionally pass article context if available -->
               <ScenarioRequestForm 
                 :article-id="contextArticleId" 
                 :article-title="contextArticleTitle" 
                 @submitted="handleRequestSubmitted" 
                 @cancelled="handleRequestCancelled" 
               />
          </template>

          <!-- ADDED: Success View -->
          <template v-if="rightColumnMode === 'requestSuccess'">
              <div class="text-center px-4 py-8">
                <Icon name="heroicons:check-circle-solid" class="w-16 h-16 text-primary-500 mx-auto mb-4" />
                <h2 class="text-2xl font-semibold mb-3 text-fg">Request Submitted!</h2>
                <p class="text-lg text-fg-muted mb-6">
                  {{ successMessageContent || 'Thank you for your forecast request.' }}
                </p>
                <!-- ADDED: Mobile-only Primary Go Back Button -->
                <button
                   v-if="!isDesktop" 
                   @click="closeRightColumn"
                   type="button"
                   class="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
               >
                   Go Back to List
               </button>
              </div>
          </template>
      </div>

    </div> <!-- End Right Column / Mobile Detail View -->

  </div> <!-- End Main container -->
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks';
import { useFetch, useRouter, useRoute } from '#app';

// import ScenarioTeaser from '~/components/scenario/Teaser.vue'; // No longer needed here
import ScenarioCard from '~/components/scenario/Card.vue'; // Import the new Card component
import { debounce } from 'lodash-es'; // Using lodash-es for tree-shaking
import ScenarioDetail from '~/components/scenario/index.vue'; // Import detail component
import ScenarioRequestForm from '~/components/scenario/RequestForm.vue'; // Import the new form

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore(); // Added auth store
const bookmarkStore = useBookmarkStore(); // Added bookmark store

// --- State for selected scenario, layout, AND TABS ---
const selectedScenarioId = ref(null);
const isDesktop = ref(false); // Default to mobile
const activeTab = ref('all'); // Default to 'all' tab
const rightColumnMode = ref('placeholder'); // 'placeholder', 'detail', 'requestForm', 'requestSuccess'

// Context for Request Form (optional)
const contextArticleId = ref(null);
const contextArticleTitle = ref(null);

// Function to handle scenario selection from Card component
const handleScenarioSelected = (scenarioId) => {
  console.log("Scenario selected:", scenarioId);
  // Clear potential article context when selecting from list
  contextArticleId.value = null;
  contextArticleTitle.value = null;
  if (!isDesktop.value) {
    // On mobile, push state to URL for back button handling
    router.push({ query: { ...route.query, view: 'detail', id: scenarioId } });
    // selectedScenarioId will be updated by the route query watcher
  } else {
    // On desktop, just update the state directly
    selectedScenarioId.value = scenarioId;
    rightColumnMode.value = 'detail';
  }
};

// Function to handle closing the detail view (used by mobile back button/link)
const closeRightColumn = () => {
    const { view, id, articleId, articleTitle, ...restQuery } = route.query; // Remove view/id/context
    rightColumnMode.value = 'placeholder'; // Set mode explicitly for desktop
    selectedScenarioId.value = null;
    successMessageContent.value = ''; // Clear success message
    router.push({ query: restQuery }); // Update URL for mobile/history
};

// Function to show request form
const showRequestForm = () => {
    console.log("Showing request form");
    // Clear potential article context when requesting generically
    contextArticleId.value = null;
    contextArticleTitle.value = null;
    if (!isDesktop.value) {
        router.push({ query: { ...route.query, view: 'request' } });
    } else {
        selectedScenarioId.value = null;
        rightColumnMode.value = 'requestForm';
    }
};

// --- Screen Size Detection ---
const checkScreenSize = () => {
  // Using 1024px as the breakpoint for 'lg' in Tailwind default config
  isDesktop.value = window.innerWidth >= 1024;
  // If resizing from mobile to desktop with a scenario selected, keep it selected
  // If resizing from desktop to mobile, the detail view overlay logic handles it
};
onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
  // Sync state from URL on initial load
  if (route.query.view === 'detail' && route.query.id) {
      selectedScenarioId.value = route.query.id;
      rightColumnMode.value = 'detail';
  } else if (route.query.view === 'request') {
      rightColumnMode.value = 'requestForm';
      selectedScenarioId.value = null;
      contextArticleId.value = route.query.articleId || null;
      contextArticleTitle.value = route.query.articleTitle || null;
  } else if (route.query.view === 'success') { // Check for success state from URL?
       rightColumnMode.value = 'requestSuccess'; // Maybe restore success view?
       selectedScenarioId.value = null;
       // Need to persist successMessageContent if we want to restore it from URL state
  } else {
       rightColumnMode.value = 'placeholder';
       selectedScenarioId.value = null;
  }
  if (authStore.isAuthenticated) {
    bookmarkStore.fetchBookmarks();
  }
});
onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

// Reactive refs for filters and pagination
const searchQuery = ref(route.query.q || ''); // Input field model
const effectiveSearchQuery = ref(route.query.q || ''); // Query actually sent to API
const selectedStatus = ref(route.query.status || 'OPEN');
const selectedSort = ref(route.query.sort || 'newest');
const currentPage = ref(parseInt(route.query.page) || 1);
const successMessageContent = ref('');
// const selectedPlatform = ref(route.query.platform || ''); // Example if platform filter added

// Computed object for query parameters
const queryParams = computed(() => {
  const params = {
    page: currentPage.value,
    status: selectedStatus.value,
    sort: selectedSort.value,
    // platform: selectedPlatform.value, // Example
  };
  // Use the effective search query for the API call
  if (effectiveSearchQuery.value) {
    params.q = effectiveSearchQuery.value;
  }
  // Clean undefined/empty params before returning
  Object.keys(params).forEach(key => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) {
      delete params[key];
    }
  });
  return params;
});

// useFetch for scenarios data
const { data: scenariosData, pending, error, refresh } = useFetch('/api/scenarios', {
  query: queryParams, // Pass computed reactive query params
  watch: [queryParams], // Watch the computed object directly
  key: 'scenariosFeed', // Unique key for caching/refetching
  immediate: true, // Fetch immediately when component mounts
});

// Watch auth state changes to potentially fetch bookmarks if user logs in
watch(() => authStore.isAuthenticated, (isAuth, wasAuth) => {
    if (isAuth && !wasAuth) {
        console.log('[ScenariosPage] User authenticated, fetching bookmarks...');
        bookmarkStore.fetchBookmarks();
    } else if (!isAuth && wasAuth) {
        console.log('[ScenariosPage] User logged out.');
        // If user logs out, switch back to 'all' tab if they were on 'bookmarks'
        if (activeTab.value === 'bookmarks') {
            activeTab.value = 'all';
        }
    }
});

// Function to fetch/refresh scenarios and update URL
const fetchScenarios = async (page = currentPage.value) => {
  console.log(`Fetching scenarios list page: ${page}, query:`, queryParams.value);
  currentPage.value = page;
  const currentView = route.query.view;
  const currentId = route.query.id;
  const queryToPush = { ...queryParams.value }; // This now reflects the new page via currentPage
  // Preserve view/id if they exist
  if(currentView) queryToPush.view = currentView;
  if(currentId && currentView === 'detail') queryToPush.id = currentId;
  // Preserve article context if in request view
  if(currentView === 'request'){
      if(route.query.articleId) queryToPush.articleId = route.query.articleId;
      if(route.query.articleTitle) queryToPush.articleTitle = route.query.articleTitle;
  }
  router.push({ query: queryToPush }); 
};

// Debounced version for search input
// Only updates the effectiveSearchQuery (and thus the API query) if conditions are met
const debouncedFetchScenarios = debounce(() => {
  const query = searchQuery.value.trim();
  const queryLength = query.length;
  if ((queryLength === 0 || queryLength >= 3) && effectiveSearchQuery.value !== query) {
    console.log(`Updating effective search query to: "${query}"`);
    effectiveSearchQuery.value = query;
    currentPage.value = 1;
    const currentView = route.query.view;
    const currentId = route.query.id;
    const queryToPush = { ...queryParams.value }; // Includes new `q` via computed prop
    // Preserve view/id if they exist
    if(currentView) queryToPush.view = currentView;
    if(currentId && currentView === 'detail') queryToPush.id = currentId;
    // Preserve article context if in request view
    if(currentView === 'request'){
        if(route.query.articleId) queryToPush.articleId = route.query.articleId;
        if(route.query.articleTitle) queryToPush.articleTitle = route.query.articleTitle;
    }
    router.push({ query: queryToPush });
  } else {
    console.log(`Search input changed to "${query}", but not triggering API fetch.`);
  }
}, 700);

// Watcher for route query changes (handles browser back/forward and manual URL changes)
watch(() => route.query, (newQuery, oldQuery) => {
    console.log('Route query changed:', newQuery);
    
    // Update filter/pagination state 
    const newQueryQ = newQuery.q || '';
    if (searchQuery.value !== newQueryQ) searchQuery.value = newQueryQ;
    if (effectiveSearchQuery.value !== newQueryQ) effectiveSearchQuery.value = newQueryQ;
    if (selectedStatus.value !== (newQuery.status || 'OPEN')) selectedStatus.value = newQuery.status || 'OPEN';
    if (selectedSort.value !== (newQuery.sort || 'newest')) selectedSort.value = newQuery.sort || 'newest';
    if (currentPage.value !== (parseInt(newQuery.page) || 1)) currentPage.value = parseInt(newQuery.page) || 1;

    // Update right column mode and selected ID based on view/id params
    const newMode = newQuery.view === 'detail' ? 'detail' 
                  : (newQuery.view === 'request' ? 'requestForm' 
                  : (newQuery.view === 'success' ? 'requestSuccess' : 'placeholder')); // Added success
    const newId = newQuery.view === 'detail' ? newQuery.id : null;
    
    if (rightColumnMode.value !== newMode) {
        console.log(`Changing right column mode to: ${newMode}`);
        rightColumnMode.value = newMode;
    }
    if (selectedScenarioId.value !== newId) {
        console.log(`Changing selected scenario ID to: ${newId}`);
        selectedScenarioId.value = newId;
    }
    
    // Update context if switching to request view
    if(newMode === 'requestForm'){
         contextArticleId.value = newQuery.articleId || null;
         contextArticleTitle.value = newQuery.articleTitle || null;
    } else if (newMode !== 'requestSuccess') { // Clear context unless showing success
         contextArticleId.value = null;
         contextArticleTitle.value = null;
    }
    
    // If switching to success view, potentially grab message from state? 
    // (Or rely on it being set by handleRequestSubmitted)

}, { deep: true }); 

// --- Fetching Selected Scenario Detail ---
// Create a computed ref for the detail URL that only updates when needed
const detailApiUrl = computed(() => {
    // Only generate URL if mode is detail and ID is present
    return (rightColumnMode.value === 'detail' && selectedScenarioId.value) 
           ? `/api/scenarios/${selectedScenarioId.value}` 
           : null;
});

// Use useFetch for the detail, but disable immediate fetch
// It will react to changes in detailApiUrl
const { 
    data: selectedScenarioData, 
    pending: detailPending, 
    error: detailError, 
    execute: fetchScenarioDetail // Use execute to trigger fetch manually or via watch
} = useFetch(detailApiUrl, {
    immediate: false, // Don't fetch immediately on load
    watch: [detailApiUrl], // Re-fetch when the URL changes (i.e., selectedScenarioId changes)
    key: 'scenarioDetail' // Optional unique key
});

// --- Watch activeTab to reset selection? ---
watch(activeTab, (newTab) => {
    // Reset view when switching tabs
    if(isDesktop.value) {
        rightColumnMode.value = 'placeholder';
        selectedScenarioId.value = null;
    } else {
        // On mobile, changing tabs implies going back to list view
        closeRightColumn();
    }
});

// Helper function to handle request submission
const handleRequestSubmitted = (message) => {
    console.log('Form submitted event received:', message);
    successMessageContent.value = message;
    rightColumnMode.value = 'requestSuccess';
    selectedScenarioId.value = null; 
    if (!isDesktop.value) {
        // Update URL to reflect success state for mobile history
         router.push({ query: { ...route.query, view: 'success' } }); 
    }

};

// Helper function to handle request cancellation
const handleRequestCancelled = () => {
    console.log('Form cancelled event received');
    closeRightColumn(); // Go back to list view / placeholder
};

</script>

<style scoped>
/* Styles for height/scrolling */
/* Explicit height for the scrollable content parent needed for flexbox - REMOVED, handled by calc now */
/* .lg\:flex.lg\:flex-col.lg\:h-screen { height: 100vh; } */

/* Style the scrollbar (optional, webkit browsers) */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px; /* Adjust width */
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent; /* Or a subtle background */
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: var(--color-bg-muted); /* Use theme color */
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-fg-muted); /* Slightly darker on hover */
}

</style> 