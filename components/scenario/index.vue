<template>
  <div class="p-4 sm:p-6 pt-0 sm:pt-0">
    <!-- Conditionally render back button -->
    <div v-if="!isEmbedded" class="mb-2 sm:mb-4">
      <a
        href="#" 
        @click.prevent="$router.go(-1)"
        class="text-fg-muted hover:text-primary transition-colors duration-100 flex items-center gap-x-1 cursor-pointer">
        <Icon name="heroicons:arrow-left-20-solid" class="w-5 h-5 inline-block align-text-bottom" />
        <div class="text-sm">Back</div>
      </a>
    </div>
  
    <div v-if="scenario">
      <!-- Header -->
      <div class="mb-4 pb-4 relative">
        <h1 class="text-2xl md:text-3xl font-bold text-fg mb-2 leading-tight">{{ scenario.name }}</h1>
        <!-- Main metadata container - full width, space between -->
        <div class="flex flex-wrap items-center text-sm text-fg-muted w-full justify-between">
          <!-- Group for left-aligned items -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 justify-start">
             <!-- MOVED BACK: Close Date -->
             <span v-if="scenario.closeDate" class="inline-flex items-center">
                <Icon name="mdi:calendar-clock" class="w-3.5 h-3.5 mr-1 inline-block align-text-bottom" />
               <span class="ps-0.5 font-medium text-fg">{{ scenario.closeDate }}</span>
             </span>
             <!-- MOVED BACK: Platform Link -->
              <a :href="scenario.url" target="_blank" class="text-fg-muted hover:text-primary transition-colors items-center inline-flex group" v-if="scenario.url">
               <Icon name="mdi:web" class="w-4 h-4 mr-1 inline-block align-text-bottom" />
               <span class="group-hover:underline">{{ scenario.platform }}</span>
               <Icon name="mdi:open-in-new" class="w-3.5 h-3.5 ml-0.5 opacity-70 group-hover:opacity-100" />
             </a>
          </div>
          <!-- Share/Bookmark Icons Group (Pushed Right) -->
          <div class="flex space-x-1">
            <!-- Bookmark Icon (Conditional) -->
            <button 
                v-if="authStore.isAuthenticated" 
                @click.prevent="handleBookmark" 
                class="p-1 rounded-full hover:bg-bg-subtle text-fg-muted transition-colors duration-150"
                :class="{ 'text-primary': isBookmarked }"
                aria-label="Toggle bookmark"
            >
                <Icon 
                    :name="isBookmarked ? 'heroicons:bookmark-solid' : 'heroicons:bookmark'" 
                    class="w-5 h-5" 
                />
            </button>
            <!-- Share Icon -->
            <button 
                @click.prevent="handleShare" 
                class="p-1 rounded-full hover:bg-bg-subtle text-fg-muted transition-colors duration-150"
                aria-label="Share scenario"
            >
                <Icon name="heroicons:share" class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Current Chance (Smaller, above chart) -->
      <div class="ms-4" v-if="!loadingChance && !errorChance && chance !== null && chance !== undefined">
        <span class="font-semibold text-2xl text-primary mr-1">{{ formatProbability(chance) }}</span> 
        <span class="ps-0.5 text-fg-muted">Chance</span>
      </div>
      <div class="mb-1" v-else-if="loadingChance">
         <!-- Placeholder for loading height consistency -->
         <Icon name="line-md:loading-twotone-loop" class="w-5 h-5 text-fg-muted animate-spin inline-block" />
      </div>
       <div class="mb-2 text-sm text-red-500/80 h-6" v-else-if="errorChance">
         <Icon name="heroicons:exclamation-circle" class="w-5 h-5 inline-block mr-1" /> Error
      </div>
      <div class="mb-2 text-sm text-fg-muted h-6" v-else>
         <!-- Placeholder for height consistency when no data -->
          Chance N/A
      </div>

      <!-- History Chart Section -->
      <div class="mb-6">
         <!-- <h2 class="text-lg font-semibold text-fg mb-3">Prediction History</h2> --> <!-- Heading Removed -->
         
         <!-- Loading State -->
          <div v-if="loadingHistory" class="h-64 md:h-80 flex items-center justify-center bg-bg-muted/50 rounded-lg border border-bg-muted">
              <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-fg-muted animate-spin" />
          </div>

          <!-- Error State -->
          <div v-else-if="errorHistory" class="h-64 md:h-80 flex flex-col items-center justify-center text-red-500/80 bg-red-500/5 rounded-lg border border-red-500/20 p-4">
               <Icon name="heroicons:exclamation-triangle" class="w-7 h-7 mb-2" />
               <span class="text-sm font-medium mb-1">Error loading history</span>
               <span class="text-xs text-center text-red-500/70">{{ errorHistory }}</span>
          </div>

          <!-- Chart Component -->
          <HistoryChart v-else-if="historyData" :history-data="historyData" />

          <!-- Fallback if no data and no error (should be handled by HistoryChart internal state, but as safety) -->
           <div v-else class="h-64 md:h-80 flex items-center justify-center bg-bg-muted/50 rounded-lg border border-bg-muted">
                <p class="text-sm text-fg-muted">Prediction history is unavailable.</p>
            </div>
      </div>
      <!-- *************************** -->

      <!-- ADDED: Details (Collapsible) -->
      <div class="mb-6">
        <button 
          @click="isDetailsVisible = !isDetailsVisible"
          class="flex items-center text-sm text-fg-muted hover:text-fg transition-colors focus:outline-none w-full justify-start border-t border-bg-muted pt-3 mt-3"
        >
          <Icon :name="isDetailsVisible ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 mr-1" />
          <span class="text-base font-medium">Details</span>
        </button>
        <div v-if="isDetailsVisible" class="mt-3 space-y-2 text-sm text-fg-muted bg-bg-muted p-3 rounded border border-accent-bg">
          <!-- Moved Metadata Items -->
          <div v-if="scenario.status" class="flex items-center">
             <span class="font-medium w-20 inline-block flex-shrink-0">Status:</span> 
             <span :class="['px-1.5 py-0.5 rounded-full text-xs font-medium', statusClass]">{{ scenario.status }}</span>
          </div>
          <div v-if="scenario.liquidity" class="flex items-center">
             <span class="font-medium w-20 inline-block flex-shrink-0">Liquidity:</span> 
             <span class="font-medium text-fg">{{ Math.round(scenario.liquidity).toLocaleString() }}</span>
          </div>
           <div v-if="volume || scenario.volume" class="flex items-center">
             <span class="font-medium w-20 inline-block flex-shrink-0">Volume:</span> 
             <span class="font-medium text-fg">{{ Math.round(volume || scenario.volume).toLocaleString() }}</span>
          </div>
          <!-- Add other details like openDate if available/needed -->
           <div v-if="scenario.openDate" class="flex items-center">
             <span class="font-medium w-20 inline-block flex-shrink-0">Opened:</span> 
             <span class="font-medium text-fg">{{ formatDate(scenario.openDate) }}</span>
          </div>
           <div v-if="scenario.resolutionDate" class="flex items-center">
             <span class="font-medium w-20 inline-block flex-shrink-0">Resolved:</span> 
             <span class="font-medium text-fg">{{ formatDate(scenario.resolutionDate) }}</span>
          </div>
        </div>
      </div>
      <!-- END ADDED -->

      <!-- Resolution Toggle Button -->
      <button 
        @click="isResolutionVisible = !isResolutionVisible"
        class="flex items-center text-sm text-fg-muted hover:text-fg transition-colors focus:outline-none w-full justify-start border-t border-bg-muted pt-3 mt-3"
      >
        <Icon :name="isResolutionVisible ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 mr-1" />
        <span class="text-base font-medium">Resolution</span>
      </button>
       <!-- Resolution Content (Collapsible) -->
      <div v-if="isResolutionVisible" class="mt-3 text-sm text-fg-muted bg-bg-muted p-3 rounded border border-accent-bg">
        <p class="leading-relaxed whitespace-pre-wrap">{{ scenario.description }}</p>
      </div>

      <!-- Resolution Criteria (Collapsible) -->
      <div v-if="scenario.resolutionCriteria" class="mb-6">
        <button 
          @click="isCriteriaVisible = !isCriteriaVisible"
          class="flex items-center text-sm text-fg-muted hover:text-fg transition-colors focus:outline-none w-full justify-between border-t border-bg-muted pt-3 mt-3"
        >
          <span>Resolution Criteria</span>
          <Icon :name="isCriteriaVisible ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 ml-1" />
        </button>
        <div v-if="isCriteriaVisible" class="mt-2 text-sm text-fg-muted bg-bg-muted p-3 rounded border border-accent-bg">
          <p class="whitespace-pre-wrap">{{ scenario.resolutionCriteria }}</p>
        </div>
      </div>
      
      <!-- ADDED: Related Articles Section (Collapsible) -->
      <div v-if="scenario.relatedArticles && scenario.relatedArticles.length > 0" class="mb-6">
        <button 
          @click="isRelatedArticlesVisible = !isRelatedArticlesVisible"
          class="flex items-center text-sm text-fg-muted hover:text-fg transition-colors focus:outline-none w-full justify-start border-t border-bg-muted pt-3 mt-3"
        >
          <Icon :name="isRelatedArticlesVisible ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="w-5 h-5 mr-1" />
          <span class="text-base font-medium">Related Articles ({{ scenario.relatedArticles.length }})</span>
        </button>
        <div v-if="isRelatedArticlesVisible" class="mt-3 space-y-3">
          <div v-for="article in scenario.relatedArticles" :key="article._id" 
               class="border border-bg-muted rounded bg-bg-muted/30 p-3 transition-colors hover:border-primary/50">
             <NuxtLink :to="`/articles/${article.slug}`" class="block hover:no-underline">
               <h4 class="font-medium text-fg text-base mb-1 hover:text-primary">{{ article.title }}</h4>
               <p v-if="article.precis" class="text-sm text-fg-muted line-clamp-2 leading-snug mb-1">{{ article.precis }}</p>
               <p v-if="article.publishedDate" class="text-xs text-fg-muted/80">
                   Published: {{ formatDate(article.publishedDate) }}
                </p>
             </NuxtLink>
          </div>
        </div>
      </div>
      <!-- END ADDED -->

      <!-- Related Scenarios Section -->
      <div class="mt-6 pt-6 border-t border-bg-muted" v-if="scenario.scenarios && scenario.scenarios.length > 0">
         <h2 class="text-lg font-semibold text-fg mb-4">Related Scenarios</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <!-- Loop through related scenarios and use Teaser -->
             <ScenarioTeaser 
               v-for="relatedScenario in scenario.scenarios" 
               :key="relatedScenario.scenarioId" 
               :scenario="relatedScenario"
             />
          </div>
      </div>
      
    </div>
    <div v-else class="text-center text-fg-muted py-12">
      <p>Scenario data is not available.</p>
       <!-- Optional: Add a loading indicator here too if scenario itself might be loading -->
    </div>

    <!-- Share Dialog -->
    <CommonShareDialog 
      :show="showShareDialog" 
      :scenario-url="scenarioToShare ? `${origin}/scenarios/${scenarioToShare.id}` : null" 
      :scenario-title="scenarioToShare?.name"
      :article-url="null" 
      :article-title="null"
      @close="showShareDialog = false" 
    />
  </div>
