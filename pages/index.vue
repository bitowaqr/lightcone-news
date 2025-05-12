<template>
  <!-- Updated main container for responsive grid -->
  <div class="md:grid md:grid-cols-5 md:gap-x-2 lg:gap-x-4 max-w-screen-xl mx-auto">

    <!-- Main Content Column (Articles) -->
    <div class="md:col-span-3">
      <!-- Loading State -->
      <CommonWelcomeBanner />
      <div v-if="pending && allTeaserGroups.length === 0">Loading newsfeed...</div>

      <!-- Fetch Error State -->
      <div v-else-if="fetchError && allTeaserGroups.length === 0">
        <p class="text-red-600">Error loading newsfeed: {{ error.data?.message || error.message }}. Please try again later.</p>
      </div>


      <!-- Success State - Article Teasers -->
      <div v-else-if="allTeaserGroups.length > 0" class="">
          <!-- Start Inlined TeaserFeed -->
            <div class="flex flex-col pb-4 pt-2 md:pt-4">
              <template v-for="(group, index) in allTeaserGroups" :key="group.groupId">
                <div 
                  :id="`article-group-${group.groupId}`"
                  :class="{
                  'border-b border-dotted border-fg-muted': index < allTeaserGroups.length - 1, 
                  'pt-2': true, 
                  }">

                  <ArticleTeaser 
                    :group="group"
                    :layoutOption="'vertical'"  
                    class="" 
                  />
                </div>
                <WelcomeBannerInside v-if="index === 4" class="my-6 md:my-8" />
              </template>
            </div>

            <!-- Load More Button -->
            <div v-if="currentPaginationData?.hasMore" class="flex justify-center pb-6">
              <button 
                @click="loadMoreArticles" 
                :disabled="loadingMore"
                class="inline-flex items-center px-4 py-1.5 border border-primary text-sm font-medium rounded-md text-primary bg-transparent hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon 
                  v-if="loadingMore" 
                  name="line-md:loading-twotone-loop" 
                  class="w-5 h-5 mr-2 animate-spin" 
                />
                {{ loadingMore ? 'Loading...' : 'Load 5 More Articles' }}
              </button>
            </div>

            <!-- End of Feed Message -->
            <div v-else-if="allTeaserGroups.length > 0 && currentPaginationData && !currentPaginationData.hasMore" class="text-center pt-2 pb-10 text-fg-muted">
              <Icon name="heroicons:check-circle" class="w-6 h-6 mx-auto opacity-50" />
               <p class="text-sm font-medium opacity-50">End of the feed.</p>
            </div>
          
      </div>

       <!-- Fallback if no teaser groups -->
      <div v-else-if="!pending && allTeaserGroups.length === 0">
        <p class="p-4 text-center text-fg-muted">No news stories found.</p>
      </div>

      <!-- Fallback if no data and no specific error -->
      <div v-else-if="!pending && !newsfeedPageResult"> <!-- Check newsfeedPageResult for initial no-data -->
        <p class="p-4 text-center text-fg-muted">No newsfeed data available.</p>
      </div>
    </div>

    <!-- UPDATED: Unified Sidebar Container -->
    <div 
      class="hidden md:block md:col-span-2 
             sticky top-12 lg:h-[calc(100vh-160px)] overflow-y-auto p-4"
    >
        <!-- Bookmarked Scenarios Section (Inside Scrollable Container) -->
        <div 
          v-if="authStore.isAuthenticated" 
          class="mb-6" 
        >
          <h2 class="text-base font-semibold text-fg mb-3 pb-2 border-b border-bg-muted">My Bookmarked Forecasts</h2>
          <!-- Loading State -->
          <div v-if="bookmarkStore.isLoading" class="text-center py-4">
             <Icon name="line-md:loading-twotone-loop" class="w-6 h-6 text-fg-muted animate-spin inline-block" />
          </div>
          <!-- Bookmarks List -->
          <div v-else-if="bookmarkStore.bookmarkedScenarios?.length > 0" class="flex flex-col gap-1">
              <ScenarioTeaser 
                  v-for="scenario in bookmarkStore.bookmarkedScenarios.slice(0, 5)" 
                  :key="scenario.scenarioId" 
                  :scenario="scenario" 
               />
               <!-- View All Link -->
               <NuxtLink 
                 v-if="bookmarkStore.bookmarkedScenarios.length > 5" 
                 to="/scenarios?tab=bookmarks"
                 class="text-xs text-primary hover:underline mt-1 block pl-1"
               >
                 View all ({{ bookmarkStore.bookmarkedScenarios.length }})
              </NuxtLink>
          </div>
          <!-- No Bookmarks Message -->
          <div v-else class="text-sm text-fg-muted text-center py-4">
            No bookmarked forecasts yet.
          </div>
        </div>

        <!-- Featured Scenarios Section (Inside Scrollable Container) -->
        <div> 
          <!-- Loading indicator (Simplified - shows if main feed loads slow) -->
          <div v-if="pending && allTeaserGroups.length === 0" class="text-center py-4"> 
              <Icon name="line-md:loading-twotone-loop" class="w-6 h-6 text-fg-muted animate-spin inline-block" />
          </div> 
          <!-- Content -->
          <div v-else-if="newsfeedPageResult?.featuredScenarios?.length > 0">
           <h2 class="text-base font-semibold text-fg mb-3 pb-2 border-b border-bg-muted">Featured Forecasts</h2>
            <div class="flex flex-col gap-1">
               <ScenarioTeaser 
                  v-for="scenario in newsfeedPageResult.featuredScenarios" 
                  :key="scenario.scenarioId" 
                  :scenario="scenario" 
               />
            </div>
          </div>
          <!-- Empty State -->
         <div v-else-if="!pending">
           <p class="text-sm text-fg-muted text-center pt-4">No related forecasts found for the current news.</p>
         </div>
        </div>
    </div>

  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick, watch, watchEffect } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks';
