<template>
  <div id="article-meta" class="flex items-start py-2 flex-col justify-start">
    <h4 class="text-xs font-medium text-fg-muted mb-1 ms-1">Sources:</h4>
    <div
      id="article-sources"
      class="flex items-center text-fg-muted leading-none bg-bg-muted px-2 py-2 border border-accent-bg rounded-2xl shadow-sm max-w-[50%] min-w-[240px] transition-all duration-100 w-fit"
      :class="{ 'max-w-full': showAllSources }"
    >
      <!-- Collapsed view with overlapping icons and source names -->
      <div 
        v-if="!showAllSources" 
        class="flex items-center cursor-pointer"
        @click="showAllSources = true"
      >
        <div class="flex items-center">
          <div 
            v-for="(source, idx) in [...sourcesTop,...sourcesRest]" 
            :key="source.id || idx"  
            class="w-8 h-8 overflow-hidden border border-gray-100 flex items-center justify-center"
            :style="{ marginLeft: idx > 10 ? '-28px' : idx > 2 ? '-22px' : idx > 0 ? '-16px' : '0', zIndex: 10 - idx }"
            :class="{ 'rounded-full': !showAllSources, 'rounded-lg': showAllSources }"
          >
            <img
              :src="getSourceFavicon(source.url)"
              :alt="getSourceDomain(source.url)"
              class="w-full h-full object-cover"
              @error="onFaviconError($event, source.id || idx)"
              v-if="!faviconErrors[source.id || idx] && idx < 3"
            />
            <!-- Generic round icons for additional sources in sourcesRest -->
            <div 
              v-if="idx >= 3 && idx < 5" 
              class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300 "
            >
              <span class="text-xs font-medium text-gray-600">
                {{ getSourceInitial(source.url) }}
              </span>
            </div>
            <!-- More indicator if there are many sources -->
            <div 
              v-if="idx === 5 && sourcesRest.length > 3" 
              class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-300 to-gray-400"
            >
            </div>
            <div
              v-if="faviconErrors[source.id || idx]"
              class="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
            >
              <span class="text-sm font-medium text-gray-600">
                {{ getSourceInitial(source.url) }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- Source names -->
        <div class="ml-2 text-sm" v-if="sourcesTop?.length > 0">
            <div class="flex items-center justify-center">
              <div class="line-clamp-1 shrink-1 w-fit">
              {{ sourcesTop?.[0]?.name }} {{ sourcesTop.length > 2 ? ' + ' + (sourcesTop.length - 1 + sourcesRest.length) + ' Sources' : '' }}
              </div>
            </div>
        </div>
      </div>
      
      <!-- Expanded view with all sources -->
      <div 
        v-if="showAllSources"
        class="w-full transition-all duration-200"
      >
        <div class="flex items-center justify-between mb-2">
           
          <button 
            @click="showAllSources = false"
            class="text-xs text-fg-muted hover:underline transition-colors duration-200"
          >
            Hide
          </button>
        </div>
        <div class="list-none space-y-2 transition-all duration-200 ps-2">
          <a
            v-for="(source, index) in sources"
            :key="source.id || index"
            class="text-sm flex items-center leading-none"
              :href="sanitizeUrl(source.url)"
              target="_blank"
              rel="noopener noreferrer"
              :title="getSourceDomain(source.url)"
            
          >
            <div class="rounded-full overflow-hidden flex items-center justify-center w-6 h-6 p-3 mr-2">
              <img
                :src="getSourceFavicon(source.url)"
                :alt="getSourceDomain(source.url)"
                class="w-6 h-6 max-w-6 max-h-6 object-cover"
                @error="onFaviconError($event, source.id || index)"
                v-if="!faviconErrors[source.id || index]"
              />
              <div
                v-if="faviconErrors[source.id || index]"
                class="w-6 h-6 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200"
              >
                <span class="text-xs font-medium text-gray-600">
                  {{ getSourceInitial(source.url) }}
                </span>
              </div>
            </div>
            <div
              v-if="source.url"
              class="text-fg-muted hover:underline max-w-full line-clamp-1"
            >
              {{ source.url }}
            </div>
            <span v-else>{{ source.name }}</span>
          </a>
        </div>
      </div>
    </div>
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

const sourcesCount = computed(() => props.sources?.length || 0);
const sourcesTop = computed(() => props.sources?.slice(0, 3) || []); // Show top 3 sources
const sourcesRest = computed(() =>
  sourcesCount.value > 3 ? props.sources?.slice(3) : []
);
const showAllSources = ref(false);
const faviconErrors = ref({});

const onFaviconError = (event, index) => {
  // Hide the failed image immediately
  event.target.style.display = 'none';
  // Mark this favicon as errored
  faviconErrors.value[index] = true;
};
</script>

<style scoped></style> 