</template>

<script setup>
import { computed, ref, toRefs } from 'vue';
import { useScenarioChance } from '~/composables/useScenarioChance';
import { useScenarioHistory } from '~/composables/useScenarioHistory'; // Import history composable
import CommonShareDialog from '~/components/common/ShareDialog.vue';
import { useRequestURL } from '#app';
import ScenarioTeaser from '~/components/scenario/Teaser.vue';
import HistoryChart from '~/components/scenario/HistoryChart.vue'; // Import history chart component
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks';

const props = defineProps({
  scenario: {
    type: Object,
    required: true,
    // Ensure default has necessary keys for composable and initial render
    default: () => ({ 
      name: 'Loading...', 
      closeDate: null, 
      platform: null, 
      url: null, 
      status: null, 
      platform: null, // Needed by composable
      platformScenarioId: null, // Needed by composable
      description: null,
      resolutionCriteria: null,
      scenarioType: null,
      resolutionDate: null,
      detailedData: null,
      openDate: null,
      scenarios: []
    })
  },
  // ADDED: Prop to control back button visibility
  isEmbedded: {
      type: Boolean,
      default: false // Default to false, meaning show back button unless explicitly embedded
  }
});

// Initialize stores
const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();

// ADDED: State for Share Dialog
const showShareDialog = ref(false);
const scenarioToShare = ref(null);
const origin = useRequestURL().origin;

