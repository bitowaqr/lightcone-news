<template>
  <article class="p-6 pb-20">
    <div v-if="articleData">
      <h2 class="text-2xl font-bold mb-1">{{ articleData.title }}</h2>
      <div class="text-xs text-gray-500 mb-1" v-if="articleData.publishedDate">
        Updated: {{ articleData.publishedDate }}
      </div>

      <div v-html="precis.value" class="mt-6 mb-2 leading-relaxed font-semibold"></div>

      <div v-if="articleData.imageUrl" class="mt-6 mb-4 relative h-[360px] -ms-6 -me-6 w-[calc(100%+48px)]">
        <img :src="articleData.imageUrl" class="w-full h-full object-cover" alt="Article image" />
      </div>

      <div class="mb-2 border-b border-fg-muted w-10"></div>
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
        v-html="summary.value"
        class="prose prose-lg dark:prose-invert max-w-none"
      ></div>
      <div
      v-if="showAltSummary"
        v-html="summaryAlt.value"
        class="prose prose-lg dark:prose-invert max-w-none"
      ></div>

      <ArticleSources v-if="articleData.sources?.length" :sources="articleData.sources" class="mt-10"/>
      
      
      <ArticlePrompts v-if="articleData._id" :context-id="articleData._id" :suggested-prompts="articleData.suggestedPrompts" class="mt-8" />

      <ArticleTimeline v-if="articleData.timeline?.length" :timeline="articleData.timeline" class="mt-10"/>

      <!-- Related Scenarios -->
      <div
        v-if="articleData.scenarios?.length"
        class="mt-10 pt-6 border-t border-bg-muted"
      >
        <h4 class="text-base font-semibold text-fg mb-4">Related Scenarios</h4>
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
    <div v-else class="text-center py-10">
      <p class="text-fg-muted">Article data is not available.</p>
    </div>
  </article>
</template>

<script setup>
// Import necessary composables
import { ref, computed } from 'vue'; // Keep ref for precis/summary rendering
import { useCookie } from '#app'; // Import useCookie
import { renderMarkdown } from '~/composables/useMarkdown';
import ArticleSources from './Sources.vue'; 
import ArticleTimeline from './Timeline.vue'; 
import ArticlePrompts from './Prompts.vue'; // Ensure Prompts is imported
import ScenarioTeaser from '~/components/scenario/Teaser.vue'; // Ensure Teaser is imported

const props = defineProps({
  articleSlug: {
    type: String,
    required: false,
  },
  articleData: {
    type: Object,
    required: true, // Data is required for display
    default: () => null, // Default should be null to trigger the v-else
  },
});

// Use a cookie to store the preference. Default to true (bullet points)
// useCookie handles SSR and client-side persistence automatically.
const showAltSummary = useCookie('lightcone-summary-view', { 
  default: () => true, 
  maxAge: 60 * 60 * 24 * 365 // Persist for 1 year
});

// Use the composable's render function
const precis = computed(() => props.articleData ? renderMarkdown(props.articleData.precis) : '');
const summary = computed(() => props.articleData ? renderMarkdown(props.articleData.summary) : '');
const summaryAlt = computed(() => props.articleData ? renderMarkdown(props.articleData.summaryAlt) : '');
</script>

<style scoped>
.prose :deep(p),
.prose :deep(ul),
.prose :deep(ol) {
  margin-bottom: 1em;
}

.prose :deep(h2),
.prose :deep(h3) {
  margin-top: 1.5em;
  margin-bottom: 0.75em;
}
</style>
