<template>
  <!-- Main container with desktop grid layout -->
  <div class="lg:grid lg:grid-cols-5 lg:gap-x-0 w-full grow">

    <!-- Left Column: Tabs, Filters, List, Pagination - Now uses Flexbox for sticky header -->
    <div 
      :class="{
          'lg:col-span-2 lg:flex lg:flex-col lg:h-[calc(100vh-114px)] px-4 lg:px-0 lg:border-r lg:border-bg-muted': true, // Use calc() for height
          'hidden lg:flex': !isDesktop && (rightColumnMode === 'detail' || rightColumnMode === 'requestForm' || rightColumnMode === 'requestSuccess'), // Hide if showing detail OR form OR success on mobile
          'flex flex-col': isDesktop // Ensure flex direction on desktop
      }"
    >
      <!-- Left Column Header (Sticky Part) -->
      <div class="lg:px-4 pt-8 flex-shrink-0 bg-bg z-10 border-b border-bg-muted pb-2">
          <div class="flex justify-between items-center mb-4">
            <h1 class="text-2xl font-bold text-fg">Scenarios</h1> 
             <!-- Request Button -->
             <button 
                @click="showRequestForm"
                class="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1 rounded hover:opacity-90 transition-opacity duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
              >
                 <Icon name="heroicons:plus-circle-20-solid" class="w-5 h-5"/>
                 Request
             </button>
          </div>
          <!-- REMOVED Description Paragraph -->
          <!-- <p class="text-fg-muted mb-6">Browse prediction market scenarios linked to news stories.</p> -->

          <!-- Tab Navigation -->
          <div class="mb-3">
            <nav class="-mb-px flex space-x-6" aria-label="Tabs">
              <button 
                @click="setActiveTab('all')"
                :class="[
                  'whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg hover:border-gray-300'
                ]"
              >
                All Scenarios
                <span v-if="scenariosData?.pagination?.total > 0" class="ml-1.5 inline-block bg-primary/10 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {{ scenariosData.pagination.total }}
                </span>
              </button>
              <button 
                v-if="authStore.isAuthenticated" 
                @click="setActiveTab('bookmarks')"
                :class="[
                  'whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === 'bookmarks' ? 'border-primary text-primary' : 'border-transparent text-fg-muted hover:text-fg hover:border-gray-300'
                ]"
              >
                My Bookmarks
                <span v-if="bookmarkStore.bookmarkedScenarios?.length > 0" class="ml-1.5 inline-block bg-primary/10 text-primary text-xs font-semibold px-1.5 py-0.5 rounded-full">
                  {{ bookmarkStore.bookmarkedScenarios.length }}
                </span>
              </button>
            </nav>
          </div>

          <!-- Filters, Search, and Sort Controls (Reduced margin) -->
           <div v-show="activeTab === 'all'" class="mb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3 items-end">
              <!-- Search Input -->
              <div class="md:col-span-2 lg:col-span-1">
                <label for="search" class="block text-xs font-medium text-fg-muted mb-1">Search</label>
                <input 
                  type="text" 
                  id="search" 
                  v-model="searchQuery" 
                  @input="debouncedFetchScenarios" 
                  placeholder="Enter keywords..."
                  class="w-full text-sm px-3 py-1.5 border border-bg-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-bg text-fg"
                />
              </div>

              <!-- Status Filter -->
              <div>
                <label for="status" class="block text-xs font-medium text-fg-muted mb-1">Status</label>
                <select 
                  id="status" 
                  v-model="selectedStatus" 
                  @change="fetchScenarios(1)" 
                  class="w-full text-sm px-3 py-1.5 border border-bg-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-bg text-fg"
                >
                  <option value="OPEN">Open</option>
                  <option value="CLOSED">Closed</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="ALL">All Statuses</option>
                  <option value="CANCELED">Canceled</option>
                  <option value="UPCOMING">Upcoming</option>
                </select>
              </div>

              <!-- Sort Dropdown -->
              <div>
                <label for="sort" class="block text-xs font-medium text-fg-muted mb-1">Sort By</label>
                <select 
                  id="sort" 
                  v-model="selectedSort" 
                  @change="fetchScenarios(1)" 
                  class="w-full text-sm px-3 py-1.5 border border-bg-muted rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary bg-bg text-fg"
                >
                  <option value="newest">Newest Created</option>
                  <option value="oldest">Oldest Created</option>
                  <option value="recently_updated">Recently Updated</option>
                  <option value="closing_soon">Closing Soon</option>
                  <option value="highest_volume">Highest Volume</option>
                  <option value="highest_liquidity">Highest Liquidity</option>
                </select>
              </div>
           </div>
      </div> <!-- End Left Column Header -->

      <!-- Left Column Content (Scrollable Part) -->
      <div 
        ref="scrollContainerRef" 
        @scroll="handleScroll" 
        class="flex-grow overflow-y-auto pb-8 w-full "
      >
           <!-- Main Scenarios List & Pagination (for 'All' tab) -->
           <div v-if="activeTab === 'all'" class="pt-2">
               <!-- Initial Loading/Error/Empty States (Based on allScenarios now) -->
               <div v-if="pending && allScenarios.length === 0" class="text-center py-12">
                  <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-fg-muted animate-spin inline-block" /> <p class="mt-2 text-fg-muted">Loading scenarios...</p>
                  <div class="w-full max-w-[95vw]"></div>
               </div>
               <div v-else-if="error && allScenarios.length === 0" class="text-center py-12">
                    <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 text-red-500 inline-block" /> <p class="mt-2 text-red-600">Error loading scenarios...</p>
                    <button @click="refreshPageOne" class="mt-4 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark">Retry</button>
                    <div class="w-full max-w-[95vw]"></div>
               </div>
               <div v-else-if="!pending && allScenarios.length === 0" class="text-center py-12 grid grid-cols-1 gap-1">
                  <div class="flex flex-col items-center justify-center">
                        <Icon name="heroicons:magnifying-glass" class="w-8 h-8 text-fg-muted inline-block" /> <p class="mt-2 text-fg-muted">No scenarios found matching filters.</p>
                        <div class="w-full max-w-[95vw]"></div>
                  </div>
               </div>
               
               <!-- Scenario Cards (Iterate over allScenarios) -->
               <div v-else class="grid grid-cols-1 gap-1">
                <div class="w-full max-w-[95vw]"></div>
                    <ScenarioCard 
                        v-for="scenario in allScenarios" 
                        :key="scenario.scenarioId" 
                        :scenario="scenario"
                        @scenario-selected="handleScenarioSelected" 
                    />
               </div>
               
               <!-- Infinite Scroll Loading Indicator -->
               <div v-if="pending && currentPage > 1" class="text-center py-4">
                  <Icon name="line-md:loading-twotone-loop" class="w-6 h-6 text-fg-muted animate-spin inline-block" />
               </div>

               <!-- ADDED: End of List Indicator -->
               <div v-if="!pending && scenariosData?.pagination && currentPage >= scenariosData.pagination.totalPages && allScenarios.length > 0" 
                    class="text-center text-xs font-medium text-fg-muted pt-6 pb-2 opacity-60">
                    You've reached the end.
               </div>

           </div>

            <!-- Bookmarked Scenarios List (for 'Bookmarks' tab) -->
           <div v-if="activeTab === 'bookmarks'" class="pt-2">
                 <div v-if="bookmarkStore.isLoading" class="text-center py-12">
                    <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-fg-muted animate-spin inline-block" /> <p class="mt-2 text-fg-muted">Loading bookmarks...</p>
                </div>
                <div v-else-if="!bookmarkStore.bookmarkedScenarios?.length" class="text-center py-12">
                    <Icon name="heroicons:bookmark-slash" class="w-8 h-8 text-fg-muted inline-block" />
                    <p class="mt-2 text-fg-muted">You haven't bookmarked any scenarios yet.</p>
                </div>
                <div v-else class="grid grid-cols-1 gap-1 w-full max-w-[95vw]">
                    <ScenarioCard 
                        v-for="scenario in bookmarkStore.bookmarkedScenarios" 
                        :key="scenario.scenarioId" 
                        :scenario="scenario" 
                        @scenario-selected="handleScenarioSelected" 
                    />
                </div>
           </div>
      </div> <!-- End Left Column Content -->

    </div> <!-- End Left Column -->

    <!-- Right Column / Mobile Detail View -->
    <div 
      :class="{
          'lg:col-span-3 lg:overflow-y-auto lg:max-h-[calc(100vh-130px)]': true, // Use calc() for max-height
          'fixed inset-0 bg-bg z-50 overflow-y-auto lg:static lg:z-auto lg:bg-transparent': !isDesktop && (rightColumnMode === 'detail' || rightColumnMode === 'requestForm' || rightColumnMode === 'requestSuccess'), 
          'hidden': rightColumnMode === 'placeholder' && !isDesktop  
      }"
    >
       <!-- Mobile Header with Back Button -->
      <div v-if="!isDesktop && (rightColumnMode === 'detail' || rightColumnMode === 'requestForm' || rightColumnMode === 'requestSuccess')" 
           class="sticky top-0 z-10 bg-bg/80 backdrop-blur-sm p-2 border-b border-bg-muted flex justify-between items-center">
          <!-- Back Button -->
          <button @click="closeRightColumn" class="flex items-center text-sm text-fg-muted hover:text-primary">
              <Icon name="heroicons:arrow-left-20-solid" class="w-5 h-5 mr-1" />
              {{ rightColumnMode === 'requestSuccess' ? 'Close' : 'Back to List' }}
          </button>
           <!-- Title reflecting current view -->
           <span class="text-sm font-medium text-fg-muted">
               {{ rightColumnMode === 'detail' ? 'Scenario Details' : (rightColumnMode === 'requestForm' ? '' : 'Request Submitted') }}
           </span>
            <!-- Placeholder for potential actions -->
           <div class="w-16"></div> 
      </div>
      
       <!-- Desktop Placeholder -->
      <div v-if="isDesktop && rightColumnMode === 'placeholder'" class="hidden lg:flex h-full items-center justify-center text-center text-fg-muted px-6">
        <p>Select a scenario or request a new one.</p>
      </div>

      <!-- Detail Loading/Error/Content -->
      <div class="">
          <div v-if="rightColumnMode === 'detail' && detailPending" class="text-center py-10">
              <Icon name="line-md:loading-twotone-loop" class="w-8 h-8 text-fg-muted animate-spin inline-block" />
          </div>
          <div v-else-if="rightColumnMode === 'detail' && detailError" class="text-center py-10 text-red-500">
              <Icon name="heroicons:exclamation-triangle" class="w-8 h-8 inline-block mb-2" />
              <p>Error loading scenario details.</p>
          </div>
          <ScenarioDetail v-else-if="rightColumnMode === 'detail' && selectedScenarioData" :scenario="selectedScenarioData" :is-embedded="true" />
          
          <!-- Request Form View -->
          <template v-if="rightColumnMode === 'requestForm'">
              <!-- Optionally pass article context if available -->
               <ScenarioRequestForm
                 :article-id="contextArticleId"
                 :article-title="contextArticleTitle"
                 :is-desktop="isDesktop" 
                 @submitted="handleRequestSubmitted"
                 @cancelled="handleRequestCancelled"
                 @scenario-created="handleScenarioCreated"
               />
          </template>

          <!-- ADDED: Success View -->
          <template v-if="rightColumnMode === 'requestSuccess'">
              <div class="text-center px-4 py-8 my-8">
                <Icon name="heroicons:check-circle-solid" class="w-16 h-16 text-primary-500 mx-auto mb-4" />
                <h2 class="text-2xl font-semibold mb-3 text-fg">Request Submitted!</h2>
                <p class="text-lg text-fg-muted mb-6">
                  {{ successMessageContent || 'Thank you for your forecast request.' }}
                </p>
                <!-- ADDED: Mobile-only Primary Go Back Button -->
                <button
                   v-if="!isDesktop" 
                   @click="closeRightColumn"
                   type="button"
                   class="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
               >
                   Go Back to List
               </button>
              </div>
          </template>
      </div>

    </div> <!-- End Right Column / Mobile Detail View -->

  </div> <!-- End Main container -->
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks';
import { useFetch, useRouter, useRoute } from '#app';

