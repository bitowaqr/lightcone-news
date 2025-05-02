<template>
  <div 
    v-if="scenario"
    @click="selectScenario"
    class="cursor-pointer block p-4 border border-dotted border-primary bg-bg-muted/20 hover:bg-bg-muted/50 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50"
  >
    <div class="flex flex-col h-full">
      <!-- Top section: Title and Chance -->
      <div class="flex justify-between items-start mb-2">
        <!-- Title - Adjusted font size for lg -->
        <h3 class="text-base leading-tight sm:text-lg lg:text-base font-semibold text-fg line-clamp-3 mr-4 flex-1">{{ scenario.name }}</h3>
        
        <!-- Chance Display (Top Right) -->
        <div class="flex-shrink-0 text-right">
          <div v-if="loading" class="opacity-50">
            <Icon name="line-md:loading-twotone-loop" class="w-4 h-4 text-fg-muted animate-spin" />
          </div>
          <div v-else-if="error" class="opacity-60">
            <Icon name="heroicons:exclamation-circle" class="w-4 h-4 text-red-500/70" title="Error loading chance"/>
          </div>
          <div v-else-if="chance !== undefined && chance !== null" class="flex flex-col items-end">
            <span class="text-xl font-bold text-fg leading-none">{{ typeof chance === 'number' ? (chance * 100).toFixed(0) : 'N/A' }}%</span>
            <!-- Removed the small "Chance" label -->
          </div>
          <div v-else class="opacity-60">
            <Icon name="heroicons:question-mark-circle" class="w-4 h-4 text-fg-muted" title="Chance not available"/>
          </div>
        </div>
      </div>

       <!-- Platform Badge -->
       <div v-if="scenario.platform" class="mb-3">
          <span class="inline-block bg-accent-bg text-accent-text text-xs font-medium px-2 py-0.5 rounded-full">{{ scenario.platform }}</span>
        </div>
        <div v-else class="mb-3 h-[22px]"></div> <!-- Placeholder for consistent height -->

      <!-- Description Snippet -->
      <div class="text-xs sm:text-sm text-fg-muted grow">
        <p v-if="scenario.description" class="line-clamp-3 leading-snug">
          {{ scenario.description }}
        </p>
        <p v-else class="italic">No description available.</p>
      </div>
      
      <!-- Removed bottom chance display section -->

      <!-- Share/Bookmark Icons -->
      <div class="ms-auto flex space-x-1 z-10">
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
            class="w-4 h-4" 
          />
        </button>
        <!-- Share Icon -->
        <button 
          @click.prevent="handleShare" 
          class="p-1 rounded-full hover:bg-bg-subtle text-fg-muted transition-colors duration-150"
          aria-label="Share scenario"
        >
          <Icon name="heroicons:share" class="w-4 h-4" />
        </button>
      </div>

    </div>
  </div>

  <!-- Share Dialog -->
  <CommonShareDialog 
    :show="showShareDialog" 
    :scenario-url="scenarioToShare ? `${origin}/scenarios/${scenarioToShare.scenarioId}` : null"
    :scenario-title="scenarioToShare?.name"
    :article-url="null" 
    :article-title="null"
    @close="showShareDialog = false" 
  />
</template>

<script setup>
import { computed, toRefs, ref, defineEmits } from 'vue';
import { useScenarioChance } from '~/composables/useScenarioChance';
import { formatRelativeTime } from '~/utils/formatRelativeTime';
import CommonShareDialog from '~/components/common/ShareDialog.vue';
import { useRequestURL } from '#app';
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks';

// Define the emits
const emit = defineEmits(['scenario-selected']);

const props = defineProps({
  scenario: {
    type: Object,
    required: true,
    default: () => ({
       scenarioId: '', // Expect scenarioId from parent list
       _id: '', // Expect _id if coming from bookmarks
       name: 'Loading...', 
       platform: null, 
       platformScenarioId: null, 
       description: null 
    }),
  },
});

const { scenario } = toRefs(props);
// Fetch dynamic chance - the composable uses platform and platformScenarioId from the scenario prop
const { chance, loading, error } = useScenarioChance(scenario);

const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();

// --- ADDED: State for Share Dialog ---
const showShareDialog = ref(false);
const scenarioToShare = ref(null);
const origin = useRequestURL().origin;

// Function to emit the selected event
const selectScenario = () => {
    // Use scenarioId if available (consistent with list API), fallback to _id if needed
    const idToEmit = props.scenario?.scenarioId || props.scenario?._id;
    if (idToEmit) {
        emit('scenario-selected', idToEmit);
    } else {
        console.warn('[ScenarioCard] Cannot emit selection: Scenario ID missing.');
    }
};

const isBookmarked = computed(() => {
    // Use scenarioId or _id for checking bookmark status
    const scenarioId = props.scenario?.scenarioId || props.scenario?._id;
    return scenarioId ? bookmarkStore.isBookmarked(scenarioId, 'scenario') : false;
});

const handleBookmark = () => {
    const scenarioId = props.scenario?.scenarioId || props.scenario?._id;
    if (scenarioId) {
        bookmarkStore.toggleBookmark(scenarioId, 'scenario');
    } else {
        console.warn('[ScenarioCard] Cannot toggle bookmark: Scenario ID missing.');
    }
};

const handleShare = () => {
    // Use scenarioId or _id for sharing
    const scenarioId = props.scenario?.scenarioId || props.scenario?._id;
    if (!props.scenario || !scenarioId) {
        console.warn('Cannot share scenario: missing data or scenarioId');
        return;
    }
    // Pass the whole scenario object to ensure dialog has title etc.
    scenarioToShare.value = { ...props.scenario, scenarioId: scenarioId }; 
    showShareDialog.value = true;
};

</script>

<style scoped>
/* Scoped styles for the card if needed */
</style> 