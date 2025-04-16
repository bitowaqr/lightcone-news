<template>
  <div class="article-editor">
    <h3 class="text-lg font-medium mb-1 text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
      Editing Article: <code class="text-sm bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">{{ document._id }}</code>
    </h3>

    <!-- Counts Info -->
    <div class="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-4">
      <span>Scenarios: {{ editableDoc.relatedScenarioIds?.length || 0 }}</span> | 
      <span>Prompts: {{ editableDoc.suggestedPrompts?.length || 0 }}</span> | 
      <span>Timeline Events: {{ editableDoc.timeline?.length || 0 }}</span> | 
      <span>Sources: {{ editableDoc.sources?.length || 0 }}</span>
    </div>

    <div class="grid grid-cols-1 gap-6">
      <!-- Left Column - Basic Data -->
      <div>
        <!-- Title -->
        <div class="mb-4">
          <label for="title" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
          <input
            id="title"
            v-model="editableDoc.title"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            :class="{ 'border-red-300 dark:border-red-700': validationErrors.title }"
          />
          <p v-if="validationErrors.title" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.title }}</p>
        </div>

        <!-- Status -->
        <div class="mb-4">
          <label for="status" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
          <div class="flex items-center gap-2">
            <select
              id="status"
              v-model="editableDoc.status"
              class="flex-grow px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending Review</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
              <option value="REJECTED">Rejected</option>
              <option value="ERROR">Error</option>
            </select>
            <button 
              v-if="editableDoc.status !== 'PUBLISHED'"
              @click="publishArticle"
              class="px-3 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm whitespace-nowrap"
              title="Set status to PUBLISHED and save"
            >
              Publish Now
            </button>
          </div>
        </div>

        <!-- Publish Date -->
        <div class="mb-4">
          <label for="publishedDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Published Date 
            <span v-if="editableDoc.status === 'PUBLISHED' && !editableDoc.publishedDate" class="text-amber-600 dark:text-amber-400">
              (Auto-set when published)
            </span>
          </label>
          <input
            id="publishedDate"
            type="datetime-local"
            v-model="publishedDateFormatted"
            :disabled="!editableDoc.publishedDate && editableDoc.status !== 'PUBLISHED'"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-50"
          />
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Format: YYYY-MM-DDTHH:MM
          </p>
        </div>

        <!-- Author -->
        <div class="mb-4">
          <label for="author" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Author</label>
          <input
            id="author"
            v-model="editableDoc.author"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        <!-- Image URL -->
        <div class="mb-4">
          <label for="imageUrl" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Image URL</label>
          <input
            id="imageUrl"
            v-model="editableDoc.imageUrl"
            placeholder=""
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <div v-if="editableDoc.imageUrl" class="mt-2 bg-gray-100 dark:bg-gray-700 p-2 rounded">
            <p class="text-xs mb-1">Image Preview:</p>
            <img 
              :src="editableDoc.imageUrl" 
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
          <label for="tags" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tags (comma-separated)</label>
          <input
            id="tags"
            v-model="tagsInput"
            placeholder="news, technology, economy"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <div v-if="editableDoc.tags?.length" class="mt-2 flex flex-wrap gap-1">
            <span 
              v-for="(tag, index) in editableDoc.tags" 
              :key="index" 
              class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- Summary (With Markdown Editor) -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Summary (1-3 paragraphs)
          </label>
          <MarkdownEditor v-model="editableDoc.summary" large />
        </div>

        <!-- Summary Alt (With Markdown Editor) -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Summary Alt (Bullet points)
          </label>
          <MarkdownEditor v-model="editableDoc.summaryAlt" large />
        </div>
      </div>

      <!-- Right Column - Content and Relationships -->
      <div>
        <!-- Precis (Short Description) -->
        <div class="mb-4">
          <label for="precis" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Precis (1-3 sentences)
            <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">Required</span>
          </label>
          <textarea
            id="precis"
            v-model="editableDoc.precis"
            rows="3"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            :class="{ 'border-red-300 dark:border-red-700': validationErrors.precis }"
          ></textarea>
          <p v-if="validationErrors.precis" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.precis }}</p>
        </div>

        <!-- Related Scenarios -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Related Scenario IDs
          </label>
          <div v-for="(scenarioId, index) in editableDoc.relatedScenarioIds" :key="index" class="flex gap-2 mb-2">
            <input
              v-model="editableDoc.relatedScenarioIds[index]"
              placeholder="Scenario ID"
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
          <div v-for="(prompt, index) in editableDoc.suggestedPrompts" :key="index" class="flex gap-2 mb-2">
            <input
              v-model="editableDoc.suggestedPrompts[index]"
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
      <h4 
        @click="timelineCollapsed = !timelineCollapsed"
        class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300 cursor-pointer flex justify-between items-center"
      >
        <span>Timeline Events ({{ editableDoc.timeline?.length || 0 }})</span>
        <Icon :name="timelineCollapsed ? 'heroicons:chevron-down-20-solid' : 'heroicons:chevron-up-20-solid'" class="w-5 h-5 text-gray-500" />
      </h4>
      
      <div v-show="!timelineCollapsed">
        <div v-for="(event, index) in editableDoc.timeline" :key="index" class="mb-4 p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
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
                v-model="editableDoc.timeline[index].date"
                placeholder="YYYY-MM-DD or text like 'Early 2023'"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div class="md:col-span-2">
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Event Description</label>
              <textarea
                v-model="editableDoc.timeline[index].event"
                rows="2"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
              ></textarea>
            </div>
            <div class="md:col-span-3">
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Source URL (optional)</label>
              <input
                v-model="editableDoc.timeline[index].sourceUrl"
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
    </div>

    <!-- Sources Section -->
    <div class="mt-6 border-t pt-4 dark:border-gray-700">
      <h4 
        @click="sourcesCollapsed = !sourcesCollapsed"
        class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300 cursor-pointer flex justify-between items-center"
      >
        <span>Sources ({{ editableDoc.sources?.length || 0 }})</span>
        <Icon :name="sourcesCollapsed ? 'heroicons:chevron-down-20-solid' : 'heroicons:chevron-up-20-solid'" class="w-5 h-5 text-gray-500" />
      </h4>
      
      <div v-show="!sourcesCollapsed">
        <div v-for="(source, index) in editableDoc.sources" :key="index" class="mb-4 p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
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
                v-model="editableDoc.sources[index].url"
                placeholder="https://example.com/article"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Publisher</label>
              <input
                v-model="editableDoc.sources[index].publisher"
                placeholder="Publisher name"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Published Date</label>
              <input
                type="date"
                :value="formatSourceDate(editableDoc.sources[index]?.publishedDate)"
                @input="updateSourceDate(index, 'publishedDate', $event)"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Updated Date (optional)</label>
              <input
                type="date"
                :value="formatSourceDate(editableDoc.sources[index]?.updatedDate)"
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
    </div>

    <!-- Actions Buttons -->
    <div class="mt-6 pt-4 border-t dark:border-gray-700 flex flex-wrap gap-3 items-center">
      <button 
        @click="saveChanges" 
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        Save Changes
      </button>
      <button 
        @click="cancel" 
        class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        Cancel
      </button>
      <button 
        @click="viewRawJson" 
        class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        View Raw JSON
      </button>
    </div>

    <!-- JSON Viewer Modal -->
    <JsonViewerModal 
      v-model="showJsonModal" 
      :json-data="editableDoc" 
      :title="`Raw JSON - ${document._id}`"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import MarkdownEditor from '../MarkdownEditor.vue';
