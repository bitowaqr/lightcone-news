<template>
  <NuxtLink 
    :to="`/scenarios/${scenario.scenarioId}`"
    v-if="scenario"
    class="block p-4 border border-dotted border-bg-muted bg-bg-muted/20 hover:bg-bg-muted/50 transition-colors duration-150 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
  >
    <div class="flex flex-col h-full">
      <!-- Top section: Title and Chance -->
      <div class="flex justify-between items-start mb-2">
        <!-- Title -->
        <h3 class="text-base sm:text-lg font-semibold text-fg leading-tight line-clamp-3 mr-4 flex-1">{{ scenario.name }}</h3>
        
        <!-- Chance Display (Top Right) -->
        <div class="flex-shrink-0 text-right">
          <div v-if="loading" class="opacity-50">
            <Icon name="line-md:loading-twotone-loop" class="w-4 h-4 text-fg-muted animate-spin" />
          </div>
          <div v-else-if="error" class="opacity-60">
            <Icon name="heroicons:exclamation-circle" class="w-4 h-4 text-red-500/70" title="Error loading chance"/>
          </div>
          <div v-else-if="chance !== undefined && chance !== null" class="flex flex-col items-end">
            <span class="text-xl font-bold text-fg leading-none">{{ typeof chance === 'number' ? (chance * 100).toFixed(0) : 'N/A' }}%</span>
            <!-- Removed the small "Chance" label -->
          </div>
          <div v-else class="opacity-60">
            <Icon name="heroicons:question-mark-circle" class="w-4 h-4 text-fg-muted" title="Chance not available"/>
          </div>
        </div>
      </div>

       <!-- Platform Badge -->
       <div v-if="scenario.platform" class="mb-3">
          <span class="inline-block bg-accent-bg text-accent-text text-xs font-medium px-2 py-0.5 rounded-full">{{ scenario.platform }}</span>
        </div>
        <div v-else class="mb-3 h-[22px]"></div> <!-- Placeholder for consistent height -->

      <!-- Description Snippet -->
      <div class="text-xs sm:text-sm text-fg-muted grow">
        <p v-if="scenario.description" class="line-clamp-3 leading-snug">
          {{ scenario.description }}
        </p>
        <p v-else class="italic">No description available.</p>
      </div>
      
      <!-- Removed bottom chance display section -->

    </div>
  </NuxtLink>
</template>

<script setup>
import { computed, toRefs } from 'vue';
import { useScenarioChance } from '~/composables/useScenarioChance';

const props = defineProps({
  scenario: {
    type: Object,
    required: true,
    // Default provides structure expected by template & composable
    default: () => ({
       scenarioId: '', 
       name: 'Loading...', 
       platform: null, 
       platformScenarioId: null, 
       description: null 
    }),
  },
});

const { scenario } = toRefs(props);
// Fetch dynamic chance - the composable uses platform and platformScenarioId from the scenario prop
const { chance, loading, error } = useScenarioChance(scenario);

</script>

<style scoped>
/* Scoped styles for the card if needed */
</style> 