<template>
  <article class="pt-4 sm:px-4 pb-20">
    <div v-if="articleData">
      <!-- Top Section: Main Content + Sidebar (Desktop) -->
      <div class="grid grid-cols-1 lg:grid-cols-5 lg:gap-x-8">

        <!-- Main Content Column (Desktop: 2 cols, Mobile: 1 col) -->
        <div class="lg:col-span-3 space-y-6 px-2">
          <!-- Title + Meta -->
          <div> 
             <h2 class="text-3xl lg:text-4xl font-bold mb-2">{{ articleData.title }}</h2>
             <div class="text-xs text-gray-500 mb-1" v-if="articleData.publishedDate">
               Updated: {{ formattedPublishedDate }}
             </div>
          </div>
          <!-- Precis -->
          <div v-html="precis.value" class="leading-relaxed font-semibold"></div>
          <!-- Image -->
          <div v-if="articleData.imageUrl" class="relative h-[360px] -ms-6 -me-6 w-[calc(100%+48px)] lg:-ms-0 lg:w-full">
            <img :src="articleData.imageUrl" class="w-full h-full object-cover rounded-md" alt="Article image" />
          </div>
          <!-- View Toggle + Content -->
          <div> 
            <div class="mb-2 border-b border-fg-muted w-10"></div>
            <!-- Summary View Toggle -->
            <div class="flex items-center space-x-1 mb-4 text-xs text-fg-muted">
              <button
                @click="showAltSummary = false"
                :class="[
                  'flex items-center space-x-1 p-1 px-2 rounded-md transition-colors duration-150 focus:outline-none', 
                  !showAltSummary ? 'text-primary font-medium' : ''
                ]"
              >
                <Icon name="heroicons:bars-3-bottom-left-20-solid" class="w-4 h-4 flex-shrink-0" />
                <span>Text View</span>
              </button>
              <button
                @click="showAltSummary = true"
                :class="[
                  'flex items-center space-x-1 p-1 px-2 rounded-md transition-colors duration-150 focus:outline-none', 
                  showAltSummary ? 'text-primary font-medium' : ''
                  ]"
                >
                 <Icon name="heroicons:list-bullet-20-solid" class="w-4 h-4 flex-shrink-0" />
                 <span>Bullets</span>
              </button>
              <!-- Bookmark and Share Icons Placeholder -->
              <div class="flex-grow"></div> <!-- Spacer -->
              <!-- Bookmark Icon (Conditional) -->
              <button v-if="authStore.isAuthenticated" @click="handleBookmark" class="p-1 rounded-md hover:bg-bg-subtle text-fg-muted">
                  <Icon 
                      :name="isBookmarked ? 'heroicons:bookmark-solid' : 'heroicons:bookmark'" 
                      class="w-4 h-4 transition-colors" 
                      :class="{ 'text-primary': isBookmarked }"
                  />
              </button>
              <button @click="handleShare" class="p-1 rounded-md hover:bg-bg-subtle text-fg-muted">
                 <Icon name="heroicons:share" class="w-4 h-4" />
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
          </div>
          
          <div v-if="!isDesktop && articleData.sources?.length" class="">
          <ArticleSources :sources="articleData.sources" />
      </div>
          
          <div v-if="isDesktop" class="interaction-area-desktop mt-6 pt-6 border-t border-bg-muted space-y-0"> 
             <div class="mb-1 border-b border-bg-muted text-xs font-semibold text-fg-muted px-2">Ask questions about the story:</div>
             <!-- Timeline Instance -->
             <MobileInteraction 
               v-if="articleData.timeline?.length"
               type="timeline" 
               :timelineData="articleData.timeline" 
             />
             <!-- Suggested Prompts Instances -->
             <MobileInteraction 
               v-for="(prompt, index) in articleData.suggestedPrompts" 
               :key="`mobile-prompt-${index}`"
               type="prompt"
               :promptText="prompt"
               :contextId="articleData._id" 
             />
             <!-- Custom Question Instance -->
             <MobileInteraction 
               type="custom"
               :contextId="articleData._id" 
             />
          </div>
        </div>

        <!-- Sidebar Column (Desktop Only) - Rebuilt Content -->
        <aside v-if="isDesktop" 
               class="lg:col-span-2 flex flex-col space-y-6 lg:pt-0 pt-8 lg:border-l lg:border-bg-muted lg:pl-8">
          <!-- Sources REMOVED FROM SIDEBAR -->
          <ArticleSources :sources="articleData.sources" :isDesktop="true" />
          <!-- Timeline REMOVED FROM SIDEBAR -->
          <!-- <ArticleTimeline :timeline="articleData.timeline" /> -->
          <!-- Scenarios -->
          <div v-if="articleData.scenarios?.length" class="scenarios-sidebar-section">
            <div class="mb-1 border-b border-bg-muted text-xs font-semibold text-fg-muted px-2">
              How the story might continue:
            </div>
            <div class="grid grid-cols-1 gap-1 mt-2">
              <div 
                v-for="scenario in articleData.scenarios" 
                :key="scenario.scenarioId" 
                class=""
              >
                <ScenarioTeaser :scenario="scenario" :forceSmallText="true" />
              </div>
            </div>
          </div>
        </aside>

      </div> <!-- End Main Grid -->

      

      <!-- Scenarios Section (Mobile Only) - ADDED BACK -->
      <div
        v-if="!isDesktop && articleData.scenarios?.length"
        class="mt-6 pt-6 border-t border-bg-muted"
      >
        <div class="mb-1 border-b border-bg-muted text-xs font-semibold text-fg-muted px-2">
          How the story might continue:
        </div>
        <div class="grid grid-cols-1 gap-1">
          <div 
            v-for="scenario in displayedScenarios" 
            :key="scenario.scenarioId" 
            class=""
          >
            <ScenarioTeaser :scenario="scenario" />
          </div>
        </div>
        <!-- Show More/Fewer Button (Mobile Only) -->
        <button 
          v-if="!isDesktop && articleData.scenarios.length > initialMobileScenarios"
          @click="showAllMobileScenarios = !showAllMobileScenarios"
          class="text-fg-muted mt-1 italic block text-sm hover:underline font-medium"
        >
          <span v-if="!showAllMobileScenarios"> 
            Show {{ articleData.scenarios.length - initialMobileScenarios }} more 
            {{ articleData.scenarios.length - initialMobileScenarios === 1 ? 'scenario' : 'scenarios' }}...
          </span>
          <span v-else> 
            Show fewer scenarios
          </span>
        </button>
      </div>

      <!-- Mobile Interaction Area (Timeline/Prompts/Response Window) - ADDED BACK for Mobile -->
      <div v-if="!isDesktop" class="interaction-area-mobile mt-6 pt-6 border-t border-bg-muted space-y-0"> 
         <div class="mb-1 text-xs font-semibold text-fg-muted px-2">Ask questions about the story:</div>
         <!-- Timeline Instance -->
         <MobileInteraction 
           v-if="articleData.timeline?.length"
           type="timeline" 
           :timelineData="articleData.timeline" 
         />
         <!-- Suggested Prompts Instances -->
         <MobileInteraction 
           v-for="(prompt, index) in articleData.suggestedPrompts" 
           :key="`mobile-prompt-${index}`"
           type="prompt"
           :promptText="prompt"
           :contextId="articleData._id" 
         />
         <!-- Custom Question Instance -->
         <MobileInteraction 
           type="custom"
           :contextId="articleData._id" 
         />
      </div>

    </div> <!-- End v-if articleData -->
    <div v-else class="text-center py-10">
      <p class="text-fg-muted">Article data is not available.</p>
    </div>

    <!-- Share Dialog -->
    <CommonShareDialog 
      :show="showShareDialog" 
      :article-url="currentArticleUrl" 
      :article-title="articleData?.title"
      @close="showShareDialog = false" 
    />

  </article>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCookie, useRequestURL } from '#app';
