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

// Fetch scenario data - SSR by default
// API endpoint /api/scenarios/{id} handles auth check internally
const { data: scenarioData, pending, error, refresh } = await useFetch(() => {
  const id = scenarioId.value;
  if (!id) {
    // If there's no valid ID (e.g., during navigation away), don't attempt to fetch
    return null;
  }
  return `/api/scenarios/${id}`;
}, {
  key: `scenario-${scenarioId.value}`, // Important for dynamic routes
  // lazy: false (default)
});

// Watch for authentication changes to refresh data if needed
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth && error.value && error.value.statusCode === 401) {
    console.log('Auth status changed to authenticated, refreshing scenario...');
    refresh();
  }
});

const requiresLogin = computed(() => !authStore.isAuthenticated && !pending.value && error.value?.statusCode === 401);
const isNotFound = computed(() => error.value?.statusCode === 404);
const fetchError = computed(() => error.value && ![401, 404].includes(error.value.statusCode));

</script>

<style scoped>
/* Add page-specific styles if needed */
</style> 