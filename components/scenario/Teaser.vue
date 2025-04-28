<template>
  <NuxtLink :to="`/scenarios/${scenario.scenarioId}`"
    v-if="scenario"
    class="px-2 md:px-4 py-1 relative overflow-hidden flex justify-between items-center space-x-2 leading-tight hover:opacity-80 transition-opacity duration-100"
  >
    <div class="flex items-center mb-1 flex-1 min-w-0">
      <div class="text-sm sm:text-base font-semibold text-fg w-full leading-tight sm:leading-tight line-clamp-3">{{ scenario.name }}</div>
    </div>
    <div class="flex justify-center items-center shrink-0 min-w-12 text-right">
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
        <span class="text-[10px] text-fg-muted block leading-none "> Chance </span>
      </div>
      <div v-else class="flex flex-col items-end justify-center h-full opacity-60">
        <Icon name="heroicons:question-mark-circle" class="w-4 h-4 text-fg-muted mb-0.5" />
        <span class="text-[10px] leading-tight text-fg-muted">No Data</span>
      </div>
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
    default: () => ({ scenarioId: '', name: 'Loading...', platform: null, platformScenarioId: null }),
  },
});

const { scenario } = toRefs(props);
const { chance, loading, error } = useScenarioChance(scenario);
</script>

<style scoped>
/* Styles are minimal, no changes needed */
</style>
