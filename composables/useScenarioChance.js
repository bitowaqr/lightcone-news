import { ref, watchEffect } from 'vue';

/**
 * Fetches and provides the live chance for a scenario via the server proxy,
 * handling loading and error states.
 *
 * @param {Ref<Object> | Object} scenarioRef - A Vue ref or plain object containing scenario details,
 *                                             including `platform` and `platformScenarioId`.
 * @returns {Object} Reactive state containing `chance`, `loading`, and `error`.
 */
export function useScenarioChance(scenarioRef) {
  const chance = ref(undefined);
  const volume = ref(undefined);
  const status = ref(undefined);
  const liquidity = ref(undefined);
  const loading = ref(false);
  const error = ref(null);

  watchEffect(async (onCleanup) => {
    // Use .value if it's a ref, otherwise use the object directly
    const scenario = unref(scenarioRef);
    let isActive = true; // Flag to prevent state updates if the effect reruns before fetch completes

    onCleanup(() => {
      isActive = false;
    });

    // Reset state
    chance.value = undefined;
    volume.value = undefined;
    status.value = undefined;
    liquidity.value = undefined;
    loading.value = true;
    error.value = null;

    // Check if we have the necessary info to call the proxy
    if (!scenario || !scenario.platform || !scenario.platformScenarioId) {
      // console.warn('Scenario missing platform or platformScenarioId:', scenario);
      loading.value = false;
      // Set chance to null explicitly to indicate no data could be fetched
      chance.value = null;
      return;
    }

    // Construct query parameters for our server endpoint
    const queryParams = new URLSearchParams({
      platform: scenario.platform,
      id: scenario.platformScenarioId,
    });

    try {
      // Call our server proxy endpoint
      const data = await $fetch(`/api/scenarios/chance?${queryParams.toString()}`, {
        // Optional: Add headers if needed later, e.g., for auth
        // headers: { ... }
        // We expect the server to handle upstream errors, but add client-side catch too
      });

      if (!isActive) return; // Stop if the effect was cleaned up

      // The proxy returns { chance: value } or { chance: null }
      if (data && data.chance !== undefined) {
          // Update the chance ref. It could be a number or null.
        chance.value = data.chance;
        volume.value = data.volume;
        status.value = data.status;
        liquidity.value = data.liquidity;
      } else {
        // Should ideally not happen if proxy behaves, but handle defensively
          console.warn('Received unexpected data from /api/scenarios/chance:', data);
        chance.value = null; // Treat as no data
        volume.value = null;
        status.value = null;
        liquidity.value = null;
        error.value = 'Invalid response from server proxy';
      }

    } catch (err) {
       if (!isActive) return; // Stop if the effect was cleaned up

      // Handle errors from our *own* API call (e.g., network error, 5xx from proxy)
      console.error(`Error fetching scenario chance from /api/scenarios/chance for ${scenario.platform}:${scenario.platformScenarioId}:`, err);

      // Extract a meaningful error message if possible (Nuxt $fetch errors)
      const statusCode = err.response?.status;
      const statusMessage = err.data?.message || err.message || 'Failed to fetch data via proxy';
      error.value = `Error ${statusCode || 'fetching'}: ${statusMessage}`;
      chance.value = null; // Ensure chance is null on error

    } finally {
       if (!isActive) return; // Stop if the effect was cleaned up
      loading.value = false;
    }
  });

  return {
    chance, // This will be a number, null, or undefined initially
    volume,
    status,
    liquidity,
    loading,
    error, // String containing error message, or null
  };
}

// Helper to access .value if it's a ref, otherwise return the object
function unref(val) {
  return val && val.value !== undefined ? val.value : val;
}