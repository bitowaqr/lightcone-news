<template>
  <!-- Desktop view: always expanded -->
  <div v-if="isDesktop" class="sources-desktop">
    <h3 class="text-sm font-semibold text-fg-muted mb-1">Sources:</h3>
    <div class="">
      <a
        v-for="(source, index) in sources"
        :key="`desktop-${source.id || index}`"
        :href="source.url"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center space-x-2 text-sm hover:bg-accent-bg rounded-md p-1 transition-colors duration-150"
      >
        <div class="w-5 h-5 rounded-full overflow-hidden border border-bg flex items-center justify-center bg-white">
          <img
            :src="getSourceFavicon(source.url)"
            :alt="getSourceDomain(source.url)"
            class="w-full h-full object-contain filter"
            @error="onFaviconError($event, `desktop-${source.id || index}`)"
            v-if="!faviconErrors[`desktop-${source.id || index}`]"
          />
          <div
            v-if="faviconErrors[`desktop-${source.id || index}`]"
            class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
          >
            <span class="text-[9px] font-medium text-gray-600">{{ getSourceInitial(source.url) }}</span>
          </div>
        </div>
        <span class="truncate">{{ source.title || getSourceDomain(source.url) }}</span>
      </a>
    </div>
  </div>
  <!-- Always use the details/summary structure -->
  <details id="article-sources-mobile" class="sources-details group" v-else>
    <summary class="flex items-center justify-between cursor-pointer list-none py-1">
       <!-- Chevron Icon on the LEFT -->
       <Icon 
         name="heroicons:chevron-right-20-solid" 
         class="w-4 h-4 text-fg-muted transition-transform duration-200 group-open:rotate-90 flex-shrink-0 mr-2" 
       />
       <!-- Flex-grow div for icons and label -->
       <div class="flex items-center flex-grow min-w-0">
          <!-- Collapsed Icons -->
          <!-- Removed the div for collapsed icons -->
          <!-- Collapsed Text Label -->
          <span class="text-xs text-fg-muted truncate">{{ collapsedSourcesLabel }}</span>
       </div>
    </summary>

    <!-- Expanded List (Now used always when expanded) -->
    <div class="mt-2 pl-1 list-none space-y-1.5 ms-5">
       <a
         v-for="(source, index) in sources"
         :key="`expanded-${source.id || index}`"
         class="text-sm flex items-center leading-tight"
         :href="sanitizeUrl(source.url)"
         target="_blank"
         rel="noopener noreferrer"
         :title="source.url || source.publisher"
       >
          <div class="flex-shrink-0 rounded-full overflow-hidden flex items-center justify-center w-5 h-5 mr-2 border border-gray-200 bg-white">
            <img
              :src="getSourceFavicon(source.url)"
              :alt="getSourceDomain(source.url)"
              class="w-full h-full object-contain filter"
              @error="onFaviconError($event, `mobile-expanded-${source.id || index}`)"
              v-if="!faviconErrors[`mobile-expanded-${source.id || index}`]"
            />
            <div
              v-if="faviconErrors[`mobile-expanded-${source.id || index}`]"
              class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
            >
              <span class="text-[10px] font-medium text-gray-600">{{ getSourceInitial(source.url) }}</span>
            </div>
          </div>
          <div
            v-if="source.url || source.publisher"
            class="text-fg-muted hover:text-primary hover:underline truncate"
          >
            {{ getSourceDomain(source.url) || source.publisher }}
          </div>
       </a>
    </div>
  </details>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { getSourceFavicon, getSourceDomain, getSourceInitial, sanitizeUrl } from '~/utils/sourceUtils';

const props = defineProps({
  sources: {
    type: Array,
    required: true,
    default: () => [],
  },
  isDesktop: {
    type: Boolean,
    default: false,
  },
});

const sourcesCount = computed(() => props.sources?.length || 0);
const faviconErrors = ref({});

// Computed property for collapsed view icons (first 3 sources)
const collapsedSources = computed(() => props.sources.slice(0, 3));

// Computed property for mobile collapsed label text
const collapsedSourcesLabel = computed(() => {
  if (sourcesCount.value === 0) return 'No Sources';
  if (sourcesCount.value === 1) return 'Show Source (1)';
  return `Show Sources (${sourcesCount.value})`;
});

const onFaviconError = (event, key) => {
  faviconErrors.value[key] = true;
};

// REMOVED isDesktop ref and related logic
// const isDesktop = ref(false);
// const checkScreenSize = () => { ... };
// onMounted(() => { ... });
// onUnmounted(() => { ... });

// No longer need showAllSources state for mobile as details handles it
// watch(isDesktop, (newVal) => {
//   if (!newVal) {
//     showAllSources.value = false; // Collapse sources on mobile
//   }
// });

</script>

<style scoped>
.filter {
  filter: grayscale(80%) brightness(110%) contrast(90%);
  opacity: 0.9;
}
/* Hide default marker for details/summary */
.sources-details summary::-webkit-details-marker {
  display: none;
}
</style> 