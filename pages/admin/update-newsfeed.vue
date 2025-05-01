<template>
  <div class="p-4 md:p-6 max-w-2xl mx-auto dark:text-gray-200">
    <h1 class="text-3xl font-bold mb-6 border-b pb-2 dark:border-gray-700 flex justify-between items-center">
      <span>Update Newsfeed</span>
      <NuxtLink to="/admin" class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">&laquo; Back to Main Admin</NuxtLink>
    </h1>

    <!-- Last Update Time -->
    <section class="mb-6 p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <h2 class="text-lg font-semibold mb-2">Last Known Update</h2>
      <div v-if="pendingTime">Loading last update time...</div>
      <div v-else-if="fetchTimeError">
        <p class="text-red-600 dark:text-red-400">Error fetching last update time: {{ fetchTimeError }}</p>
      </div>
      <div v-else-if="lastUpdateTime">
        <p class="text-gray-700 dark:text-gray-300">The most recent article was published on:</p>
        <p class="text-xl font-mono font-medium">{{ formattedLastUpdateTime }}</p>
      </div>
      <div v-else>
        <p class="text-gray-500 dark:text-gray-400">No published articles found yet.</p>
      </div>
    </section>

    <!-- Trigger Update Button -->
    <section class="mb-6 p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <h2 class="text-lg font-semibold mb-3">Trigger Manual Update</h2>

      <!-- Update Parameters -->
      <div class="space-y-4 mb-4">
        <div class="flex items-center">
          <input
            id="updateScenarios"
            type="checkbox"
            v-model="updateOptions.updateScenarios"
            class="h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
          />
          <label for="updateScenarios" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
            Update Scenarios Data (takes longer)
          </label>
        </div>
        <div>
          <label for="maxNewStories" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Maximum New Stories to Create (0-20):
          </label>
          <input
            id="maxNewStories"
            type="number"
            v-model.number="updateOptions.maxNewStories"
            min="0"
            max="20"
            class="block w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
        Clicking this button will start the newsfeed update process in the background with the selected options.
        This can take up to 30 minutes. You don't need to stay on this page.
      </p>
      <button
        @click="triggerUpdate"
        :disabled="isTriggering"
        class="w-full inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isTriggering ? 'Starting Update Process...' : 'Update Newsfeed Now' }}
      </button>
       <p v-if="triggerError" class="mt-3 text-sm text-red-600 dark:text-red-400">
        Trigger Error: {{ triggerError }}
      </p>
       <p v-if="triggerSuccessMessage" class="mt-3 text-sm text-green-600 dark:text-green-400">
        {{ triggerSuccessMessage }}
      </p>
    </section>

  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';

// Apply Admin Middleware
definePageMeta({
  middleware: 'admin'
});

const lastUpdateTime = ref(null);
const isTriggering = ref(false);
const triggerError = ref(null);
const triggerSuccessMessage = ref(null);

// --- New Reactive State for Options ---
const updateOptions = reactive({
  updateScenarios: true,
  maxNewStories: 10
});

// Fetch the last update time initially
const { data: timeData, pending: pendingTime, error: fetchTimeError } = await useFetch('/api/admin/latest-article-time', {
  lazy: true, // Don't block page rendering
  server: false, // Fetch on client side after hydration
  transform: (data) => data?.latestPublishedDate // Extract the date directly
});

// Use watchEffect to update lastUpdateTime once data is fetched
watchEffect(() => {
  if (timeData.value) {
    lastUpdateTime.value = timeData.value;
  }
});

// Format the date/time
const formattedLastUpdateTime = computed(() => {
  if (!lastUpdateTime.value) return 'N/A';
  try {
    return new Date(lastUpdateTime.value).toLocaleString(); // Use locale-specific format
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Invalid Date';
  }
});

// Function to trigger the newsfeed update
const triggerUpdate = async () => {
  isTriggering.value = true;
  triggerError.value = null;
  triggerSuccessMessage.value = null;

  // Validate maxNewStories locally before sending
  if (updateOptions.maxNewStories < 0 || updateOptions.maxNewStories > 20) {
    triggerError.value = 'Maximum new stories must be between 0 and 20.';
    isTriggering.value = false;
    return;
  }

  try {
    const response = await $fetch('/api/admin/trigger-newsfeed-update', {
      method: 'POST',
      body: {
        updateScenarios: updateOptions.updateScenarios,
        maxNewStories: updateOptions.maxNewStories
      }
    });
    triggerSuccessMessage.value = response.message || 'Update process initiated successfully.';
    // Optionally, you could add a small delay and refresh the time, but it won't reflect the *new* time
    // setTimeout(refreshTime, 5000); // Example: Refresh time after 5s
  } catch (err) {
    console.error("Error triggering newsfeed update:", err);
    triggerError.value = err.data?.message || err.message || 'Failed to start update process.';
  } finally {
    isTriggering.value = false;
  }
};

// Optional: Function to manually refresh the last update time
// const { refresh: refreshTime } = await useFetch('/api/admin/latest-article-time', { immediate: false });

</script>

<style scoped>
/* Add specific styles if needed */
</style> 