import JsonViewerModal from '../JsonViewerModal.vue';

const props = defineProps({
  document: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['save', 'cancel']);

// For JSON Viewer
const showJsonModal = ref(false);

// Create a deep copy of the document for editing
const editableDoc = reactive(JSON.parse(JSON.stringify(props.document)));
const validationErrors = reactive({});
const imageError = ref(false);
const sourcesCollapsed = ref(true); // State for sources collapse
const timelineCollapsed = ref(true); // State for timeline collapse

// Computed properties for formatting
const publishedDateFormatted = computed({
  get() {
    if (!editableDoc.publishedDate) return '';
    return new Date(editableDoc.publishedDate).toISOString().slice(0, 16);
  },
  set(value) {
    editableDoc.publishedDate = value ? new Date(value).toISOString() : null;
  }
});

// Tags as comma-separated string for easier editing
const tagsInput = computed({
  get() {
    return editableDoc.tags?.join(', ') || '';
  },
  set(value) {
    // Split by comma and trim whitespace
    editableDoc.tags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag); // Filter out empty tags
  }
});

// Helper functions for sources
function formatSourceDate(date) {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10); // YYYY-MM-DD
}

function updateSourceDate(sourceIndex, dateField, event) {
  if (!editableDoc.sources[sourceIndex]) return;
  const value = event.target.value;
  editableDoc.sources[sourceIndex][dateField] = value ? new Date(value).toISOString() : null;
}

