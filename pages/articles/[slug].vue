<template>
  <div class="max-w-3xl mx-auto grow bg-article h-full pt-4 md:pt-12 lg:pt-20 w-full shadow-md">
    
    

    <!-- Loading State -->
    <div v-if="pending">Loading article...</div>



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
      <Article :article-slug="articleSlug" :article-data="articleData" />
    </div>
    

     <!-- Fallback if no data and no specific error -->
    <div v-else>
        <p>No article data available.</p>
    </div>

  </div>
</template>

<script setup>
import { useAuthStore } from '~/stores/auth';
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';

const authStore = useAuthStore();
const route = useRoute();
const articleSlug = computed(() => route.params.slug);

// Fetch article data using the slug
const { data: articleData, pending, error, refresh } = await useFetch(() => {
  const slug = route.params.slug;
  console.log(`[Article Page useFetch] Factory invoked. route.params.slug: ${slug}`);
  if (!slug || slug === 'null' || slug === 'undefined') {
    console.log('[Article Page useFetch] Slug invalid, not returning a URL.');
    return;
  }
  const url = `/api/articles/${slug}`;
  console.log(`[Article Page useFetch] Intending to fetch: ${url}`);
  return url;
}, {
  key: `article-${route.params.slug || 'initial'}`,
  watch: false,
  immediate: false
});

// Watch for authentication changes to refresh data if needed
watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth && error.value && error.value.statusCode === 401) {
    console.log('Auth status changed to authenticated, attempting article refresh...');
    if (route.params.slug) {
        refresh();
    }
  }
});

// Watch for route slug changes to manually refresh
watch(
  () => route.params.slug,
  (newSlug) => {
    if (newSlug && (typeof newSlug === 'string')) {
      console.log(`[Article Page] Watcher: route.params.slug changed to ${newSlug}, calling refresh()...`);
      refresh();
    } else {
      console.log(`[Article Page] Watcher: route.params.slug changed to invalid (${newSlug}), NOT refreshing.`);
    }
  },
  { immediate: true }
);

const requiresLogin = computed(() => !authStore.isAuthenticated && !pending.value && error.value?.statusCode === 401);
const isNotFound = computed(() => error.value?.statusCode === 404);
const fetchError = computed(() => !pending.value && error.value && ![401, 404].includes(error.value.statusCode));

</script>

<style scoped>
/* Add page-specific styles if needed */
</style> 