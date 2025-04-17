<template>
  <div class="p-4 sm:p-6">
    <div v-if="scenario">
      <!-- Header -->
      <div class="mb-4 pb-4">
        <h1 class="text-2xl md:text-3xl font-bold text-fg mb-2 leading-tight">{{ scenario.name }}</h1>
        <div class="flex flex-wrap items-center text-sm text-fg-muted gap-x-4 gap-y-1 justify-start">
          <!-- Status Badge -->
          <span 
            v-if="scenario.status"
            :class="['px-1.5 py-0.5 rounded-full text-xs font-medium inline-block', statusClass]"
          >
            {{ scenario.status }}
          </span>
          <!-- Close Date -->
          <span v-if="scenario.closeDate" class="inline-flex items-center">
             <Icon name="mdi:calendar-clock" class="w-3.5 h-3.5 mr-1 inline-block align-text-bottom" />
            Closes: <span class="ps-0.5 font-medium text-fg">{{ scenario.closeDate }}</span>
          </span>
          <span v-if="scenario.liquidity" class="inline-flex items-center">
            <Icon name="mdi:waves" class="w-4 h-4 mr-1 inline-block align-text-bottom" />
            Liquidity: <span class="ps-0.5 font-medium text-fg">{{ Math.round(scenario.liquidity).toLocaleString() }}</span>
          </span>
          <span v-if="volume || scenario.volume" class="inline-flex items-center">
            <Icon name="mdi:swap-horizontal" class="w-4 h-4 mr-1 inline-block align-text-bottom" />
            Volume: <span class="ps-0.5 font-medium text-fg">{{ Math.round(volume || scenario.volume).toLocaleString() }}</span>
          </span>
           <!-- Platform Link -->
           <a :href="scenario.url" target="_blank" class="text-fg-muted hover:text-primary transition-colors items-center inline-flex group" v-if="scenario.url">
            <Icon name="mdi:web" class="w-4 h-4 mr-1 inline-block align-text-bottom" />
            <span class="group-hover:underline">{{ scenario.platform }}</span>
            <Icon name="mdi:open-in-new" class="w-3.5 h-3.5 ml-0.5 opacity-70 group-hover:opacity-100" />
          </a>
        </div>
      </div>

      <!-- Current Chance (Smaller, above chart) -->
      <div class="ms-4" v-if="!loadingChance && !errorChance && chance !== null && chance !== undefined">
        <span class="font-semibold text-2xl text-primary mr-1">{{ formatProbability(chance) }}</span> 
        <span class="ps-0.5 text-fg-muted">Chance</span>
      </div>
      <div class="mb-1" v-else-if="loadingChance">
         <!-- Placeholder for loading height consistency -->
         <Icon name="line-md:loading-twotone-loop" class="w-5 h-5 text-fg-muted animate-spin inline-block" />
      </div>
       <div class="mb-2 text-sm text-red-500/80 h-6" v-else-if="errorChance">
         <Icon name="heroicons:exclamation-circle" class="w-5 h-5 inline-block mr-1" /> Error
      </div>
      <div class="mb-2 text-sm text-fg-muted h-6" v-else>
         <!-- Placeholder for height consistency when no data -->
          Chance N/A
      </div>

      <!-- History Chart Section -->
      <div class="mb-6">
         <!-- <h2 class="text-lg font-semibold text-fg mb-3">Prediction History</h2> --> <!-- Heading Removed -->
         
         <!-- Loading State -->
          <div v-if="loadingHistory" class="h-64 md:h-80 flex items-center justify-center bg-bg-muted/50 rounded-lg border border-bg-muted">
              <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-fg-muted animate-spin" />
          </div>

          <!-- Error State -->
          <div v-else-if="errorHistory" class="h-64 md:h-80 flex flex-col items-center justify-center text-red-500/80 bg-red-500/5 rounded-lg border border-red-500/20 p-4">
               <Icon name="heroicons:exclamation-triangle" class="w-7 h-7 mb-2" />
               <span class="text-sm font-medium mb-1">Error loading history</span>
               <span class="text-xs text-center text-red-500/70">{{ errorHistory }}</span>
          </div>

          <!-- Chart Component -->
          <HistoryChart v-else-if="historyData" :history-data="historyData" />

          <!-- Fallback if no data and no error (should be handled by HistoryChart internal state, but as safety) -->
           <div v-else class="h-64 md:h-80 flex items-center justify-center bg-bg-muted/50 rounded-lg border border-bg-muted">
                <p class="text-sm text-fg-muted">Prediction history is unavailable.</p>
            </div>
      </div>
      <!-- *************************** -->

      <div v-if="scenario.description" class="mb-6">
        <h2 class="text-lg font-semibold text-fg mb-2">Description</h2>
        <p class="text-fg-muted leading-relaxed whitespace-pre-wrap">{{ scenario.description }}</p>
      </div>

      <!-- Resolution Criteria (Collapsible) -->
      <div v-if="scenario.resolutionCriteria" class="mb-6">
        <button 
          @click="isCriteriaVisible = !isCriteriaVisible"
          class="flex items-center text-sm text-fg-muted hover:text-fg transition-colors focus:outline-none w-full justify-between border-t border-bg-muted pt-3 mt-3"
        >
          <span>Resolution Criteria</span>
          <Icon :name="isCriteriaVisible ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 ml-1" />
        </button>
        <div v-if="isCriteriaVisible" class="mt-2 text-sm text-fg-muted bg-bg-muted p-3 rounded border border-accent-bg">
          <p class="whitespace-pre-wrap">{{ scenario.resolutionCriteria }}</p>
        </div>
      </div>
      
      

      <!-- Related Scenarios Section -->
      <div class="mt-6 pt-6 border-t border-bg-muted" v-if="scenario.scenarios && scenario.scenarios.length > 0">
         <h2 class="text-lg font-semibold text-fg mb-4">Related Scenarios</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <!-- Loop through related scenarios and use Teaser -->
             <ScenarioTeaser 
               v-for="relatedScenario in scenario.scenarios" 
               :key="relatedScenario.scenarioId" 
               :scenario="relatedScenario"
             />
          </div>
      </div>
      
    </div>
    <div v-else class="text-center text-fg-muted py-12">
      <p>Scenario data is not available.</p>
       <!-- Optional: Add a loading indicator here too if scenario itself might be loading -->
    </div>

  </div>