// Add/remove functions for arrays
function addTimelineEvent() {
  if (!editableDoc.timeline) editableDoc.timeline = [];
  editableDoc.timeline.push({ date: '', event: '', sourceUrl: '' });
}

function removeTimelineEvent(index) {
  editableDoc.timeline.splice(index, 1);
}

function addSource() {
  if (!editableDoc.sources) editableDoc.sources = [];
  editableDoc.sources.push({ 
    url: '', 
    publisher: '', 
    publishedDate: null, 
    updatedDate: null,
    meta: {}
  });
}

function removeSource(index) {
  editableDoc.sources.splice(index, 1);
}

function addScenarioId() {
  if (!editableDoc.relatedScenarioIds) editableDoc.relatedScenarioIds = [];
  editableDoc.relatedScenarioIds.push('');
}

function removeScenarioId(index) {
  editableDoc.relatedScenarioIds.splice(index, 1);
}

function addPrompt() {
  if (!editableDoc.suggestedPrompts) editableDoc.suggestedPrompts = [];
  editableDoc.suggestedPrompts.push('');
}

function removePrompt(index) {
  editableDoc.suggestedPrompts.splice(index, 1);
}

// Validation
function validate() {
  validationErrors.title = !editableDoc.title?.trim() ? 'Title is required' : null;
  validationErrors.precis = !editableDoc.precis?.trim() ? 'Precis is required' : null;
  
  return !Object.values(validationErrors).some(error => error);
}

// Publish and Save
function publishArticle() {
  editableDoc.status = 'PUBLISHED';
  // Set publish date only if it's not already set
  if (!editableDoc.publishedDate) {
    editableDoc.publishedDate = new Date().toISOString();
  }
  saveChanges(); // Trigger the regular save
}

// Save changes
function saveChanges() {
  if (!validate()) {
    // Scroll to first error
    const firstErrorEl = document.querySelector('.border-red-300');
    if (firstErrorEl) firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  
  emit('save', editableDoc);
}

function cancel() {
  emit('cancel');
}

function viewRawJson() {
  showJsonModal.value = true;
}

// Watch for document changes from parent
watch(() => props.document, (newDoc) => {
  const parsedDoc = JSON.parse(JSON.stringify(newDoc));
  // Ensure summaryAlt exists
  if (parsedDoc.summaryAlt === undefined) {
    parsedDoc.summaryAlt = '';
  }
  Object.assign(editableDoc, parsedDoc);
}, { deep: true });

// Initialize
onMounted(() => {
  // Ensure arrays exist
  if (!editableDoc.tags) editableDoc.tags = [];
  if (!editableDoc.timeline) editableDoc.timeline = [];
  if (!editableDoc.sources) editableDoc.sources = [];
  if (!editableDoc.relatedScenarioIds) editableDoc.relatedScenarioIds = [];
  if (!editableDoc.suggestedPrompts) editableDoc.suggestedPrompts = [];
  // Ensure summaryAlt exists
  if (editableDoc.summaryAlt === undefined) {
    editableDoc.summaryAlt = '';
  }
  
  // Reset errors when mounted
  Object.keys(validationErrors).forEach(key => {
    validationErrors[key] = null;
  });
});
</script> 