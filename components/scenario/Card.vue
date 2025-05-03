<template>
  <div 
    v-if="scenario"
    @click="selectScenario"
    class="cursor-pointer bg-accent-bg px-2 md:px-4 pt-3 pb-2.5 sm:pt-5 sm:pb-3.5 hover:bg-accent-bgHover transition-colors duration-100 group h-full flex items-center"
  >
    <div class="flex justify-between items-center space-x-2 leading-tight grow">
      <!-- Left section: Title, Platform -->
      <div class="flex flex-col flex-1 min-w-0">
        <!-- Title (Matched to Teaser) -->
        <div class="font-semibold text-fg w-full text-sm sm:text-base leading-tight sm:leading-tight line-clamp-3 group-hover:text-primary transition-colors">
          {{ scenario.name }}
        </div>
        <!-- Platform (Matched to Teaser) -->
        <div v-if="scenario.platform" class="text-[11px] text-primary-600 opacity-75 mt-0.5 truncate font-medium">
          <span class="opacity-50">by</span>
          {{ scenario.platform }}
        </div>
      </div>

      <!-- Right section: Chance, Chevron (Matched to Teaser) -->
      <div class="flex justify-end items-center shrink-0 min-w-12 space-x-1 text-right">
        <!-- Chance Display (Matched to Teaser) -->
        <div class="flex flex-col items-center justify-center h-full">
          <div v-if="loading" class="flex flex-col items-end justify-center h-full opacity-50">
            <Icon name="line-md:loading-twotone-loop" class="w-4 h-4 text-fg-muted animate-spin mb-0.5" />
            <span class="text-[10px] text-fg-muted block opacity-75 leading-tight"> Chance </span>
          </div>
          <div v-else-if="error" class="flex flex-col items-end justify-center h-full opacity-60">
            <Icon name="heroicons:exclamation-circle" class="w-4 h-4 text-red-500/70 mb-0.5" />
            <span class="text-[10px] leading-tight text-fg-muted">Error</span>
          </div>
          <div v-else-if="chance !== undefined && chance !== null" class="flex flex-col items-center justify-center h-full w-full ">
            <span class="text-base md:text-lg font-bold text-fg leading-none">{{ typeof chance === 'number' ? (chance * 100).toFixed(0) : 'N/A' }}%</span>
            <span class="text-[10px] text-fg-muted block leading-none"> Chance </span>
          </div>
          <div v-else class="flex flex-col items-end justify-center h-full opacity-60">
            <Icon name="heroicons:question-mark-circle" class="w-4 h-4 text-fg-muted mb-0.5" />
            <span class="text-[10px] leading-tight text-fg-muted">No Data</span>
          </div>
        </div>
        
        <!-- Chevron Icon (Matched to Teaser) -->
        <div class="flex items-center h-full">
          <Icon name="heroicons:chevron-right-20-solid" class="w-6 h-6 text-fg-muted opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all duration-100" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, toRefs, ref, defineEmits } from 'vue';
import { useScenarioChance } from '~/composables/useScenarioChance';

// Define the emits
const emit = defineEmits(['scenario-selected']);

const props = defineProps({
  scenario: {
    type: Object,
    required: true,
    default: () => ({
       scenarioId: '', // Expect scenarioId from parent list
       _id: '', // Expect _id if coming from bookmarks
       name: 'Loading...', 
       platform: null, 
       platformScenarioId: null, 
       description: null // Kept in props definition for now, but not used in template
    }),
  },
});

const { scenario } = toRefs(props);
// Fetch dynamic chance - the composable uses platform and platformScenarioId from the scenario prop
const { chance, loading, error } = useScenarioChance(scenario);

// Function to emit the selected event
const selectScenario = () => {
    // Use scenarioId if available (consistent with list API), fallback to _id if needed
    const idToEmit = props.scenario?.scenarioId || props.scenario?._id;
    if (idToEmit) {
        emit('scenario-selected', idToEmit);
    } else {
        console.warn('[ScenarioCard] Cannot emit selection: Scenario ID missing.');
    }
};
</script>

<style scoped>
/* Styles minimal, like Teaser */
</style> 