<template>
  <div class="p-6">
    <div v-if="scenario">
      <!-- Header -->
      <div class="mb-6 border-b border-bg-muted pb-4">
        <h1 class="text-2xl font-bold text-fg mb-2">{{ scenario.header?.name }}</h1>
        <div class="flex items-center text-sm text-fg-muted space-x-4">
          <span>Platform: <span class="font-medium text-fg">{{ scenario.header?.platform }}</span></span>
          <span v-if="scenario.header?.closeDate">Closes: <span class="font-medium text-fg">{{ scenario.header?.closeDate }}</span></span>
           <span 
            :class="['px-2 py-0.5 rounded-full text-xs font-medium', statusClass]"
          >
            {{ scenario.status }}
          </span>
        </div>
      </div>

      <!-- Description -->
      <div class="mb-6">
        <h2 class="text-lg font-semibold text-fg mb-2">Description</h2>
        <p class="text-fg-muted leading-relaxed">{{ scenario.description }}</p>
      </div>

      <!-- Resolution Criteria (Collapsible) -->
      <div v-if="scenario.resolutionCriteria" class="mb-6">
        <button 
          @click="isCriteriaVisible = !isCriteriaVisible"
          class="flex items-center text-sm text-fg-muted hover:text-fg transition-colors focus:outline-none"
        >
          <Icon :name="isCriteriaVisible ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-4 h-4 mr-1" />
          <span>Resolution Criteria</span>
        </button>
        <div v-if="isCriteriaVisible" class="mt-2 pl-5 text-sm text-fg-muted bg-bg-muted p-3 rounded border border-accent-bg">
          <p class="whitespace-pre-wrap">{{ scenario.resolutionCriteria }}</p>
        </div>
      </div>
      
      <!-- Details Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6 text-sm border-b border-bg-muted pb-6">
        <div>
          <span class="text-fg-muted block">Type:</span>
          <span class="text-fg font-medium">{{ scenario.scenarioType }}</span>
        </div>
        <div v-if="scenario.currentProbability !== undefined">
           <span class="text-fg-muted block">Current Probability:</span>
           <span class="text-fg font-medium">{{ formatProbability(scenario.currentProbability) }}</span>
        </div>
         <div v-if="scenario.resolutionDate">
           <span class="text-fg-muted block">Resolution Date:</span>
           <span class="text-fg font-medium">{{ formatDate(scenario.resolutionDate) }}</span>
        </div>
         <div v-if="scenario.detailedData?.volume">
           <span class="text-fg-muted block">Volume:</span>
           <span class="text-fg font-medium">{{ formatVolume(scenario.detailedData.volume) }}</span>
        </div>
      </div>

      <!-- Related Articles/Scenarios Section -->
      <div class="mt-6" v-if="scenario.scenarios && scenario.scenarios.length > 0">
         <h2 class="text-lg font-semibold text-fg mb-2">Related Scenarios</h2>
         <!-- TODO: Implement display for related scenarios, potentially reusing Teaser component -->
         <pre class="text-xs bg-bg-muted p-2 rounded">{{ scenario.scenarios }}</pre>
      </div>
      
    </div>
    <div v-else class="text-center text-fg-muted py-8">
      <p>Scenario data is not available or loading.</p>
    </div>


<!-- structure so I can review json raw, but with line breaks: -->
<!-- <pre class="text-xs bg-bg-muted p-2 rounded">{{ scenario }}</pre> -->

  </div>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  scenario: {
    type: Object,
    required: true,
    default: () => ({}) // Provide a default empty object
  }
});

// State for collapsible criteria
const isCriteriaVisible = ref(false);

// Formatting Functions (could be moved to utils)
const formatProbability = (prob) => {
  if (typeof prob !== 'number') return 'N/A';
  return `${(prob * 100).toFixed(2)}%`;
};

const formatVolume = (volume) => {
  if (typeof volume !== 'number') return 'N/A';
  return `$${volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateString; // Return original string if parsing fails
  }
};

// Status Styling
const statusClass = computed(() => {
  switch (props.scenario?.status?.toUpperCase()) {
    case 'CLOSED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    case 'OPEN': // Assuming 'OPEN' or similar statuses exist
      return 'bg-green-100 text-green-800 dark:bg-green-700 dark:text-green-300';
    default:
      return 'bg-bg-muted text-fg-muted';
  }
});

</script>

<style scoped>
/* Add any component-specific styles if needed */
</style>