// import ScenarioTeaser from '~/components/scenario/Teaser.vue'; // No longer needed here
import ScenarioCard from '~/components/scenario/Card.vue'; // Import the new Card component
import { debounce } from 'lodash-es'; // Using lodash-es for tree-shaking
import ScenarioDetail from '~/components/scenario/index.vue'; // Import detail component
import ScenarioRequestForm from '~/components/scenario/RequestForm.vue'; // Import the new form

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore(); // Added auth store
const bookmarkStore = useBookmarkStore(); // Added bookmark store

// --- State for selected scenario, layout, AND TABS ---
const selectedScenarioId = ref(null);
const isDesktop = ref(false); // Default to mobile
const activeTab = ref('all'); // Default to 'all' tab
const rightColumnMode = ref('placeholder'); // 'placeholder', 'detail', 'requestForm', 'requestSuccess'

// ADDED: Ref for the scrollable container
const scrollContainerRef = ref(null);

// Context for Request Form (optional)
const contextArticleId = ref(null);
const contextArticleTitle = ref(null);

// ADDED: State for combined scenarios list
const allScenarios = ref([]);

// Function to handle scenario selection from Card component
const handleScenarioSelected = (scenarioId) => {
  // console.log("Scenario selected:", scenarioId);
  // Clear potential article context when selecting from list
  contextArticleId.value = null;
  contextArticleTitle.value = null;

  if (!isDesktop.value) {
    // On mobile, push state to URL for back button handling
    // Explicitly preserve the tab if it's 'bookmarks'
    const targetQuery = { 
      ...route.query, 
      view: 'detail', 
      id: scenarioId 
    };
    if (activeTab.value === 'bookmarks') {
      targetQuery.tab = 'bookmarks'; 
    } else {
      // Remove tab param if navigating from 'all' to avoid potential conflicts
      // or ensure it's not present if it shouldn't be.
      delete targetQuery.tab; 
    }
    router.push({ query: targetQuery });

  } else {
    // On desktop, just update the state directly
    selectedScenarioId.value = scenarioId;
    rightColumnMode.value = 'detail';
  }
};