import { renderMarkdown } from '~/composables/useMarkdown';
import { formatRelativeTime } from '~/utils/formatRelativeTime';
import CommonShareDialog from '~/components/common/ShareDialog.vue';
import ArticleSources from '~/components/article/Sources.vue';
import ArticleTimeline from '~/components/article/Timeline.vue';
import MobileInteraction from '~/components/article/MobileInteraction.vue';
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks';

const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();

const props = defineProps({
  articleSlug: {
    type: String,
    required: false,
  },
  articleData: {
    type: Object,
    required: true,
    default: () => null,
  },
});

// Desktop detection
const isDesktop = ref(false);
const checkScreenSize = () => {
  isDesktop.value = window.innerWidth >= 1024; // lg breakpoint
};
onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});
onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

// State for share dialog
const showShareDialog = ref(false);
const currentArticleUrl = computed(() => useRequestURL().href);

// Use a cookie for summary view
const showAltSummary = useCookie('lightcone-summary-view', { 
  default: () => false, 
  maxAge: 60 * 60 * 24 * 365
});

// Scenarios Mobile State - RESTORED
const initialMobileScenarios = 3;
const showAllMobileScenarios = ref(false);
const displayedScenarios = computed(() => {
  // Note: isDesktop check is implicitly handled by the v-if on the section now
  if (showAllMobileScenarios.value) {
    return props.articleData.scenarios;
  }
  return props.articleData.scenarios?.slice(0, initialMobileScenarios) || [];
});

// Computed property for bookmark status
const isBookmarked = computed(() => {
    const articleId = props.articleData?._id;
    return articleId ? bookmarkStore.isBookmarked(articleId, 'article') : false;
});

// Use the composable's render function
const precis = computed(() => props.articleData ? renderMarkdown(props.articleData.precis) : '');
const summary = computed(() => props.articleData ? renderMarkdown(props.articleData.summary) : '');
const summaryAlt = computed(() => props.articleData ? renderMarkdown(props.articleData.summaryAlt) : '');

// <-- Add computed property for formatted date
const formattedPublishedDate = computed(() => {
  return props.articleData?.publishedDate ? formatRelativeTime(props.articleData.publishedDate) : '';
});

// Placeholder functions for new icons
const handleBookmark = () => {
  const articleId = props.articleData?._id;
  if (articleId) {
      bookmarkStore.toggleBookmark(articleId, 'article');
  } else {
      console.warn('Cannot toggle bookmark: Article ID missing from articleData prop.');
  }
};

const handleShare = () => {
  // Open the share dialog
  showShareDialog.value = true;
};

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
