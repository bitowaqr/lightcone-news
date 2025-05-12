<template>
  <!-- isArticleRead is disabled for now ! -->
  <div 
    :class="{
      'opacity-60': false && isArticleRead,
      'transition-opacity duration-100': true
    }"
    
  > 
  <!-- PRIO: {{group.priority}} -->
    <div
      class="h-full flex flex-col py-4 lg:px-4 lg:pb-6 relative" 
    >
      <!-- Mark as Read Button DISABLED for now ! -->
      <button 
        v-if="authStore.isAuthenticated && group?.story?.articleId"
        :key="`read-status-btn-${group.story.articleId}-${isArticleRead}`" 
        @click.stop.prevent="toggleReadStatus"
        title="Mark as read/unread"
        class="hidden absolute -top-4 right-1 z-10 p-1 rounded-full text-fg-muted hover:text-primary hover:bg-bg-subtle transition-colors duration-150"
      >
        <Icon 
          :name="isArticleRead ? 'mdi:check-box-outline' : 'mdi:check-box-outline-blank'" 
          class="w-4 h-4"
        />
      </button>

      <!-- ARTICLE CLICKABLE PART -->
      <NuxtLink v-if="group?.story?.slug" :to="`/articles/${group.story.slug}`" class="group">
        <div class="flex flex-col" :class="{
          'flex-col': layoutOption === 'vertical' || !group.imageUrl,
          'lg:flex-row': layoutOption === 'horizontal' && group.imageUrl
        }">
          <div class="w-full max-w-[100vw] min-w-[100px]">
            <img v-if="group.imageUrl" :src="group.imageUrl" class="w-full h-full object-cover -mt-4 mb-2" alt="" />
          </div>
          
          <div class="w-full px-2 md:px-4">
            <h2 
              ref="titleElement"
              class="text-xl md:text-2xl leading-tight font-medium group-hover:underline transition-colors duration-150" id="article-title">
              {{ group.story.title }}
            </h2>
            <div id="article-precis" class="text-fg mt-2 md:mt-4 mb-1 group-hover:text-fg transition-colors duration-150">
              <span class="line-clamp-4">{{ group.story.precis }}</span> 
            </div>
          </div>
        </div>
      </NuxtLink>
  
      <!-- SEPARATE ROW FOR SOURCES AND CONTINUE READING (outside the NuxtLink above) -->
      <div class="w-full" v-if="group?.story?.slug">
        <div class="flex items-center justify-between mt-2">
          <TeaserSources :sources="group.story.sources" />
          <NuxtLink 
            :to="`/articles/${group.story.slug}`" 
            class="text-fg-muted hover:opacity-80 font-medium text-xs inline-flex items-center gap-1 flex-shrink-0 pr-3 pl-4 "
            @mouseenter="underlineTitle"
            @mouseleave="removeUnderline"
          >
            Read more <Icon name="heroicons:arrow-right" class="w-3 h-3" />
          </NuxtLink>
        </div>
      </div>

      <!-- Fallback if slug is missing -->
      <div v-else class="opacity-50 cursor-not-allowed">
         <div class="flex" :class="{'flex-col': layoutOption === 'vertical'}">
          <div class="mb-6 w-full">
            <img v-if="group.imageUrl" :src="group.imageUrl" class="w-full h-full object-cover" alt="" />
          </div>
          <div class="ps-2 lg:ps-4 w-full">
            <!-- META - Moved Up (Fallback) -->
            <div id="article-meta" class="flex items-center space-x-2 py-2 mb-2">
              <div class="text-xs text-fg-muted leading-none border-r border-fg-muted pr-2 my-1">
                {{ group.story?.publishedDate || '...' }}
              </div>
              <div class="text-xs text-fg-muted leading-none">
                 {{ group.story?.sources?.length || 0 }} sources
              </div>
            </div>
  
            <h2 class="text-2xl leading-tight font-medium text-fg-muted" id="article-title">
              {{ group.story?.title || 'Article data missing' }}
            </h2>
             <div id="article-precis" class="text-fg-muted mb-2 mt-4">
              <div class="line-clamp-4">{{ group.story?.precis || '...' }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="px-1 md:px-4">
        <div v-if="group.story?.sources?.length > 0" :sources="group.story.sources" />
        <div v-else class="text-xs text-fg-muted leading-none">
          0 sources
        </div>
      </div>

      <!-- SCENARIOS section wrapper -->
      <div class="">
        <!-- Section Title -->
        <div class="mt-4 mb-1 text-xs font-semibold text-fg-muted ps-2" v-if="group.scenarios && group.scenarios.length > 0">
          Forecasts:
        </div>
  
        <!-- UPDATED: Simple vertical list for Scenarios -->
        <div class="flex flex-col gap-1">
          <!-- Iterate over existing scenarios -->
          <template v-if="group.scenarios && group.scenarios.length > 0">
            <div
              v-for="(scenario, index) in group.scenarios"
              :key="scenario.scenarioId"
              :class="{ 
                'hidden': !showAllScenarios && index >= initialScenarioCount,
                'block': true // Changed from md:block to block
              }"
            >
              <ScenarioTeaser :scenario="scenario" />
            </div>
          </template>
          
          <!-- REMOVED: Request Scenario card/button -->
        </div>
  
        <!-- Expand/Collapse Button (Kept for mobile/inline context) -->
        <div v-if="group.scenarios && group.nScenarios > initialScenarioCount" class="mt-2 ps-2 lg:ps-4">
          <button
            @click="toggleShowAllScenarios"
            class="text-fg-muted font-medium mt-1 italic block text-sm hover:underline"
          >
            <span v-if="!showAllScenarios">
              Show {{ group.nScenarios - initialScenarioCount }} more
              {{ group.nScenarios - initialScenarioCount > 1 ? 'Scenarios' : 'Scenario' }}
            </span>
            <span v-else>
              Show fewer Scenarios
            </span>
          </button>
        </div>
  
        <!-- REMOVED: Placeholder if NO scenarios exist (Request button handled this before) -->
      </div>
    </div>
  
    <!-- ADDED: Share Dialog -->
    <CommonShareDialog 
      :show="showShareDialog" 
      :article-url="articleToShare ? `${origin}/articles/${articleToShare.slug}` : null"
      :article-title="articleToShare?.title"
      :scenario-url="null" 
      :scenario-title="null"
      @close="showShareDialog = false" 
    />
  </div> <!-- Close the new wrapper div -->