// Function to handle closing the detail view (used by mobile back button/link)
const closeRightColumn = () => {
    const { view, id, articleId, articleTitle, ...restQuery } = route.query; // Remove view/id/context
    rightColumnMode.value = 'placeholder'; // Set mode explicitly for desktop
    selectedScenarioId.value = null;
    successMessageContent.value = ''; // Clear success message
    router.push({ query: restQuery }); // Update URL for mobile/history
};

// Function to show request form
const showRequestForm = () => {
    // console.log("Showing request form");
    // Clear potential article context when requesting generically
    contextArticleId.value = null;
    contextArticleTitle.value = null;
    if (!isDesktop.value) {
        router.push({ query: { ...route.query, view: 'request' } });
    } else {
        selectedScenarioId.value = null;
        rightColumnMode.value = 'requestForm';
    }
};

// --- Screen Size Detection ---
const checkScreenSize = () => {
  const previouslyDesktop = isDesktop.value;
  isDesktop.value = window.innerWidth >= 1024;
  
  // If the viewport size changed across the breakpoint, update listeners
  if (previouslyDesktop !== isDesktop.value) {
      // console.log(`Resized: ${previouslyDesktop ? 'Desktop' : 'Mobile'} -> ${isDesktop.value ? 'Desktop' : 'Mobile'}. Re-attaching scroll listener.`);
      detachScrollListener(); 
      nextTick(() => {
          attachScrollListener(); 
      });
  }
};

