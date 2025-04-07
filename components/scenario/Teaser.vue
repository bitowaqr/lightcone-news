<template>
  <NuxtLink :to="`/scenarios/${scenario.scenarioId}`"
    v-if="scenario"
    class="px-4 py-2 bg-accent-bg relative overflow-hidden flex justify-between items-center space-x-4 leading-tight hover:opacity-80 transition-opacity duration-100"
  >
    <div class="block mb-2">
      <p class="text-md font-medium text-fg">{{ scenario.name }}</p>
    </div>
    <div class="flex justify-between items-center">
      <div v-if="scenario.chance !== undefined" class="flex items-center">
        <!-- Circular progress indicator -->
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
            v-if="scenario.chance > 0"
          ></path>
          </svg>
          <div
            class="absolute inset-0 flex flex-col items-center justify-center"
          >
            <span class="text-sm font-bold text-fg">{{ scenario.chance !== undefined ? (scenario.chance * 100).toFixed(0) : 'N/A' }}%</span>
            <span class="text-xs text-fg-muted block"> Chance </span>
          </div>
        </div>
      </div>
      <div v-else class="text-sm text-fg-muted">No prediction data.</div>
    </div>
  </NuxtLink>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  scenario: {
    type: Object,
    required: true,
    default: () => ({ scenarioId: '', name: 'Loading...', chance: undefined }),
  },
});

const chance = computed(() => props.scenario.chance);
// Computed property to generate the SVG path 'd' attribute
const progressPathD = computed(() => {
  const chance = props.scenario.chance;

  // Validate and clamp chance between 0 and 100
  if (typeof chance !== 'number' || isNaN(chance) || chance <= 0) {
    return 'M -29.001 0';
  }
  const percentage = Math.min(chance, 99.999);
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
/* Component-specific styles */
</style>
