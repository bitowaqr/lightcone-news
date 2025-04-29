<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-2 text-fg">Explore Scenarios</h1>
    <p class="text-fg-muted mb-6">Browse, filter, and search through prediction market scenarios.</p>

    <!-- Filters, Search, and Sort Controls -->
    <div class="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
      <!-- Search Input -->
      <div class="lg:col-span-2">
        <label for="search" class="block text-sm font-medium text-fg-muted mb-1">Search Scenarios</label>
        <input 
          type="text" 
          id="search" 
          v-model="searchQuery" 
          @input="debouncedFetchScenarios" 
          placeholder="Enter keywords..."
          class="w-full px-3 py-2 border border-bg-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-bg text-fg"
        />
      </div>

      <!-- Status Filter -->
      <div>
        <label for="status" class="block text-sm font-medium text-fg-muted mb-1">Status</label>
        <select 
          id="status" 
          v-model="selectedStatus" 
          @change="fetchScenarios(1)" 
          class="w-full px-3 py-2 border border-bg-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-bg text-fg"
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
        <label for="sort" class="block text-sm font-medium text-fg-muted mb-1">Sort By</label>
        <select 
          id="sort" 
          v-model="selectedSort" 
          @change="fetchScenarios(1)" 
          class="w-full px-3 py-2 border border-bg-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-bg text-fg"
        >
          <option value="newest">Newest Created</option>
          <option value="oldest">Oldest Created</option>
          <option value="recently_updated">Recently Updated</option>
          <option value="closing_soon">Closing Soon</option>
          <option value="highest_volume">Highest Volume</option>
          <option value="highest_liquidity">Highest Liquidity</option>
        </select>
      </div>

      <!-- Platform Filter (Example - Could be multi-select later) -->
      <!-- <div>
        <label for="platform" class="block text-sm font-medium text-gray-700 mb-1">Platform</label>
        <select id="platform" v-model="selectedPlatform" @change="fetchScenarios(1)" class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
          <option value="">All Platforms</option>
          <option value="Polymarket">Polymarket</option>
          <option value="Metaculus">Metaculus</option>
          <option value="Manifold">Manifold</option>
          Add other platforms 
        </select>
      </div> -->
    </div>

    <!-- Loading State -->
    <div v-if="pending && !scenariosData?.scenarios?.length" class="text-center py-12">
      <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-fg-muted animate-spin inline-block" />
      <p class="mt-2 text-fg-muted">Loading scenarios...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12">
      <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 text-red-500 inline-block" />
      <p class="mt-2 text-red-600">Error loading scenarios: {{ error.data?.message || error.message }}.</p>
       <button @click="fetchScenarios()" class="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark">
        Retry
      </button>
    </div>

    <!-- No Results State -->
     <div v-else-if="!pending && scenariosData?.scenarios?.length === 0" class="text-center py-12">
        <Icon name="heroicons:magnifying-glass" class="w-8 h-8 text-fg-muted inline-block" />
        <p class="mt-2 text-fg-muted">No scenarios found matching your criteria.</p>
    </div>

    <!-- Scenarios Grid -->
    <div v-else-if="scenariosData?.scenarios?.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <ScenarioCard 
        v-for="scenario in scenariosData.scenarios" 
        :key="scenario.scenarioId" 
        :scenario="scenario"
      />
    </div>

    <!-- Pagination -->
    <div v-if="scenariosData?.pagination && scenariosData.pagination.totalPages > 1" class="mt-8 flex justify-between items-center">
       <button 
        @click="fetchScenarios(currentPage - 1)" 
        :disabled="currentPage <= 1 || pending"
        class="px-4 py-2 border border-bg-muted rounded-md text-sm font-medium text-fg hover:bg-bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Icon name="heroicons:arrow-left-20-solid" class="w-5 h-5 inline-block mr-1 align-text-bottom" />
        Previous
      </button>
      
      <span class="text-sm text-fg-muted">
        Page {{ scenariosData.pagination.page }} of {{ scenariosData.pagination.totalPages }} 
        ({{ scenariosData.pagination.total }} total scenarios)
      </span>

      <button 
        @click="fetchScenarios(currentPage + 1)" 
        :disabled="currentPage >= scenariosData.pagination.totalPages || pending"
        class="px-4 py-2 border border-bg-muted rounded-md text-sm font-medium text-fg hover:bg-bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
        <Icon name="heroicons:arrow-right-20-solid" class="w-5 h-5 inline-block ml-1 align-text-bottom" />
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useFetch, useRoute, useRouter } from '#app'; 
// import ScenarioTeaser from '~/components/scenario/Teaser.vue'; // No longer needed here
import ScenarioCard from '~/components/scenario/Card.vue'; // Import the new Card component
import { debounce } from 'lodash-es'; // Using lodash-es for tree-shaking

const route = useRoute();
const router = useRouter();

// Reactive refs for filters and pagination
const searchQuery = ref(route.query.q || ''); // Input field model
const effectiveSearchQuery = ref(route.query.q || ''); // Query actually sent to API
const selectedStatus = ref(route.query.status || 'OPEN');
const selectedSort = ref(route.query.sort || 'newest');
const currentPage = ref(parseInt(route.query.page) || 1);
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

// Function to fetch/refresh scenarios and update URL
const fetchScenarios = async (page = currentPage.value) => {
  // This function primarily handles pagination and explicit filter changes
  // Search changes are handled by debouncedFetchScenarios updating effectiveSearchQuery
  console.log(`Fetching scenarios for page: ${page}, query:`, queryParams.value);
  currentPage.value = page;
  // Update URL query parameters without reloading the page
  router.push({ query: queryParams.value }); 
  // Refresh is triggered by the watcher on queryParams
};

// Debounced version for search input
// Only updates the effectiveSearchQuery (and thus the API query) if conditions are met
const debouncedFetchScenarios = debounce(() => {
  const query = searchQuery.value.trim(); // Use the raw input model here
  const queryLength = query.length;
  
  // Only update the effective query if it meets criteria AND is different
  if ((queryLength === 0 || queryLength >= 3) && effectiveSearchQuery.value !== query) {
    console.log(`Updating effective search query to: "${query}"`);
    effectiveSearchQuery.value = query; // This change will trigger the queryParams watcher
    currentPage.value = 1; // Reset to page 1 on new search
    // Update the URL to reflect the new effective search term
    router.push({ query: queryParams.value }); 
  } else {
    console.log(`Search input changed to "${query}", but not triggering API fetch.`);
  }
}, 700); // Increased debounce to 700ms

// Initial fetch handled by immediate: true on useFetch

// Watch route query changes (e.g., browser back/forward)
watch(() => route.query, (newQuery) => {
    console.log('Route query changed:', newQuery);
    const newQueryQ = newQuery.q || '';
    searchQuery.value = newQueryQ; // Keep input field synced
    effectiveSearchQuery.value = newQueryQ; // Keep effective query synced
    selectedStatus.value = newQuery.status || 'OPEN';
    selectedSort.value = newQuery.sort || 'newest';
    currentPage.value = parseInt(newQuery.page) || 1;
    // No need to call fetchScenarios here, the watch on queryParams
    // which depends on these refs will trigger the fetch.
}, { deep: true }); 


</script>

<style scoped>
/* Add any page-specific styles if needed */
</style> 