// Fetch dynamic chance
const { scenario: scenarioRef } = toRefs(props); // Use toRefs for reactivity
const { chance, loading: loadingChance, error: errorChance, volume, status, liquidity } = useScenarioChance(scenarioRef);

// Fetch history data
const { historyData, loading: loadingHistory, error: errorHistory } = useScenarioHistory(scenarioRef);

// State for collapsible sections
const isCriteriaVisible = ref(false);
const isDetailsVisible = ref(false);
const isResolutionVisible = ref(true);
const isRelatedArticlesVisible = ref(true); // Default to visible

// Formatting Functions
const formatProbability = (prob) => {
  if (typeof prob !== 'number' || isNaN(prob)) return 'N/A'; // Handle NaN explicitly
  return `${(prob * 100).toFixed(0)}%`; // Use toFixed(0) for whole numbers
};

const formatVolume = (volume) => {
  if (typeof volume !== 'number') return 'N/A';
  // Simple formatting, consider libraries like numbro for complex cases
  return `$${volume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`; // No cents for volume
};

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    return dateString;
  }
};

// Status Styling
const statusClass = computed(() => {
  const status = props.scenario?.status?.toUpperCase();
  switch (status) {
    case 'RESOLVED':
      return 'border border-green-800 text-green-800 dark:border-green-500 dark:text-green-500';
    case 'CLOSED':
      return 'border border-red-600 text-red-600 dark:border-red-500 dark:text-red-500';
    case 'CANCELED':
      return 'border border-gray-600 text-gray-600 dark:border-gray-500 dark:text-gray-500';
    case 'OPEN':
       return 'border border-primary text-primary dark:border-yellow-500 dark:text-yellow-500';
    default:
      return 'border border-gray-600 text-gray-600 dark:border-gray-500 dark:text-gray-500';
  }
});

// --- ADDED: Bookmark & Share Logic ---
const isBookmarked = computed(() => {
    // Note: The scenario object passed as prop might have scenarioId or _id depending on source
    const scenarioId = props.scenario?.id;
    return scenarioId ? bookmarkStore.isBookmarked(scenarioId, 'scenario') : false;
});

const handleBookmark = () => {
    const scenarioId = props.scenario?.id;
    if (scenarioId) {
        bookmarkStore.toggleBookmark(scenarioId, 'scenario');
    } else {
        console.warn('[Scenario/index.vue] Cannot toggle bookmark: Scenario ID missing.');
    }
};

const handleShare = () => {
    // CORRECTED: Check for 'id' from the API response structure
    if (!props.scenario || !props.scenario.id) {
        console.warn('Cannot share scenario: missing data or id');
        return;
    }
    scenarioToShare.value = props.scenario; 
    showShareDialog.value = true;
};
// --- END ADDED ---

</script>

<style scoped>
/* Add any component-specific styles if needed */
</style>

