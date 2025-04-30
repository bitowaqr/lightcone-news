<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6 text-primary">My Bookmarks</h1>

    <!-- Loading State -->
    <div v-if="isLoading">Loading bookmarks...</div>

    <!-- Error State -->
    <div v-else-if="error">Error loading bookmarks: {{ error.message }}</div>

    <!-- Empty State -->
    <div v-else-if="bookmarkedArticles.length === 0 && bookmarkedScenarios.length === 0">
      <p class="text-fg-muted italic">You haven't bookmarked any articles or scenarios yet.</p>
      <p class="mt-4">
         Find articles on the <NuxtLink to="/" class="text-primary hover:underline">Newsfeed</NuxtLink> or browse <NuxtLink to="/scenarios" class="text-primary hover:underline">Scenarios</NuxtLink> and click the bookmark icon <Icon name="heroicons:bookmark" class="inline-block w-4 h-4 text-fg-muted" /> to save them here.
      </p>
    </div>

    <!-- Content State -->
    <div v-else class="space-y-8">
      <!-- Bookmarked Articles -->
      <section v-if="bookmarkedArticles.length > 0">
        <h2 class="text-2xl font-semibold mb-4 border-b border-fg-muted pb-2">Bookmarked Articles</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6" v-if="bookmarkedArticles?.length > 0">
          <NuxtLink 
            v-for="article in bookmarkedArticles" 
            :key="article._id" 
            :to="article.slug ? `/articles/${article.slug}` : '#'" 
            class="block hover:no-underline focus:outline-none focus:ring-2 focus:ring-primary rounded"
            :aria-label="`Read article: ${article.title || 'Untitled'}`"
          >
             <div class="border border-bg-muted p-4 rounded shadow-sm h-full relative hover:border-primary transition-colors duration-150">
             

                 <h3 class="text-lg font-medium mb-1 pr-6">{{ article.title || 'Article Title Missing' }}</h3>
                 <!-- Added Published Date -->
                 <p v-if="article.publishedDate" class="text-xs text-fg-muted mb-2">
                     Updated: {{ formatRelativeTime(article.publishedDate) }}
                 </p>
                 <p class="text-sm text-fg-muted line-clamp-3 mb-1">{{ article.precis || 'Precis missing...' }}</p>
             <div class="flex justify-end">
                    <!-- Remove Button (Top Right) -->
                    <button 
                    @click.prevent="toggleArticleBookmark(article._id)" 
                    class=" bottom-1 right-1 p-1 rounded-full hover:bg-bg-subtle text-primary transition-colors duration-150 z-10" 
                    aria-label="Toggle article bookmark"
                 >
                     <!-- Icon is now solid bookmark -->
                     <Icon name="heroicons:bookmark-solid" class="w-4 h-4" />
                 </button>

                 <!-- ADDED: Share Button (Bottom Right) -->
                 <button 
                   @click.prevent="handleShare(article)"
                   class=" bottom-1 right-8 p-1 rounded-full hover:bg-bg-subtle text-fg-muted transition-colors duration-150 z-10"
                   aria-label="Share article"
                 >
                   <Icon name="heroicons:share" class="w-4 h-4" />
                 </button>
             </div>
             </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Bookmarked Scenarios -->
      <section v-if="bookmarkedScenarios?.length > 0">
        <h2 class="text-2xl font-semibold mb-4 border-b border-fg-muted pb-2">Bookmarked Scenarios</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
           <ScenarioCard 
             v-for="scenario in bookmarkedScenarios" 
             :key="scenario._id" 
             :scenario="scenario" 
           />
        </div>
      </section>
    </div>

    <!-- Share Dialog -->
    <CommonShareDialog 
      :show="showShareDialog" 
      :article-url="articleToShare ? `${origin}/articles/${articleToShare.slug}` : null"
      :article-title="articleToShare?.title"
      :scenario-url="null" 
      :scenario-title="null"
      @close="showShareDialog = false" 
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import ScenarioCard from '~/components/scenario/Card.vue';
import CommonShareDialog from '~/components/common/ShareDialog.vue';
import { useRequestURL } from '#app';
import { useBookmarkStore } from '~/stores/bookmarks';
import { useAuthStore } from '~/stores/auth'; // Needed for middleware check reassurance
import { formatRelativeTime } from '~/utils/formatRelativeTime';