// --- Scroll Listener Management --- 
let scrollListenerTarget = null; 

const attachScrollListener = () => {
    if (scrollListenerTarget) {
        // console.warn("Scroll listener already attached.");
        return;
    }
    if (isDesktop.value) {
        if (scrollContainerRef.value) {
            // console.log("Attaching scroll listener to scrollContainerRef");
            scrollContainerRef.value.addEventListener('scroll', handleScroll);
            scrollListenerTarget = scrollContainerRef.value;
        } else {
            console.warn("Cannot attach scroll listener: scrollContainerRef not found.");
        }
    } else {
        // console.log("Attaching scroll listener to window");
        window.addEventListener('scroll', handleScroll);
        scrollListenerTarget = window;
    }
};

const detachScrollListener = () => {
    if (scrollListenerTarget) {
        // console.log("Detaching scroll listener from:", scrollListenerTarget === window ? 'window' : 'scrollContainerRef');
        scrollListenerTarget.removeEventListener('scroll', handleScroll);
        scrollListenerTarget = null;
    } 
};

// --- Component Lifecycle: Mounting and Unmounting --- 
onMounted(() => {
  checkScreenSize(); 
  window.addEventListener('resize', checkScreenSize);
  attachScrollListener(); 
  
  // Sync state from URL on initial load
  const initialTab = route.query.tab;
  if (authStore.isAuthenticated && initialTab === 'bookmarks') {
      activeTab.value = 'bookmarks';
  } else {
      activeTab.value = 'all'; // Default to all if not authenticated or tab is different
  }

  // Sync view/detail state
  if (route.query.view === 'detail' && route.query.id) {
      selectedScenarioId.value = route.query.id;
      rightColumnMode.value = 'detail';
  } else if (route.query.view === 'request') {
      rightColumnMode.value = 'requestForm';
      selectedScenarioId.value = null;
      contextArticleId.value = route.query.articleId || null;
      contextArticleTitle.value = route.query.articleTitle || null;
  } else if (route.query.view === 'success') { 
       rightColumnMode.value = 'requestSuccess'; 
       selectedScenarioId.value = null;
  } else {
       // Only reset to placeholder if not coming from a specific tab link
       if (!initialTab) { 
           rightColumnMode.value = 'placeholder';
           selectedScenarioId.value = null;
       }
  }
  if (authStore.isAuthenticated) {
    // Ensure bookmarks are fetched if starting on that tab or just generally logged in
    bookmarkStore.fetchBookmarks();
  }

  // Ensure initial fetch happens 
  if (queryParams.value) {
      refresh(); 
  }
});
onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
  detachScrollListener(); 
});

