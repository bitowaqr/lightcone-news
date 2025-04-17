<template>
  <div class="max-w-4xl mx-auto grow bg-article h-full pt-4 md:pt-12 lg:pt-20 w-full shadow-md">

    <!-- Loading State -->
    <div v-if="pending">Loading scenario {{ scenarioId }}...</div>

    <!-- Not Found State -->
    <div v-else-if="isNotFound">
      <p class="text-red-600">Scenario with ID '{{ scenarioId }}' not found.</p>
    </div>

    <!-- Other Fetch Error State -->
    <div v-else-if="fetchError">
      <p class="text-red-600">Error loading scenario: {{ error.data?.message || error.message }}.</p>
    </div>

    <!-- Success State: Use Detail Container and pass data -->
    <div v-else-if="scenarioData">
      <div class="flex flex-col gap-4">
        <Scenario :scenario="scenarioData" />
        <!-- TODO: Add related articles or other relevant components here if needed -->
      </div>
    </div>

     <!-- Fallback if no data and no specific error -->
    <div v-else>
        <p>No scenario data available.</p>
    </div>

  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth';
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';

// Import the necessary components
import ScenarioDetailContainer from '~/components/scenario/index.vue';

const authStore = useAuthStore();
const route = useRoute();
const scenarioId = computed(() => route.params.id);

// --- useFetch with watch: false --- 
const { data: scenarioData, pending, error, refresh } = await useFetch(() => {
  // Access the id value *at the time refresh() is called*
  const id = route.params.id;
  console.log(`[Scenario Page useFetch] Factory invoked. route.params.id: ${id}`);
  if (!id || id === 'null' || id === 'undefined') {
    console.log('[Scenario Page useFetch] ID invalid, not returning a URL.');
    return; // Return undefined
  }
  const url = `/api/scenarios/${id}`;
  console.log(`[Scenario Page useFetch] Intending to fetch: ${url}`);
  return url;
}, {
  key: `scenario-${route.params.id || 'initial'}`, // Dynamic key
  watch: false, // Disable automatic watching
  immediate: false // Don't fetch immediately
});

// --- Watcher to trigger manual refresh --- 
watch(
  () => route.params.id,
  (newId) => {
    // Refresh only if we have a new, valid id
    if (newId && (typeof newId === 'string')) { // Basic validation
      console.log(`[Scenario Page] Watcher: route.params.id changed to ${newId}, calling refresh()...`);
      refresh();
    } else {
       console.log(`[Scenario Page] Watcher: route.params.id changed to invalid (${newId}), NOT refreshing.`);
    }
  },
  { immediate: true } // Run watcher immediately for initial load
);

// Watch for authentication changes 
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth && error.value && error.value.statusCode === 401) {
    console.log('Auth status changed to authenticated, attempting scenario refresh...');
    if (route.params.id) { // Check if ID is valid
        refresh();
    }
  }
});

// Computed props for template state
const requiresLogin = computed(() => !authStore.isAuthenticated && !pending.value && error.value?.statusCode === 401);
const isNotFound = computed(() => error.value?.statusCode === 404);
const fetchError = computed(() => !pending.value && error.value && ![401, 404].includes(error.value.statusCode));

</script>

<style scoped>
/* Add page-specific styles if needed */
</style> 