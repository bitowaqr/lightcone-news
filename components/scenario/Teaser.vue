<template>
  <NuxtLink :to="`/scenarios/${scenario.scenarioId}`"
    v-if="scenario"
    class="px-4 py-2 bg-accent-bg relative overflow-hidden flex justify-between items-center space-x-4 leading-tight hover:opacity-80 transition-opacity duration-100"
  >
    <div class="block mb-2 flex-1 min-w-0">
      <p class="text-md font-medium text-fg truncate">{{ scenario.name }}</p>
    </div>
    <div class="flex justify-end items-center shrink-0">
      <div v-if="loading" class="flex items-center">
        <div class="relative h-14 w-14 mr-2 mt-2 -mb-1 opacity-50">
          <svg
            width="58"
            height="29"
            viewBox="-29 -29 58 29"
            style="width: 58px; max-width: 58px; overflow: visible"
          >
            <path
              d="M -29 0 A 29 29 0 0 1 29.000 0"
              fill="none"
              stroke="var(--background)"
              stroke-width="4"
              stroke-linecap="butt"
            ></path>
          </svg>
          <div
            class="absolute inset-0 flex flex-col items-center justify-center"
          >
            <Icon name="line-md:loading-twotone-loop" class="w-5 h-5 text-fg-muted animate-spin mb-0.5" />
            <span class="text-xs text-fg-muted block opacity-75"> Chance </span>
          </div>
        </div>
      </div>
      <div v-else-if="error" class="flex items-center">
        <div class="relative h-14 w-14 mr-2 mt-2 -mb-1 opacity-60">
          <svg
            width="58"
            height="29"
            viewBox="-29 -29 58 29"
            style="width: 58px; max-width: 58px; overflow: visible"
          >
            <path
              d="M -29 0 A 29 29 0 0 1 29.000 0"
              fill="none"
              stroke="var(--background)"
              stroke-width="4"
              stroke-linecap="butt"
            ></path>
          </svg>
          <div
            class="absolute inset-0 flex flex-col items-center justify-center"
          >
            <Icon name="heroicons:exclamation-circle" class="w-4 h-4 text-red-500/70 mb-0.5" />
            <span class="text-[10px] leading-tight text-fg-muted">Error</span>
          </div>
        </div>
      </div>
      <div v-else-if="chance !== undefined && chance !== null" class="flex items-center">
        <div class="relative h-14 w-14 mr-2 mt-2 -mb-1">
          <svg
            width="58"
            height="29"
            viewBox="-29 -29 58 29"
            style="width: 58px; max-width: 58px; overflow: visible"
          >
            <path
              d="M -29 0 A 29 29 0 0 1 29.000 0"
              fill="none"
              stroke="var(--background)"
              stroke-width="4"
              stroke-linecap="butt"
            ></path>
            <path
              :d="progressPathD" fill="none"
              stroke="var(--foreground)"
              stroke-opacity="0.8"
              stroke-width="4"
              stroke-linecap="butt"
              v-if="chance > 0"
            ></path>
          </svg>
          <div
            class="absolute inset-0 flex flex-col items-center justify-center"
          >
            <span class="text-sm font-bold text-fg">{{ typeof chance === 'number' ? (chance * 100).toFixed(0) : 'N/A' }}%</span>
            <span class="text-xs text-fg-muted block"> Chance </span>
          </div>
        </div>
      </div>
      <div v-else class="flex items-center">
        <div class="relative h-14 w-14 mr-2 mt-2 -mb-1 opacity-60">
          <svg
            width="58"
            height="29"
            viewBox="-29 -29 58 29"
            style="width: 58px; max-width: 58px; overflow: visible"
          >
            <path
              d="M -29 0 A 29 29 0 0 1 29.000 0"
              fill="none"
              stroke="var(--background)"
              stroke-width="4"
              stroke-linecap="butt"
            ></path>
          </svg>
          <div
            class="absolute inset-0 flex flex-col items-center justify-center"
          >
            <Icon name="heroicons:question-mark-circle" class="w-4 h-4 text-fg-muted mb-0.5" />
            <span class="text-[10px] leading-tight text-fg-muted">No Data</span>
          </div>
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
});

const { scenario } = toRefs(props);
const { chance, loading, error } = useScenarioChance(scenario);

const progressPathD = computed(() => {
  const currentChance = chance.value;

  if (typeof currentChance !== 'number' || isNaN(currentChance) || currentChance <= 0) {
    return 'M -29.001 0';
  }
  const percentage = Math.max(0.001, Math.min(currentChance, 0.999));
  const radius = 29;
  const endAngleRad = Math.PI * (1 - percentage);
  const endX = radius * Math.cos(endAngleRad);
  const endY = -radius * Math.sin(endAngleRad);
  const largeArcFlag = 0;
  const sweepFlag = 1;

  return `M -${radius} 0 A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${endX.toFixed(3)} ${endY.toFixed(3)}`;
});
</script>

<style scoped>
/* Pulse animation is no longer needed */
</style>
