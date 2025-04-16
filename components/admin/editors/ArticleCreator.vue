<template>
  <div class="article-creator p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
    <h3 class="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
      Create New Article
    </h3>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left Column - Basic Data -->
      <div>
        <!-- Title -->
        <div class="mb-4">
          <label for="create-title" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
          <input
            id="create-title"
            v-model="newArticle.title"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            :class="{ 'border-red-300 dark:border-red-700': validationErrors.title }"
          />
          <p v-if="validationErrors.title" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.title }}</p>
        </div>

        <!-- Status -->
        <div class="mb-4">
          <label for="create-status" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Initial Status</label>
          <select
            id="create-status"
            v-model="newArticle.status"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="DRAFT">Draft</option>
            <option value="PENDING">Pending Review</option>
            <!-- Cannot create as PUBLISHED directly -->
            <option value="ERROR">Error</option>
          </select>
        </div>

        <!-- Author -->
        <div class="mb-4">
          <label for="create-author" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Author</label>
          <input
            id="create-author"
            v-model="newArticle.author"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        <!-- Image URL -->
        <div class="mb-4">
          <label for="create-imageUrl" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Image URL</label>
          <input
            id="create-imageUrl"
            v-model="newArticle.imageUrl"
            placeholder=""
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <div v-if="newArticle.imageUrl" class="mt-2 bg-gray-100 dark:bg-gray-700 p-2 rounded">
            <p class="text-xs mb-1">Image Preview:</p>
            <img
              :src="newArticle.imageUrl"
              alt="Preview"
              class="max-h-32 object-contain border dark:border-gray-600"
              @error="imageError = true"
              v-show="!imageError"
            />
            <p v-if="imageError" class="text-sm text-red-500">Failed to load image</p>
          </div>
        </div>

        <!-- Tags -->
        <div class="mb-4">
          <label for="create-tags" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
          <input
            id="create-tags"
            v-model="tagsInput"
            placeholder="news, technology, economy"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
           <div v-if="newArticle.tags?.length" class="mt-2 flex flex-wrap gap-1">
            <span
              v-for="(tag, index) in newArticle.tags"
              :key="index"
              class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- Right Column - Content and Relationships -->
      <div>
        <!-- Precis (Short Description) -->
        <div class="mb-4">
          <label for="create-precis" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Precis (1-3 sentences)
            <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">Required</span>
          </label>
          <textarea
            id="create-precis"
            v-model="newArticle.precis"
            rows="3"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            :class="{ 'border-red-300 dark:border-red-700': validationErrors.precis }"
          ></textarea>
          <p v-if="validationErrors.precis" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.precis }}</p>
        </div>

        <!-- Summary (With Markdown Editor) -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Summary (1-3 paragraphs)
          </label>
          <MarkdownEditor v-model="newArticle.summary" large />
        </div>

        <!-- Related Scenarios -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Related Scenario IDs
          </label>
          <div v-for="(scenarioId, index) in newArticle.relatedScenarioIds" :key="index" class="flex gap-2 mb-2">
            <input
              v-model="newArticle.relatedScenarioIds[index]"
              placeholder="Scenario ID (valid ObjectId)"
              class="flex-grow px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
            <button
              @click="removeScenarioId(index)"
              class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
              title="Remove scenario"
            >✕</button>
          </div>
          <button
            @click="addScenarioId"
            class="mt-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            + Add Scenario ID
          </button>
        </div>

        <!-- Suggested Prompts -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Suggested AI Prompts
          </label>
          <div v-for="(prompt, index) in newArticle.suggestedPrompts" :key="index" class="flex gap-2 mb-2">
            <input
              v-model="newArticle.suggestedPrompts[index]"
              placeholder="Suggested prompt for readers"
              class="flex-grow px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
            <button
              @click="removePrompt(index)"
              class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
              title="Remove prompt"
            >✕</button>
          </div>
          <button
            @click="addPrompt"
            class="mt-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            + Add Suggested Prompt
          </button>
        </div>
      </div>
    </div>

    <!-- Timeline Events Section -->
    <div class="mt-6 border-t pt-4 dark:border-gray-700">
      <h4 class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">Timeline Events</h4>

      <div v-for="(event, index) in newArticle.timeline" :key="index" class="mb-4 p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div class="flex justify-between mb-2">
          <h5 class="font-medium">Event #{{ index + 1 }}</h5>
          <button
            @click="removeTimelineEvent(index)"
            class="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm"
          >Remove</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date</label>
            <input
              v-model="newArticle.timeline[index].date"
              placeholder="YYYY-MM-DD or text"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>
          <div class="md:col-span-2">
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Event Description</label>
            <textarea
              v-model="newArticle.timeline[index].event"
              rows="2"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            ></textarea>
          </div>
          <div class="md:col-span-3">
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Source URL (optional)</label>
            <input
              v-model="newArticle.timeline[index].sourceUrl"
              placeholder="https://example.com/source"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>
        </div>
      </div>

      <button
        @click="addTimelineEvent"
        class="mt-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
      >
        + Add Timeline Event
      </button>
    </div>

    <!-- Sources Section -->
    <div class="mt-6 border-t pt-4 dark:border-gray-700">
      <h4 class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">Sources</h4>

      <div v-for="(source, index) in newArticle.sources" :key="index" class="mb-4 p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div class="flex justify-between mb-2">
          <h5 class="font-medium">Source #{{ index + 1 }}</h5>
          <button
            @click="removeSource(index)"
            class="px-2 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm"
          >Remove</button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">URL</label>
            <input
              v-model="newArticle.sources[index].url"
              placeholder="https://example.com/article"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Publisher</label>
            <input
              v-model="newArticle.sources[index].publisher"
              placeholder="Publisher name"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
              :class="{ 'border-red-300 dark:border-red-700': validationErrors[`sourcePublisher_${index}`] }"
            />
             <p v-if="validationErrors[`sourcePublisher_${index}`]" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors[`sourcePublisher_${index}`] }}</p>
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Published Date</label>
            <input
              type="date"
              :value="formatSourceDate(newArticle.sources[index]?.publishedDate)"
              @input="updateSourceDate(index, 'publishedDate', $event)"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Updated Date (optional)</label>
            <input
              type="date"
              :value="formatSourceDate(newArticle.sources[index]?.updatedDate)"
              @input="updateSourceDate(index, 'updatedDate', $event)"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>
        </div>
      </div>

      <button
        @click="addSource"
        class="mt-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
      >
        + Add Source
      </button>
    </div>

    <!-- Actions Buttons -->
    <div class="mt-6 pt-4 border-t dark:border-gray-700 flex flex-wrap gap-3">
      <button
        @click="createArticle"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? 'Creating...' : 'Create Article' }}
      </button>
      <button
        @click="cancel"
        class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        Cancel
      </button>
    </div>
     <p v-if="creationError" class="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
        Error creating article: {{ creationError }}
      </p>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import MarkdownEditor from '../MarkdownEditor.vue'; // Assuming MarkdownEditor is in the same folder