</template>

<script setup>
import { computed, ref, toRefs } from 'vue';
import { useScenarioChance } from '~/composables/useScenarioChance';
import { useScenarioHistory } from '~/composables/useScenarioHistory'; // Import history composable
import ScenarioTeaser from '~/components/scenario/Teaser.vue';
import HistoryChart from '~/components/scenario/HistoryChart.vue'; // Import history chart component

const props = defineProps({
  scenario: {
    type: Object,
    required: true,
    // Ensure default has necessary keys for composable and initial render
    default: () => ({ 
      name: 'Loading...', 
      closeDate: null, 
      platform: null, 
      url: null, 
      status: null, 
      platform: null, // Needed by composable
      platformScenarioId: null, // Needed by composable
      description: null,
      resolutionCriteria: null,
      scenarioType: null,
      resolutionDate: null,
      detailedData: null,
      openDate: null,
      scenarios: []
    })
  }
});

// Fetch dynamic chance
const { scenario: scenarioRef } = toRefs(props); // Use toRefs for reactivity
const { chance, loading: loadingChance, error: errorChance, volume, status, liquidity } = useScenarioChance(scenarioRef);

// Fetch history data
const { historyData, loading: loadingHistory, error: errorHistory } = useScenarioHistory(scenarioRef);

// State for collapsible criteria
const isCriteriaVisible = ref(false);

// Formatting Functions
const formatProbability = (prob) => {
  if (typeof prob !== 'number' || isNaN(prob)) return 'N/A'; // Handle NaN explicitly
  return `${(prob * 100).toFixed(0)}%`; // Use toFixed(0) for whole numbers
};

const formatVolume = (volume) => {
  if (typeof volume !== 'number') return 'N/A';
  // Simple formatting, consider libraries like numbro for complex cases
  return `$${volume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; // No cents for volume
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateString;
  }
};

// Status Styling
const statusClass = computed(() => {
  const status = props.scenario?.status?.toUpperCase();
  switch (status) {
    case 'RESOLVED':
      return 'border border-green-800 text-green-800 dark:border-green-500 dark:text-green-500';
    case 'CLOSED':
      return 'border border-red-600 text-red-600 dark:border-red-500 dark:text-red-500';
    case 'CANCELED':
      return 'border border-gray-600 text-gray-600 dark:border-gray-500 dark:text-gray-500';
    case 'OPEN':
       return 'border border-primary text-primary dark:border-yellow-500 dark:text-yellow-500';
    default:
      return 'border border-gray-600 text-gray-600 dark:border-gray-500 dark:text-gray-500';
  }
});

</script>

<style scoped>
/* Add any component-specific styles if needed */
</style>

