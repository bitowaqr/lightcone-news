<template>
  <details v-if="sourcesCount > 0" class="group text-xs">
    <summary class="list-none cursor-pointer flex items-center space-x-1.5 py-1" :title="sourcesTeaserString">
      <div class="flex items-center flex-grow min-w-0"> <!-- Wrapper for icons and label -->
        <div class="flex items-center">
          <Icon name="heroicons:chevron-right-20-solid" class="w-4 h-4 text-fg-muted transition-transform duration-150 group-open:rotate-90 flex-shrink-0" />
        </div>
        <span class="text-fg-muted leading-none ml-1.5 font-medium">{{ sourcesCount }} {{ sourcesCount === 1 ? 'Source' : 'Sources' }}</span>
      </div>
      
    </summary>

    <div class="mt-1.5 pl-4 space-y-1.5"> <!-- Indented list of sources -->
      <a
        v-for="(source, index) in sources"
        :key="`expanded-${source.id || index}`"
        :href="sanitizeUrl(source.url)"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center space-x-1.5 text-fg-muted hover:text-primary group/link"
        :title="source.publisher || source.url"
      >
        <div class="flex-shrink-0 w-4 h-4 rounded-full overflow-hidden border border-bg-dark flex items-center justify-center bg-white">
          <img
            :src="getSourceFavicon(source.url)"
            :alt="getSourceDomain(source.url)"
            class="w-full h-full object-contain filter"
            @error="onFaviconError($event, `expanded-${source.id || index}`)"
            v-if="!faviconErrors[`expanded-${source.id || index}`]"
          />
          <div
            v-if="faviconErrors[`expanded-${source.id || index}`]"
            class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
          >
            <span class="text-[8px] font-medium text-gray-500">{{ getSourceInitial(source.url) }}</span>
          </div>
        </div>
        <span class="truncate group-hover/link:underline">{{ source.publisher || getSourceDomain(source.url) }}</span>
      </a>
    </div>
  </details>
  <div v-else class="text-xs text-fg-muted leading-none py-1">
    0 sources
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { getSourceFavicon, getSourceDomain, getSourceInitial, sanitizeUrl } from '~/utils/sourceUtils';

const props = defineProps({
  sources: {
    type: Array,
    required: true,
    default: () => [],
  },
});

const faviconErrors = ref({});

const sourcesCount = computed(() => props.sources?.length || 0);

// Tooltip text
const sourcesTeaserString = computed(() => {
  if (sourcesCount.value === 0) return '0 sources';
  const names = props.sources.map(s => s.publisher || getSourceDomain(s.url)).filter(Boolean);
  return names.join(', ');
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
/* Optional: hide default marker for details/summary if not already handled by list-none */
details > summary::-webkit-details-marker {
  display: none;
}
</style> 