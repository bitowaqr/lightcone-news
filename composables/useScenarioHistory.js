import { ref, watch, computed } from 'vue';

/**
 * Fetches and manages scenario price history data.
 * @param {Ref<Object>} scenarioRef - A Vue ref containing the scenario object.
 *                                    Must include at least `platform` and `platformScenarioId`.
 * @returns {Object} - { rawHistoryData, chartHistoryData, detailsHistoryData, loading, error }
 */
export function useScenarioHistory(scenarioRef) {
  const rawHistoryData = ref(null); // Stores the direct API response ({chartData, detailsData} for Lightcone, {Yes:[]} for others)
  const loading = ref(false);
  const error = ref(null);

  // Computed properties for required IDs, ensures reactivity
  const platform = computed(() => scenarioRef.value?.platform);
  const platformScenarioId = computed(() => scenarioRef.value?.platformScenarioId);

  const fetchHistory = async () => {
    // Reset state
    rawHistoryData.value = null;
    loading.value = true;
    error.value = null;

    // Only fetch if we have the necessary identifiers
    if (!platform.value || !platformScenarioId.value) {
      loading.value = false;
      return;
    }

    try {
      const data = await $fetch('/api/scenarios/history', {
        query: {
          platform: platform.value,
          id: platformScenarioId.value,
        },
      });

      // Store the raw data
      rawHistoryData.value = data;

    } catch (err) {
      console.error(`[useScenarioHistory] Error fetching scenario history for ${platform.value}:${platformScenarioId.value}:`, err);
      error.value = err.data?.message || err.message || 'Failed to fetch history data';
      rawHistoryData.value = null; // Set raw data to null on error
    } finally {
      loading.value = false;
    }
  };

  // Computed property to derive chart-compatible data
  const chartHistoryData = computed(() => {
    if (!rawHistoryData.value) {
      return null; // No raw data yet
    }

    // Check if it's the combined Lightcone object
    if (platform.value === 'Lightcone' && rawHistoryData.value && typeof rawHistoryData.value === 'object' && rawHistoryData.value.chartData) {
      return rawHistoryData.value.chartData; // Return the chart data part
    }

    // If it's already in the chart object format (e.g., { Yes: [...] } from Metaculus/Polymarket/Manifold)
    // Ensure it's not the combined object by checking for !chartData
    if (typeof rawHistoryData.value === 'object' && !Array.isArray(rawHistoryData.value) && !rawHistoryData.value.chartData) {
        // Basic validation can remain or be adjusted
        let isValid = true;
        for (const key in rawHistoryData.value) {
            if (!Array.isArray(rawHistoryData.value[key]) || 
                !rawHistoryData.value[key].every(p => typeof p === 'object' && p !== null && p.t !== undefined && p.y !== undefined)) {
                isValid = false;
                break;
            }
        }
        if (isValid) {
            return rawHistoryData.value; 
        } else {
             console.warn('[useScenarioHistory] Received non-Lightcone object history data in unexpected format:', rawHistoryData.value);
             return null;
        }
    }
    
    // Log if format is unexpected
    console.warn('[useScenarioHistory] Unknown/invalid format for chartHistoryData:', rawHistoryData.value);
    return null;
  });

  // --- ADDED: Computed property specifically for details data ---
  const detailsHistoryData = computed(() => {
      if (!rawHistoryData.value) {
          return null; // No raw data yet
      }
      // Check if it's the combined Lightcone object and return the details part
      if (platform.value === 'Lightcone' && rawHistoryData.value && typeof rawHistoryData.value === 'object' && Array.isArray(rawHistoryData.value.detailsData)) {
          return rawHistoryData.value.detailsData;
      }
      // For other platforms, we don't have separate details data in this structure
      return null;
  });
  // --- END ADDED ---

  // Watch for changes and refetch
  watch([platform, platformScenarioId], ([newPlatform, newId]) => {
    if (newPlatform && newId) {
      fetchHistory();
    }
  }, { immediate: true });

  return {
    rawHistoryData, // Expose the raw data (can be inspected if needed)
    chartHistoryData, // Expose the computed data for the chart
    detailsHistoryData, // <-- Expose the computed data for the details section
    loading,
    error,
    fetchHistory,
  };
} 