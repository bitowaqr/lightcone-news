<template>
  <div class="max-w-4xl mx-auto grow bg-article h-full pt-4 md:pt-12 lg:pt-20 w-full shadow-md">
    
    

    <!-- Loading State -->
    <div v-if="pending">Loading article {{ articleId }}...</div>



    <!-- Not Found State -->
    <div v-else-if="isNotFound  || fetchError" class="flex flex-col items-center justify-center p-8 text-center">
      <div class="mb-6">
        <Icon name="mdi:file-search-outline" class="w-16 h-16 text-fg-muted" />
      </div>
      <h2 class="text-2xl font-medium text-primary mb-3">
        {{ isNotFound ? 'Article Not Found' : 'Error Loading Article' }}
      </h2>
      <div class="text-fg-muted mb-4  max-w-[80ch]">
        <div v-if="isNotFound">
          Sorry, we couldn't find this article. It might have been moved, deleted, or never existed.
        </div>
        <div v-else class="font-mono text-sm">
          Error: {{ error.data?.message || error.message }}
        </div>
      </div>
      <button 
        @click="$router.push('/')" 
        class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors mt-2"
      >
        Browse Other Articles
      </button>
    </div>

    

    <!-- Success State -->
    <div v-else-if="articleData" >
      <Article :article-id="articleId" :article-data="articleData" />
    </div>
    

     <!-- Fallback if no data and no specific error -->
    <div v-else>
        <p>No article data available.</p>
    </div>

  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const articleId = computed(() => route.params.id);

// Fetch article data - SSR by default
// API endpoint /api/articles/{id} handles auth check internally
const { data: articleData, pending, error, refresh } = await useFetch(() => {
  const id = articleId.value;
  if (!id) {
    // If there's no valid ID (e.g., during navigation away), don't attempt to fetch
    return null;
  }
  return `/api/articles/${id}`;
}, {
  key: `article-${articleId.value}`, // Important for dynamic routes
  // lazy: false (default)
});

// Watch for authentication changes to refresh data if needed
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth && error.value && error.value.statusCode === 401) {
    console.log('Auth status changed to authenticated, refreshing article...');
    refresh();
  }
});

const requiresLogin = computed(() => !authStore.isAuthenticated && !pending.value && error.value?.statusCode === 401);
const isNotFound = computed(() => error.value?.statusCode === 404);
const fetchError = computed(() => error.value && ![401, 404].includes(error.value.statusCode));

</script>

<style scoped>
/* Add page-specific styles if needed */
</style> 