// --- State for Filters, Pagination, Search --- 
const searchQuery = ref(route.query.q || ''); 
const effectiveSearchQuery = ref(route.query.q || ''); 
const selectedStatus = ref(route.query.status || 'OPEN');
const selectedSort = ref(route.query.sort || 'newest');
const currentPage = ref(parseInt(route.query.page) || 1);
const successMessageContent = ref('');

// --- Computed Query Params for API --- 
const queryParams = computed(() => {
  const params = {
    page: currentPage.value, 
    status: selectedStatus.value,
    sort: selectedSort.value,
  };
  if (effectiveSearchQuery.value) {
    params.q = effectiveSearchQuery.value;
  }
  Object.keys(params).forEach(key => {
    if (params[key] === '' || params[key] === null || params[key] === undefined) {
      delete params[key];
    }
  });
  return params;
});

// --- Fetching Scenario Data (useFetch) --- 
const { data: scenariosData, pending, error, refresh } = useFetch('/api/scenarios', {
  query: queryParams, 
  watch: [queryParams], 
  key: 'scenariosFeed', 
  immediate: false, 
});

// --- NEW: Method to Set Active Tab and Update Route ---
const setActiveTab = (newTab) => {
    if (activeTab.value === newTab) return; // Avoid unnecessary updates
    
    activeTab.value = newTab;
    
    // Update URL query
    const { tab, ...restQuery } = route.query; // Remove existing tab param
    const newQuery = { ...restQuery };
    if (newTab === 'bookmarks') {
        newQuery.tab = 'bookmarks';
    } 
    // No need to explicitly add tab=all, absence implies 'all'
    
    router.push({ query: newQuery });
};

// --- Watcher to handle scenariosData updates --- 
watch(scenariosData, (newData) => {
    if (newData?.scenarios) {
        const fetchedPage = newData.pagination?.page || 1;
        // console.log(`Watcher: Received data for page ${fetchedPage}. Current allScenarios length: ${allScenarios.value.length}`);
        
        if (fetchedPage === 1) {
            // console.log('Watcher: Replacing allScenarios with page 1 data.');
            allScenarios.value = newData.scenarios;
        } else {
            // console.log(`Watcher: Appending ${newData.scenarios.length} scenarios to allScenarios.`);
            // Avoid duplicates just in case of race conditions or API quirks
            const existingIds = new Set(allScenarios.value.map(s => s.scenarioId));
            const newUniqueScenarios = newData.scenarios.filter(s => !existingIds.has(s.scenarioId));
            allScenarios.value.push(...newUniqueScenarios);
        }
    } else if (newData === null && !pending.value) {
        // console.log('Watcher: scenariosData is null and not pending.');
    }
}, { immediate: true }); 

