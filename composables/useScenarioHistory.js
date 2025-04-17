import { ref, watch, computed } from 'vue';

/**
 * Fetches and manages scenario price history data.
 * @param {Ref<Object>} scenarioRef - A Vue ref containing the scenario object.
 *                                    Must include at least `platform` and `platformScenarioId`.
 * @returns {Object} - { historyData, loading, error }
 */
export function useScenarioHistory(scenarioRef) {
  const historyData = ref(null); // Will store the history object { Outcome: [...] }
  const loading = ref(false);
  const error = ref(null);

  // Computed properties for required IDs, ensures reactivity
  const platform = computed(() => scenarioRef.value?.platform);
  const platformScenarioId = computed(() => scenarioRef.value?.platformScenarioId);

  const fetchHistory = async () => {
    // Reset state
    historyData.value = null;
    loading.value = true;
    error.value = null;

    // Only fetch if we have the necessary identifiers
    if (!platform.value || !platformScenarioId.value) {
      loading.value = false;
      // Don't set an error, just means we can't fetch yet
      // error.value = new Error('Missing platform or platformScenarioId');
      return;
    }

    try {
        // Use $fetch available in Nuxt 3
        const data = await $fetch('/api/scenarios/history', {
          query: {
            platform: platform.value,
            id: platformScenarioId.value,
          },
          // Optional: Add timeout and retry logic if needed
          // timeout: 15000,
        });

      // Basic validation of the returned structure
      if (typeof data === 'object' && data !== null) {
           historyData.value = data;
      } else {
            console.warn(`[useScenarioHistory] Unexpected data format received:`, data);
            historyData.value = {}; // Set to empty object if format is weird
            // Optionally set an error
            // error.value = new Error('Invalid data format received from history API');
      }

    } catch (err) {
      console.error(`[useScenarioHistory] Error fetching scenario history for ${platform.value}:${platformScenarioId.value}:`, err);
      error.value = err.data?.message || err.message || 'Failed to fetch history data';
      historyData.value = {}; // Set to empty on error
    } finally {
      loading.value = false;
    }
  };

  // Watch the scenarioRef for changes (e.g., when navigating between scenario pages)
  // Use deep watch if nested properties might change, but platform/id should be top-level
  // Or watch the computed properties directly
  watch([platform, platformScenarioId], ([newPlatform, newId], [oldPlatform, oldId]) => {
      // Fetch only if the platform or id actually changes and are valid
      if (newPlatform && newId) {
          fetchHistory();
      }
  }, { immediate: true }); // Fetch immediately when the composable is used

  return {
    historyData,
    loading,
    error,
    fetchHistory, // Expose refetch function if needed
  };
} 