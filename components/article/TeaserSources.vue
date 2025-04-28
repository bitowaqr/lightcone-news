<template>
  <div 
    v-if="sourcesCount > 0" 
    class="flex items-center space-x-1.5"
    :title="sourcesTeaserString"
  >
    <div class="flex items-center">
      <div 
        v-for="(source, idx) in displayedSources" 
        :key="source.id || idx"  
        class="w-5 h-5 overflow-hidden border border-gray-100 flex items-center justify-center bg-white rounded-full"
        :style="{ 
          marginLeft: idx === 1 ? '-8px' : idx > 1 ? '-10px' : '0', 
          zIndex: 10 - idx 
        }"
      >
        <!-- Favicon Image Wrapper -->
        <div class="w-full h-full flex items-center justify-center rounded-full overflow-hidden">
           <img
              :src="getSourceFavicon(source.url)"
              :alt="getSourceDomain(source.url)"
              class="w-full h-full object-contain filter" 
              @error="onFaviconError($event, source.id || idx)"
              v-if="!faviconErrors[source.id || idx]"
            />
        </div>
        <!-- Fallback Initial -->
        <div
          v-if="faviconErrors[source.id || idx]"
          class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-full"
        >
          <span class="text-[10px] font-medium text-gray-600">
            {{ getSourceInitial(source.url) }}
          </span>
        </div>
      </div>
      <!-- More indicator (replaces 4th icon if sources > 4) -->
       <div 
          v-if="sourcesCount > maxDisplayedSources" 
          class="w-5 h-5 overflow-hidden border border-gray-100 flex items-center justify-center bg-gray-200 rounded-full text-gray-600"
           :style="{ marginLeft: '-10px', zIndex: 0 }"
        >
         <span class="text-[10px] font-medium">+{{ sourcesCount - maxDisplayedSources }}</span>
       </div>
    </div>
    <!-- Source Count Label -->
    <span class="text-xs text-fg-muted leading-none">{{ sourcesCount }} {{ sourcesCount === 1 ? 'source' : 'sources' }}</span>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { getSourceFavicon, getSourceDomain, getSourceInitial } from '~/utils/sourceUtils';

const props = defineProps({
  sources: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const maxDisplayedSources = 4; // Show first 4 icons. If count > 4, replace 4th with "+N". Max 4 elements shown.
const faviconErrors = ref({});

const sourcesCount = computed(() => props.sources?.length || 0);

// Show max 4 icons unless count > 4, then show 3 icons + indicator placeholder
const displayedSources = computed(() => {
  const limit = sourcesCount.value > maxDisplayedSources ? maxDisplayedSources -1 : maxDisplayedSources;
  return props.sources?.slice(0, limit) || [];
}); 

// Tooltip text
const sourcesTeaserString = computed(() => {
  if (sourcesCount.value === 0) return '0 sources';
  const names = props.sources.map(s => s.publisher || getSourceDomain(s.url)).filter(Boolean);
  const shownNames = names.slice(0, displayedSources.value.length);
  const remainingCount = sourcesCount.value - displayedSources.value.length;

  if (remainingCount > 0) {
      return shownNames.join(', ') + ` and ${remainingCount} more`;
  } else {
      return names.join(', ');
  }
});


const onFaviconError = (event, index) => {
  // Hide the failed image immediately (optional, could show fallback instead)
  // event.target.style.display = 'none'; 
  // Mark this favicon as errored
  faviconErrors.value[index] = true;
};
</script>

<style scoped>
.filter {
  filter: grayscale(100%) brightness(105%);
}
</style> 