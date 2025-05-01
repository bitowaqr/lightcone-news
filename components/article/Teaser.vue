<template>
  <!-- New wrapper div -->
  <div> 
    <div
      class="h-full flex flex-col pt-2 pb-6 lg:px-4 lg:pb-8"
    >
      <!-- ARTICLE -->
      <NuxtLink v-if="group?.story?.slug" :to="`/articles/${group.story.slug}`">
        <div class="flex flex-col" :class="{
          'flex-col': layoutOption === 'vertical' || !group.imageUrl,
          'lg:flex-row': layoutOption === 'horizontal' && group.imageUrl
        }">
          <div class="w-full max-w-[100vw] min-w-[100px]">
            <img v-if="group.imageUrl" :src="group.imageUrl" class="w-full h-full object-cover -mt-4 mb-2" alt="" />
          </div>
          
          <div class="w-full px-2 md:px-4">
            <!-- META - Moved Up -->
            <div id="article-meta" class="flex items-center justify-between space-x-2 py-1">
              <div class="flex items-center space-x-2">
                <div
                  class="text-xs text-fg-muted leading-none border-r border-fg-muted pr-2"
                  my-1
                >
                  {{ group.story.publishedDate }}
                </div>
                 <!-- Use NEW TeaserSources component -->
                <TeaserSources v-if="group.story?.sources?.length > 0" :sources="group.story.sources" />
                <div v-else class="text-xs text-fg-muted leading-none">
                  0 sources
                </div>
              </div>
              <!-- ADDED: Share/Bookmark Icons -->
              <div class="flex items-center space-x-1">
                  <!-- Bookmark Icon (Conditional) -->
                  <button v-if="authStore.isAuthenticated" @click.prevent="handleBookmark" class="p-1 rounded-md hover:bg-bg-subtle text-fg-muted">
                      <Icon 
                          :name="isBookmarked ? 'heroicons:bookmark-solid' : 'heroicons:bookmark'" 
                          class="w-4 h-4 transition-colors" 
                          :class="{ 'text-primary': isBookmarked }"
                      />
                  </button>
                  <!-- Share Icon -->
                  <button @click.prevent="handleShare" class="p-1 rounded-md hover:bg-bg-subtle text-fg-muted">
                      <Icon name="heroicons:share" class="w-4 h-4" />
                  </button>
              </div>
              <!-- END ADDED -->
            </div>
  
            <h2 
            class="text-xl md:text-2xl leading-tight font-medium" id="article-title">
              {{ group.story.title }}
            </h2>
            <div id="article-precis" class="text-fg mb-2 mt-2 md:mt-4">
              <div class="line-clamp-4">{{ group.story.precis }}
              </div>
            </div>
          </div>
        </div>
      </NuxtLink>
  
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
  
      <!-- SCENARIOS section wrapper -->
      <div class="">
        <!-- Section Title -->
        <div class="mt-4 mb-1 border-b border-bg-muted text-xs font-semibold text-fg-muted px-2">
          How the story might continue:
        </div>
  
        <!-- Grid for Scenarios and Request Button -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
          <!-- Iterate over existing scenarios -->
          <template v-if="group.scenarios && group.scenarios.length > 0">
            <div
              v-for="(scenario, index) in group.scenarios"
              :key="scenario.scenarioId"
              :class="{ 
                'hidden': !showAllScenarios && index >= initialScenarioCount,
                'md:block': true
              }"
            >
              <ScenarioTeaser :scenario="scenario" />
            </div>
          </template>
          
          <!-- Add the Request Scenario card -->
          <div :class="{
              'hidden': group.scenarios && !showAllScenarios && group.scenarios.length >= initialScenarioCount,
              'md:block': true
            }">
             <ScenarioRequestButton />
          </div>
        </div>
  
        <!-- Expand/Collapse Button -->
        <div v-if="group.scenarios && group.nScenarios > initialScenarioCount" class="mt-2 ps-2 lg:ps-4 md:hidden">
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
  
        <!-- Placeholder if NO scenarios exist -->
        <!-- The request button will still be shown in the grid above -->
        <div v-if="!group.scenarios || group.scenarios.length === 0" class="text-sm text-fg-muted italic pt-1 pb-2 ps-2 px-2 lg:px-4">
          No forecast scenarios available yet for this story.
        </div>
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
import ScenarioRequest from '~/components/scenario/RequestButton.vue'; // <-- Import the new component
// ADDED: Import auth store
import { useAuthStore } from '~/stores/auth'; 
// ADDED: Import bookmark store
import { useBookmarkStore } from '~/stores/bookmarks';

const authStore = useAuthStore(); // ADDED: Initialize auth store
const bookmarkStore = useBookmarkStore(); // ADDED: Initialize bookmark store

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
            sources: [] 
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

// Method to toggle scenario visibility
const toggleShowAllScenarios = () => {
  showAllScenarios.value = !showAllScenarios.value;
};

// Computed property for bookmark status
const isBookmarked = computed(() => {
    // Ensure group, story, and articleId exist before checking
    const articleId = props.group?.story?.articleId;
    return articleId ? bookmarkStore.isBookmarked(articleId, 'article') : false;
});

// Updated bookmark handler
const handleBookmark = () => {
  const articleId = props.group?.story?.articleId;
  if (articleId) {
      bookmarkStore.toggleBookmark(articleId, 'article');
  } else {
      console.warn('Cannot toggle bookmark: Article ID missing.');
  }
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

</script>

<style scoped>
/* Remove any specific background here if present */
</style>