// Define page meta to require authentication
// This relies on middleware/auth.global.js or a specific middleware/auth.js
// to handle the redirection if the user is not authenticated.
definePageMeta({ 
    middleware: (to, from) => {
        const authStore = useAuthStore();
        // Redirect to login if not authenticated
        // Note: auth.global.js might already handle this
        if (!authStore.isAuthenticated && authStore.status !== 'idle' && authStore.status !== 'pending') {
            console.log('[bookmarks.vue middleware] User not authenticated, redirecting to /login');
            return navigateTo('/login?redirect=' + encodeURIComponent(to.fullPath));
        }
        console.log('[bookmarks.vue middleware] User authenticated or status pending/idle.');
    }
});

const bookmarkStore = useBookmarkStore();
const isLoading = ref(false);
const error = ref(null);

// --- Dummy Data (Replace with actual data fetching later) ---
// const bookmarkedArticles = ref([]);
// const bookmarkedScenarios = ref([]);

// --- Computed properties to get data from store (Phase 3) ---
// For now, these will be empty until fetchBookmarks works
const bookmarkedArticles = computed(() => {
    // Directly use the array of full article objects from the store
    return bookmarkStore.bookmarkedArticles || [];
});
const bookmarkedScenarios = computed(() => {
    // Directly use the array of full scenario objects from the store
    return bookmarkStore.bookmarkedScenarios || [];
});

// --- Fetch data --- 
onMounted(async () => {
  isLoading.value = true;
  error.value = null;
  try {
    // Call the fetchBookmarks action (currently a placeholder)
    await bookmarkStore.fetchBookmarks();
    // In Phase 3, this fetch should populate the store, 
    // and the computed properties above will reflect the real data.
  } catch (err) {
    console.error('Error in onMounted fetchBookmarks:', err);
    error.value = err;
  } finally {
    isLoading.value = false;
  }
});

// --- State for Share Dialog ---
const showShareDialog = ref(false);
const articleToShare = ref(null);
const scenarioToShare = ref(null); // Add ref for scenario sharing later

// --- ADDED Methods ---
const toggleArticleBookmark = async (articleId) => {
  if (!articleId) return;
  console.log(`Toggling article bookmark for ID: ${articleId}`);
  try {
    // Assuming removeBookmark was already confirmed, toggle doesn't need extra confirm here
    // If we want the icon to show both states, toggle is correct.
    // If this button should ONLY remove, we stick with removeBookmark.
    // Based on replacing trash can, let's assume it should only remove for now.
    // Reverting to removeBookmark logic but keeping the icon change.
    const confirmed = window.confirm(`Are you sure you want to remove this article bookmark?`);
    if (confirmed) {
        await bookmarkStore.removeBookmark(articleId, 'article');
    }
  } catch (err) {
     console.error(`Error toggling article bookmark:`, err);
     alert(`Failed to update bookmark. Please try again.`);
  }
};

// ADDED: Share handler (placeholder)
const handleShare = (article) => {
  // Updated to use Share Dialog for articles
  if (!article || !article.slug) {
    console.warn('Cannot share article: missing data or slug');
    return;
  }
  console.log(`Opening share dialog for article: ${article.title}`);
  articleToShare.value = article;
  scenarioToShare.value = null; // Clear scenario ref
  showShareDialog.value = true;
};

// --- Methods ---
const removeBookmark = async (itemId, itemType) => {
  // Add confirmation dialog
  const confirmed = window.confirm(`Are you sure you want to remove this ${itemType}?`);
  if (confirmed) {
    console.log(`Attempting to remove ${itemType} ID: ${itemId}`);
    try {
        await bookmarkStore.removeBookmark(itemId, itemType);
        // Data should reactively update via computed properties
    } catch (err) {
        console.error(`Error removing ${itemType}:`, err);
        // Optionally show an error message to the user
        alert(`Failed to remove ${itemType}. Please try again.`);
    }
  }
};

// ADDED: Get origin for URL construction
const origin = useRequestURL().origin;

</script>

<style scoped>
/* Add any page-specific styles if needed */
</style> 