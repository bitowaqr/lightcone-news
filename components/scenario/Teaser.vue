<template>
  <NuxtLink :to="`/scenarios/${scenario.scenarioId}`"
    v-if="scenario"
    class="bg-accent-bg px-2 md:px-4 pt-3 pb-2.5 relative overflow-hidden hover:bg-accent-bgHover transition-colors duration-100 group h-full flex items-center"
  >


  

    <div class="flex justify-between items-center space-x-2 leading-tight grow">
      <div class="flex flex-col flex-1 min-w-0">
         <div class="font-semibold text-fg w-full text-sm leading-tight sm:leading-tight line-clamp-3 group-hover:" 
              
         >{{ scenario.name }}</div>
         <div v-if="scenario.platform" class="text-[11px] text-primary-600 opacity-75 mt-0.5 truncate font-medium">
           <span class="opacity-50">by</span>
           {{ scenario.platform }}
         </div>
      </div>
      <div class="flex justify-end items-center shrink-0 min-w-12 space-x-1 text-right">
        <!-- Chance Display -->
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
            <span class="text-[10px] text-fg-muted block leading-none "> Chance </span>
          </div>
          <div v-else class="flex flex-col items-end justify-center h-full opacity-60">
            <Icon name="heroicons:question-mark-circle" class="w-4 h-4 text-fg-muted mb-0.5" />
            <span class="text-[10px] leading-tight text-fg-muted">No Data</span>
          </div>
        </div>
        <!-- Chevron Icon -->
        <div class="flex items-center h-full">
           <Icon name="heroicons:chevron-right-20-solid" class="w-6 h-6 text-fg-muted opacity-50 group-hover:opacity-100 group-hover:text-primary transition-all duration-100" />
        </div>
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
  forceSmallText: { type: Boolean, default: false }
});

const { scenario } = toRefs(props);
const { chance, loading, error } = useScenarioChance(scenario);
</script>

<style scoped>
/* Styles are minimal, no changes needed */
</style>