const emit = defineEmits(['create', 'cancel']);

// State
const newArticle = reactive({
  title: '',
  precis: '',
  summary: '',
  imageUrl: '',
  publishedDate: null, // Will be set on PUBLISH status via server logic if needed
  author: 'Lightcone News', // Default author
  tags: [],
  status: 'DRAFT', // Default status
  sources: [],
  timeline: [],
  relatedScenarioIds: [],
  suggestedPrompts: [],
});

const validationErrors = reactive({});
const imageError = ref(false);
const isSubmitting = ref(false);
const creationError = ref(null);

// Computed property for tags input
const tagsInput = computed({
  get() {
    return newArticle.tags?.join(', ') || '';
  },
  set(value) {
    newArticle.tags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag); // Filter out empty tags
  }
});

// Helper functions for sources date formatting
function formatSourceDate(date) {
  if (!date) return '';
  try {
    return new Date(date).toISOString().slice(0, 10); // YYYY-MM-DD
  } catch {
    return ''; // Handle invalid dates if necessary
  }
}

function updateSourceDate(sourceIndex, dateField, event) {
  if (!newArticle.sources[sourceIndex]) return;
  const value = event.target.value;
  try {
    newArticle.sources[sourceIndex][dateField] = value ? new Date(value).toISOString() : null;
  } catch {
      newArticle.sources[sourceIndex][dateField] = null; // Handle invalid input
  }
}

