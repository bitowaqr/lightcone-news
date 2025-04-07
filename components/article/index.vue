<template>
  <article class="p-6 pb-20">
    <div v-if="articleData">
      <h2 class="text-2xl font-bold mb-1">{{ articleData.header?.title }}</h2>
      <div class="text-xs text-gray-500 mb-1">
        Updated: {{ articleData.header?.publishedDate }}
      </div>

      <div v-html="precis" class="mt-4 mb-8 leading-relaxed font-semibold"></div>


      <!-- Full Content -->
      <div
        v-html="summary"
        class="leading-snug"
      ></div>

      <!-- Sources -->
      <ArticleSources :sources="articleData.sources" class="mt-10"/>
      
      <!-- Prompts / Chat -->
      <ArticlePrompts :context-id="articleId" class="mt-8" />

      <!-- Timeline -->
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
// Import the composable
import { renderMarkdown } from '~/composables/useMarkdown';
import { computed, ref } from 'vue';
import { getSourceFavicon, getSourceDomain, getSourceInitial, sanitizeUrl } from '~/utils/sourceUtils';
import ArticleSources from './Sources.vue'; // Import the new component
import ArticleTimeline from './Timeline.vue'; // Import the Timeline component

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
    
// Use the composable's render function
const precis = renderMarkdown(props.articleData?.precis);
const summary = renderMarkdown(props.articleData?.summary);
</script>

<style scoped></style>