// --- Watch Auth State --- 
watch(() => authStore.isAuthenticated, (isAuth, wasAuth) => {
    if (isAuth && !wasAuth) {
        // console.log('[ScenariosPage] User authenticated, fetching bookmarks...');
        bookmarkStore.fetchBookmarks();
    } else if (!isAuth && wasAuth) {
        // console.log('[ScenariosPage] User logged out.');
        // UPDATED: Use setActiveTab to switch back to 'all' and update URL
        if (activeTab.value === 'bookmarks') {
            setActiveTab('all'); 
        }
    }
});

// --- Function to fetch scenarios --- 
const fetchScenarios = async (page = currentPage.value) => {
  // console.log(`Fetching scenarios list page: ${page}, query:`, queryParams.value);
  currentPage.value = page; 
  
  // Update URL only with filter/sort/search changes, not pagination
  const { page: queryPage, ...restQuery } = route.query;
  const queryToPush = { ...restQuery }; 
  if (selectedStatus.value !== 'OPEN') queryToPush.status = selectedStatus.value;
  if (selectedSort.value !== 'newest') queryToPush.sort = selectedSort.value;
  if (effectiveSearchQuery.value) queryToPush.q = effectiveSearchQuery.value;
  
  if (JSON.stringify(queryToPush) !== JSON.stringify(restQuery)) {
      // console.log('Pushing filter/sort/search changes to URL:', queryToPush);
      router.push({ query: queryToPush }); 
  }
  
  // Triggering useFetch is handled by the queryParams watcher
};

// --- Debounced Search Handler --- 
const debouncedFetchScenarios = debounce(() => {
  const query = searchQuery.value.trim();
  const queryLength = query.length;
  if ((queryLength === 0 || queryLength >= 3) && effectiveSearchQuery.value !== query) {
    // console.log(`Updating effective search query to: "${query}"`);
    effectiveSearchQuery.value = query;
    currentPage.value = 1; // IMPORTANT: Reset to page 1 for new search/filter
    
    const { page, ...restQuery } = route.query;
    const queryToPush = { ...restQuery, q: effectiveSearchQuery.value || undefined };
    if (!queryToPush.q) delete queryToPush.q;
    // console.log('Pushing search query changes to URL:', queryToPush);
    router.push({ query: queryToPush });
  } else {
    // console.log(`Search input changed to "${query}", but not triggering API fetch.`);
  }
}, 700);

// Helper to refresh page one
const refreshPageOne = () => {
    // console.log("Refreshing page 1...");
    currentPage.value = 1;
    refresh(); 
};

// --- Scroll Handler --- 
const handleScroll = debounce((event) => {
    let scrollHeight, scrollTop, clientHeight;
    const threshold = 300; 

    if (scrollListenerTarget === window) {
        scrollHeight = document.documentElement.scrollHeight;
        scrollTop = window.scrollY;
        clientHeight = window.innerHeight; 
    } else if (scrollListenerTarget instanceof Element) {
        const element = event.target;
        scrollHeight = element.scrollHeight;
        scrollTop = element.scrollTop;
        clientHeight = element.clientHeight;
    } else {
        return; 
    }

    const nearBottom = scrollHeight - scrollTop - clientHeight < threshold;

    if (nearBottom) {
        if (activeTab.value === 'all') {
             // console.log(`Reached near bottom! Target: ${scrollListenerTarget === window ? 'window' : 'element'}`);
             
             const pagination = scenariosData.value?.pagination;
             if (pagination && !pending.value && currentPage.value < pagination.totalPages) {
                 // console.log(`Triggering fetch for next page (${currentPage.value + 1})...`);
                 fetchScenarios(currentPage.value + 1);
             } else if (pending.value) {
                 // console.log('Near bottom, but a fetch is already pending.');
             } else if (pagination && currentPage.value >= pagination.totalPages) {
                 // console.log('Near bottom, but already on the last page.');
             }
        }
    }
}, 200); 