import { useReadArticlesStore } from '~/stores/readArticlesStore';
import ArticleTeaser from '~/components/article/Teaser.vue';
import ScenarioTeaser from '~/components/scenario/Teaser.vue';
import WelcomeBannerInside from '~/components/common/WelcomeBannerInside.vue';

const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();
const readArticlesStore = useReadArticlesStore();

const currentPage = ref(1);
const loadingMore = ref(false);
const allTeaserGroups = ref([]);
const currentPaginationData = ref(null);
const restoredFromSessionThisMount = ref(false); // Flag for session restoration

const NEWSFEED_SCROLL_KEY = 'newsfeedScrollPosition';
const NEWSFEED_PAGE_KEY = 'newsfeedCurrentPage';
const NEWSFEED_GROUPS_KEY = 'newsfeedAllTeaserGroups';
const NEWSFEED_PAGINATION_DATA_KEY = 'newsfeedPaginationData';

const { data: newsfeedPageResult, pending, error, refresh } = useFetch('/api/newsfeed', {
  key: 'newsfeedPageData', // Consider changing the key if it was specific to /newsfeed page instance
  query: computed(() => ({ page: currentPage.value })),
  immediate: false,
});

watch(newsfeedPageResult, (newResult) => {
  if (newResult && newResult.teaserGroups) {
    if (loadingMore.value) {
      const existingIds = new Set(allTeaserGroups.value.map(g => g.groupId));
      const newUniqueGroups = newResult.teaserGroups.filter(g => !existingIds.has(g.groupId));
      allTeaserGroups.value.push(...newUniqueGroups);
    } else if (currentPage.value === 1 && !restoredFromSessionThisMount.value) {
      allTeaserGroups.value = [...newResult.teaserGroups];
    }
    currentPaginationData.value = newResult.pagination;
  } else if (newResult === null && !pending.value) {
    if (loadingMore.value || currentPage.value > 1) {
      currentPaginationData.value = { ...(currentPaginationData.value || {}), hasMore: false };
    }
  }
}, { deep: true });

const fetchError = computed(() => error.value && error.value.statusCode !== 401);