// Add/remove functions for arrays
function addTimelineEvent() {
  newArticle.timeline.push({ date: '', event: '', sourceUrl: '' });
}

function removeTimelineEvent(index) {
  newArticle.timeline.splice(index, 1);
}

function addSource() {
  newArticle.sources.push({
    url: '',
    publisher: '',
    publishedDate: null,
    updatedDate: null,
    meta: {}
  });
}

function removeSource(index) {
  newArticle.sources.splice(index, 1);
}

function addScenarioId() {
  newArticle.relatedScenarioIds.push('');
}

function removeScenarioId(index) {
  newArticle.relatedScenarioIds.splice(index, 1);
}

function addPrompt() {
  newArticle.suggestedPrompts.push('');
}

function removePrompt(index) {
  newArticle.suggestedPrompts.splice(index, 1);
}

// Basic validation
function validate() {
  // Reset errors
  Object.keys(validationErrors).forEach(key => {
    validationErrors[key] = null;
  });
  let isValid = true;

  if (!newArticle.title?.trim()) {
    validationErrors.title = 'Title is required';
    isValid = false;
  }
  if (!newArticle.precis?.trim()) {
    validationErrors.precis = 'Precis is required';
    isValid = false;
  }
   // Validate sources: Publisher is required if source exists
  newArticle.sources.forEach((source, index) => {
    if (!source.publisher?.trim()) {
      validationErrors[`sourcePublisher_${index}`] = `Publisher is required for Source #${index + 1}`;
      isValid = false;
    }
  });

  // Add more validation as needed (e.g., ObjectId format for scenarios)

  return isValid;
}

// Create article
async function createArticle() {
  creationError.value = null; // Reset previous error
  if (!validate()) {
     // Scroll to first error (optional enhancement)
    const firstErrorEl = document.querySelector('.border-red-300');
    if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  isSubmitting.value = true;
  try {
    // Clean up empty strings in arrays before submitting
    const articleData = JSON.parse(JSON.stringify(newArticle)); // Deep clone
    articleData.relatedScenarioIds = articleData.relatedScenarioIds.filter(id => id && /^[0-9a-fA-F]{24}$/.test(id)); // Basic ObjectId check
    articleData.suggestedPrompts = articleData.suggestedPrompts.filter(p => p?.trim());
    // You might want similar cleanup for timeline/sources if empty entries are undesirable

    emit('create', articleData);
     // Optionally reset form here or let parent handle it upon success
     // resetForm();
  } catch (error) {
    console.error("Error preparing article data:", error);
    creationError.value = "An unexpected error occurred preparing the data.";
  } finally {
     // The parent component should set isSubmitting back to false after the API call finishes
     // isSubmitting.value = false; // Let parent control this
  }
}

function cancel() {
  emit('cancel');
  resetForm(); // Optionally reset form on cancel
}

function resetForm() {
    Object.assign(newArticle, {
        title: '',
        precis: '',
        summary: '',
        imageUrl: '',
        publishedDate: null,
        author: 'Lightcone News',
        tags: [],
        status: 'DRAFT',
        sources: [],
        timeline: [],
        relatedScenarioIds: [],
        suggestedPrompts: [],
    });
    Object.keys(validationErrors).forEach(key => validationErrors[key] = null);
    imageError.value = false;
    creationError.value = null;
}

// Lifecycle hook (optional)
onMounted(() => {
    resetForm(); // Ensure form is clean on mount/remount
});

// Expose method to parent if needed (though usually handled by emit)
defineExpose({
    setIsSubmitting: (value) => { isSubmitting.value = value; },
    setCreationError: (errorMsg) => { creationError.value = errorMsg; }
});

</script>

<style scoped>
/* Add any specific styles if needed */
</style> 