</template>

<script setup>
// Import necessary functions and components
import { ref, computed } from 'vue';
// ADDED: Imports for Share Dialog
import CommonShareDialog from '~/components/common/ShareDialog.vue';
import { useRequestURL } from '#app';
// Import NEW TeaserSources component
import TeaserSources from '~/components/article/TeaserSources.vue'; 
import ScenarioTeaser from '~/components/scenario/Teaser.vue'; // Ensure ScenarioTeaser is imported if not globally registered
// ADDED: Import auth store
import { useAuthStore } from '~/stores/auth'; 
// ADDED: Import bookmark store
import { useBookmarkStore } from '~/stores/bookmarks';
// ADDED: Import read articles store
import { useReadArticlesStore } from '~/stores/readArticlesStore';

const authStore = useAuthStore(); // ADDED: Initialize auth store
const bookmarkStore = useBookmarkStore(); // ADDED: Initialize bookmark store
const readArticlesStore = useReadArticlesStore(); // ADDED: Initialize read articles store

const props = defineProps({
  group: {
    type: Object,
    required: true,
    // Provide a more robust default including nested structures
    default: () => ({ 
        story: { 
            slug: null, 
            title: 'Loading...', 
            precis: '', 
            publishedDate: '', 
            sources: [],
            articleId: null // Ensure articleId is part of the default story object
        }, 
        imageUrl: null, 
        scenarios: [], 
        nScenarios: 0 
    }),
  },
  layoutOption: {
    type: String,
    default: 'horizontal',
  },
});

// --- ADDED: State for Share Dialog ---
const showShareDialog = ref(false);
const articleToShare = ref(null);
const origin = useRequestURL().origin;

// State for scenario expansion
const showAllScenarios = ref(false);
const initialScenarioCount = 3; // Number of scenarios to show initially (Changed from 2 to 3)

// ADDED: Ref for the title element
const titleElement = ref(null);

// Method to toggle scenario visibility
const toggleShowAllScenarios = () => {
  showAllScenarios.value = !showAllScenarios.value;
};

const handleShare = () => {
  const story = props.group?.story;
  if (!story || !story.slug) {
    console.warn('Cannot share article from teaser: missing story data or slug');
    return;
  }
  articleToShare.value = story;
  showShareDialog.value = true;
};

// --- ADDED: Methods to toggle underline on title --- 
const underlineTitle = () => {
  titleElement.value?.classList.add('force-underline');
};

const removeUnderline = () => {
  titleElement.value?.classList.remove('force-underline');
};

// Computed property to check if the article is read
const isArticleRead = computed(() => {
  if (!props.group?.story?.articleId) return false;
  return readArticlesStore.isRead(props.group.story.articleId);
});

// Method to toggle read status
const toggleReadStatus = () => {
  const articleId = props.group?.story?.articleId;
  if (!articleId || !authStore.isAuthenticated) return;

  if (readArticlesStore.isRead(articleId)) {
    readArticlesStore.markAsUnread(articleId);
  } else {
    readArticlesStore.markAsRead(articleId);
  }
};

</script>

<style scoped>
/* Remove any specific background here if present */

/* ADDED: Class to force underline */
.force-underline {
  text-decoration: underline;
  text-decoration-color: inherit; /* Optional: ensures underline color matches text */
  text-underline-offset: 2px; /* Optional: Adjust spacing */
}
</style>