// --- Watch Route Query Changes --- 
watch(() => route.query, (newQuery, oldQuery) => {
    // Update filter/sort/search state from URL 
    const newQueryQ = newQuery.q || '';
    if (searchQuery.value !== newQueryQ) searchQuery.value = newQueryQ;
    if (effectiveSearchQuery.value !== newQueryQ) effectiveSearchQuery.value = newQueryQ;
    
    if (selectedStatus.value !== (newQuery.status || 'OPEN')) selectedStatus.value = newQuery.status || 'OPEN';
    if (selectedSort.value !== (newQuery.sort || 'newest')) selectedSort.value = newQuery.sort || 'newest';

    // ADDED: Update activeTab based on query param
    const newTab = newQuery.tab;
    if (authStore.isAuthenticated && newTab === 'bookmarks') {
        if (activeTab.value !== 'bookmarks') {
           activeTab.value = 'bookmarks';
        }
    } else {
        // If tab is not bookmarks or user isn't logged in, switch to 'all'
        if (activeTab.value !== 'all') {
           activeTab.value = 'all';
        }
    }

    // Update right column mode 
    const newMode = newQuery.view === 'detail' ? 'detail' 
                  : (newQuery.view === 'request' ? 'requestForm' 
                  : (newQuery.view === 'success' ? 'requestSuccess' : 'placeholder'));
    const newId = newQuery.view === 'detail' ? newQuery.id : null;
    
    if (rightColumnMode.value !== newMode) {
        rightColumnMode.value = newMode;
    }
    if (selectedScenarioId.value !== newId) {
        selectedScenarioId.value = newId;
    }
    
    // Update context if switching to request view
    if(newMode === 'requestForm'){
         contextArticleId.value = newQuery.articleId || null;
         contextArticleTitle.value = newQuery.articleTitle || null;
    } else if (newMode !== 'requestSuccess') { 
         contextArticleId.value = null;
         contextArticleTitle.value = null;
    }
    
}, { deep: true }); 

// --- Fetching Selected Scenario Detail --- 
const detailApiUrl = computed(() => {
    return (rightColumnMode.value === 'detail' && selectedScenarioId.value) 
           ? `/api/scenarios/${selectedScenarioId.value}` 
           : null;
});

const { 
    data: selectedScenarioData, 
    pending: detailPending, 
    error: detailError, 
    execute: fetchScenarioDetail 
} = useFetch(detailApiUrl, {
    immediate: false, 
    watch: [detailApiUrl], 
    key: 'scenarioDetail' 
});

// --- Watch activeTab --- 
watch(activeTab, (newTab) => {
    if(isDesktop.value) {
        rightColumnMode.value = 'placeholder';
        selectedScenarioId.value = null;
    } else {
        closeRightColumn();
    }
});

// --- Form Submission/Cancellation Handlers --- 
const handleRequestSubmitted = (message) => {
    // console.log('Form submitted event received:', message);
    successMessageContent.value = message;
    rightColumnMode.value = 'requestSuccess';
    selectedScenarioId.value = null; 
    if (!isDesktop.value) {
         router.push({ query: { ...route.query, view: 'success' } }); 
    }

};

const handleRequestCancelled = () => {
    // console.log('Form cancelled event received');
    closeRightColumn(); 
};

// --- ADDED: Handler for Scenario Creation Event ---
const handleScenarioCreated = (scenarioId) => {
    console.log('Scenario created event received with ID:', scenarioId);
    if (isDesktop.value) {
        // On desktop, automatically select and show the newly created scenario
        handleScenarioSelected(scenarioId);
    } else {
        // On mobile, the success message is already shown by handleRequestSubmitted
        // We don't need to automatically navigate away from the success message.
        console.log('On mobile, keeping success message visible.');
    }
};

</script>

<style scoped>
/* Styles for height/scrolling */
/* Explicit height for the scrollable content parent needed for flexbox - REMOVED, handled by calc now */
/* .lg\:flex.lg\:flex-col.lg\:h-screen { height: 100vh; } */

/* Style the scrollbar (optional, webkit browsers) */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px; /* Adjust width */
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent; /* Or a subtle background */
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: var(--color-bg-muted); /* Use theme color */
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-fg-muted); /* Slightly darker on hover */
}

</style> 