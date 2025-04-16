<template>
  <article class="p-6 pb-20">
    <div v-if="articleData">
      <h2 class="text-2xl font-bold mb-1">{{ articleData.header?.title }}</h2>
      <div class="text-xs text-gray-500 mb-1">
        Updated: {{ articleData.header?.publishedDate }}
      </div>

      <div v-html="precis" class="mt-6 mb-2 leading-relaxed font-semibold"></div>

      <div v-if="articleData.imageUrl" class="mt-6 mb-4 relative h-[360px] -ms-6 -me-6 w-[calc(100%+48px)]">
      <img  :src="articleData.imageUrl" class="w-full h-full object-cover" />
      </div>

      <div class="mb-2  border-b border-fg-muted w-10"></div>
      <!-- Summary View Toggle -->
      <div class="flex items-center space-x-2 mb-4 text-xs text-fg-muted">
        <span class="font-medium text-fg-muted pb-1">View:</span> 
        <button
          @click="showAltSummary = false"
          :class="['p-1 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500', !showAltSummary ? 'bg-bg-alt text-fg' : 'hover:bg-bg-subtle']"
          aria-label="Show summary as paragraphs"
          :aria-pressed="!showAltSummary"
        >
          <Icon name="heroicons:bars-3-bottom-left-20-solid" class="w-4 h-4" />
        </button>
        <button
          @click="showAltSummary = true"
          :class="['p-1 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500', showAltSummary ? 'bg-bg-alt text-fg' : 'hover:bg-bg-subtle']"
          aria-label="Show summary as bullet points"
          :aria-pressed="showAltSummary"
          >
          <Icon name="heroicons:list-bullet-20-solid" class="w-4 h-4" />
        </button>
      </div>

      
      <!-- Full Content -->
      <div
      v-if="!showAltSummary"
        v-html="summary"
        class="para-spacing lg:text-lg"
      ></div>
      <div
      v-if="showAltSummary"
        v-html="summaryAlt"
        class="para-spacing lg:text-lg leading-snug"
      ></div>

      <ArticleSources :sources="articleData.sources" class="mt-10"/>
      
      
      <ArticlePrompts :context-id="articleId" :suggested-prompts="articleData.suggestedPrompts" class="mt-8" />

      <ArticleTimeline :timeline="articleData.timeline" />

      <!-- Related Scenarios -->
      <div
        v-if="articleData.scenarios && articleData.scenarios.length > 0"
        class="mt-6"
      >
        <h4 class="text-xs font-medium text-fg-muted mb-2">Related Scenarios</h4>
        <div class="grid grid-cols-1 gap-4"
        :class="{ 'md:grid-cols-2': articleData.scenarios.length > 1 }"
        >
          <ScenarioTeaser
            v-for="scenario in articleData.scenarios"
            :key="scenario.scenarioId"
            :scenario="scenario"
          />
        </div>
      </div>
    </div>
    <div v-else>
      <p>Article data is not available.</p>
    </div>
  </article>
</template>

<script setup>
// Import necessary composables
import { ref } from 'vue'; // Keep ref for precis/summary rendering
import { useCookie } from '#app'; // Import useCookie
import { renderMarkdown } from '~/composables/useMarkdown';
import ArticleSources from './Sources.vue'; 
import ArticleTimeline from './Timeline.vue'; 

const props = defineProps({
  articleId: {
    type: String,
    required: true,
  },
  articleData: {
    type: Object,
    required: false, // Can be null/undefined initially
    default: null,
  },
});

// Use a cookie to store the preference. Default to true (bullet points)
// useCookie handles SSR and client-side persistence automatically.
const showAltSummary = useCookie('lightcone-summary-view', { 
  default: () => true, 
  maxAge: 60 * 60 * 24 * 365 // Persist for 1 year
});

// Use the composable's render function
const precis = renderMarkdown(props.articleData?.precis);
const summary = renderMarkdown(props.articleData?.summary);
const summaryAlt = renderMarkdown(props.articleData?.summaryAlt);
</script>

<style scoped>
.para-spacing :deep(p) {
  margin-bottom: 1.25rem;
}
.para-spacing :deep(h2) {
  margin-bottom: 1.25rem;
}
.para-spacing :deep(h3) {
  margin-bottom: 1.25rem;
}
@media (min-width: 768px) {
  .para-spacing :deep(p) {
    margin-bottom: 1.5rem;
  }
}
</style>