const loadMoreArticles = async () => {
  if (loadingMore.value || !(currentPaginationData.value?.hasMore)) return;
  loadingMore.value = true;
  let lastVisibleArticleGroupId = null;
  if (allTeaserGroups.value.length > 0) {
    lastVisibleArticleGroupId = allTeaserGroups.value[allTeaserGroups.value.length - 1].groupId;
  }
  currentPage.value++; 
  try {
    await refresh(); 
    await nextTick();
    if (lastVisibleArticleGroupId) {
      const elementId = `article-group-${lastVisibleArticleGroupId}`;
      const lastVisibleArticleElement = document.getElementById(elementId);
      if (lastVisibleArticleElement) {
        lastVisibleArticleElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } catch (err) {
    console.error('Error loading more articles:', err);
    currentPage.value--;
  } finally {
    loadingMore.value = false;
  }
};

onBeforeRouteLeave(() => {
  sessionStorage.setItem(NEWSFEED_SCROLL_KEY, window.scrollY.toString());
  sessionStorage.setItem(NEWSFEED_PAGE_KEY, currentPage.value.toString());
  sessionStorage.setItem(NEWSFEED_GROUPS_KEY, JSON.stringify(allTeaserGroups.value));
  if (currentPaginationData.value) {
    sessionStorage.setItem(NEWSFEED_PAGINATION_DATA_KEY, JSON.stringify(currentPaginationData.value));
  }
});

onMounted(async () => {
  restoredFromSessionThisMount.value = false;

  const savedPage = sessionStorage.getItem(NEWSFEED_PAGE_KEY);
  const savedGroups = sessionStorage.getItem(NEWSFEED_GROUPS_KEY);
  const savedPaginationData = sessionStorage.getItem(NEWSFEED_PAGINATION_DATA_KEY);

  if (savedPage && savedGroups) {
    try {
      const parsedPage = parseInt(savedPage, 10);
      const parsedGroups = JSON.parse(savedGroups);
      if (Array.isArray(parsedGroups) && !isNaN(parsedPage)) {
        currentPage.value = parsedPage;
        allTeaserGroups.value = parsedGroups;
        if (savedPaginationData) {
          currentPaginationData.value = JSON.parse(savedPaginationData);
        }
        if (parsedGroups.length > 0) {
          restoredFromSessionThisMount.value = true;
        }
      }
    } catch (e) {
      console.error("Error restoring newsfeed state from sessionStorage:", e);
    }
  }

  try {
    await refresh();
  } catch (e) {
    console.error("Newsfeed refresh on mount failed:", e);
  }
  
  sessionStorage.removeItem(NEWSFEED_PAGE_KEY);
  sessionStorage.removeItem(NEWSFEED_GROUPS_KEY);
  sessionStorage.removeItem(NEWSFEED_PAGINATION_DATA_KEY);

  if (authStore.isAuthenticated) {
    bookmarkStore.fetchBookmarks();
    readArticlesStore.loadFromLocalStorage();
  }

  const savedPositionString = sessionStorage.getItem(NEWSFEED_SCROLL_KEY);
  if (savedPositionString) {
    const savedPosition = parseInt(savedPositionString, 10);
    let unwatchScroll = null;
    unwatchScroll = watchEffect(() => {
      const groupsReady = allTeaserGroups.value.length > 0 || savedPosition === 0;
      const dataFetchedOrRestored = !pending.value || restoredFromSessionThisMount.value;

      if (groupsReady && dataFetchedOrRestored) {
        nextTick(() => {
          window.scrollTo(0, savedPosition);
          sessionStorage.removeItem(NEWSFEED_SCROLL_KEY);
        });
        if (typeof unwatchScroll === 'function') unwatchScroll();
      }
    });
  }
});

watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    readArticlesStore.loadFromLocalStorage();
  } else {
    readArticlesStore.readArticleIds = new Set();
    readArticlesStore.hasLoadedFromStorage = false;
  }
});

</script>

<style scoped>
.sticky {
  position: sticky;
}
.top-20 {
  top: 80px;
}
</style>

