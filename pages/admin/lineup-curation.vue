<template>
  <div class="p-4 md:p-6 max-w-4xl mx-auto dark:text-gray-200">
    <h1 class="text-3xl font-bold mb-6 border-b pb-2 dark:border-gray-700 flex justify-between items-center">
      <span>Lineup Curation</span>
      <NuxtLink to="/admin" class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">&laquo; Back to Main Admin</NuxtLink>
    </h1>

    <!-- Lineup ID Input -->
    <section class="mb-6 p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <label for="lineupIdInput" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Enter Lineup ID:
      </label>
      <div class="flex space-x-3">
        <input
          id="lineupIdInput"
          v-model.trim="lineupIdInput"
          @keyup.enter="fetchStories"
          placeholder="Paste Lineup ID here"
          class="flex-grow px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        <button
          @click="fetchStories"
          :disabled="!lineupIdInput || isLoading"
          class="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {{ isLoading ? 'Loading...' : 'Load Stories' }}
        </button>
      </div>
       <p v-if="fetchError" class="mt-2 text-sm text-red-600 dark:text-red-400">Error: {{ fetchError }}</p>
    </section>

    <!-- Story Ideas List (Arrow Ordering) & Messages -->
    <ClientOnly>
      <!-- 1. Loading Indicator -->
      <div v-if="isLoading" class="text-center my-6 text-gray-500 dark:text-gray-400">Loading stories...</div>

      <!-- 2. Story List (Not loading, stories exist) -->
      <section v-else-if="!isLoading && stories.length > 0">
         <div class="flex justify-between items-center mb-3">
            <h2 class="text-xl font-semibold">Story Ideas for Lineup: <code class="text-base bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">{{ currentLineupId }}</code></h2>
            <button
               @click="saveOrder"
               :disabled="isSaving || isLoading || !stories.length"
               class="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
               {{ isSaving ? 'Saving...' : 'Save Order' }}
            </button>
         </div>
         <p v-if="saveError" class="mb-2 text-sm text-red-600 dark:text-red-400">Save Error: {{ saveError }}</p>

         <ul class="space-y-2 list-none p-0">
            <li v-for="(element, index) in stories" :key="element._id" :class="['relative p-3 border rounded dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm flex items-center space-x-3 transition-colors duration-1000 ease-out', { 'highlight-move': element._id === lastMovedStoryId }]">
              <!-- Delete Button -->
              <button
                @click="deleteStory(index)"
                class="absolute top-1 right-1 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 dark:focus:ring-offset-gray-800"
                title="Remove story"
              >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <!-- Ordering Controls (Up/Down Arrows) -->
              <div class="flex flex-col items-center justify-center w-10 text-center">
                <button
                  @click="moveStoryUp(index)"
                  :disabled="index === 0"
                  class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /></svg>
                </button>
                <span class="font-mono text-xs w-6 text-center text-gray-500 dark:text-gray-400 my-1">{{ index }}</span>
                <button
                  @click="moveStoryDown(index)"
                  :disabled="index === stories.length - 1"
                  class="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                   <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>

              <div class="flex-grow pr-4">
                 <p class="font-medium">{{ element.title }}</p>
                 <p class="text-sm text-gray-600 dark:text-gray-300 line-clamp-3" :title="element.description">{{ element.description || 'No description' }}</p>
                 <p class="text-xs text-gray-500 dark:text-gray-400">ID: {{ element._id }} | Sources: {{ element.sources?.length || 0 }} | Notes: {{ element.notes ? 'Yes' : 'No' }}</p>
              </div>
            </li>
          </ul>
      </section>

      <!-- 3. No Stories Message (Not loading, ID searched, no stories, no error) -->
       <section v-else-if="!isLoading && currentLineupId && stories.length === 0 && !fetchError" class="text-center py-10 text-gray-500 dark:text-gray-400">
          <p>No story ideas found for lineup ID: {{ currentLineupId }}</p>
      </section>

      <!-- 4. Initial Prompt (Not loading, no ID searched, no error) -->
      <section v-else-if="!isLoading && !currentLineupId && !fetchError" class="text-center py-10 text-gray-500 dark:text-gray-400">
          <p>Enter a Lineup ID above and click "Load Stories" to begin curation.</p>
      </section>

       <!-- 5. Fetch Error Message -->
       <section v-if="fetchError" class="text-center py-10 text-red-500 dark:text-red-400">
            <p>Error loading stories: {{ fetchError }}</p>
       </section>
    </ClientOnly>

  </div>
</template>

<script setup>
import { ref } from 'vue';

// Apply Admin Middleware
definePageMeta({
  middleware: 'admin'
});

const lineupIdInput = ref('');
const currentLineupId = ref('');
const stories = ref([]);
const isLoading = ref(false);
const fetchError = ref(null);
const isSaving = ref(false);
const saveError = ref(null);
const lastMovedStoryId = ref(null);
let highlightTimeout = null;

const fetchStories = async () => {
  if (!lineupIdInput.value || isLoading.value) return;

  isLoading.value = true;
  fetchError.value = null;
  stories.value = [];
  currentLineupId.value = lineupIdInput.value;

  try {
    const fetchedStories = await $fetch(`/api/admin/story-ideas/by-lineup/${currentLineupId.value}`);
    stories.value = fetchedStories || [];
    console.log('Fetched stories:', stories.value.length, stories.value);

  } catch (err) {
    console.error("Error fetching stories:", err);
    fetchError.value = err.data?.message || 'Failed to load stories.';
    currentLineupId.value = '';
  } finally {
    isLoading.value = false;
  }
};

const saveOrder = async () => {
  if (isSaving.value || !stories.value.length || !currentLineupId.value) return;

  isSaving.value = true;
  saveError.value = null;

  const orderedIds = stories.value.map(story => story._id);

  try {
    const response = await $fetch('/api/admin/story-ideas/reorder', {
      method: 'POST',
      body: {
        lineupId: currentLineupId.value,
        orderedIds: orderedIds
      }
    });
    alert(response.message || 'Order saved successfully!');
  } catch (err) {
    console.error("Error saving order:", err);
    saveError.value = err.data?.message || 'Failed to save order.';
    alert(`Error: ${saveError.value}`);
  } finally {
    isSaving.value = false;
  }
};

const moveStoryUp = (index) => {
  if (index > 0) {
    const item = stories.value.splice(index, 1)[0];
    stories.value.splice(index - 1, 0, item);
    lastMovedStoryId.value = item._id;
    clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(() => {
      lastMovedStoryId.value = null;
    }, 1500);
  }
};

const moveStoryDown = (index) => {
  if (index < stories.value.length - 1) {
    const item = stories.value.splice(index, 1)[0];
    stories.value.splice(index + 1, 0, item);
    lastMovedStoryId.value = item._id;
    clearTimeout(highlightTimeout);
    highlightTimeout = setTimeout(() => {
      lastMovedStoryId.value = null;
    }, 1500);
  }
};

const deleteStory = (indexToDelete) => {
  if (indexToDelete >= 0 && indexToDelete < stories.value.length) {
    const storyTitle = stories.value[indexToDelete]?.title || 'this story';
    if (window.confirm(`Are you sure you want to remove "${storyTitle}"?`)) {
        stories.value.splice(indexToDelete, 1);
        console.log(`Deleted story at index: ${indexToDelete}`);
    }
  }
};

</script>

<style scoped>
.highlight-move {
  background-color: #e0f2fe;
}

.dark .highlight-move {
   background-color: #374151;
}

.line-clamp-3 {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.list-none {
  list-style-type: none;
}
</style> 