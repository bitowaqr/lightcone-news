<template>
  <div class="source-document-editor">
    <h3 class="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
      Editing Source Document: <code class="text-sm bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">{{ document._id }}</code>
    </h3>

    <div class="grid grid-cols-1  gap-6">
      <!-- Left Column - Basic Data -->
      <div>
        <!-- Core Fields -->
        <div class="mb-4">
          <label for="url" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            URL
            <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">Required</span>
          </label>
          <input
            id="url"
            v-model="editableDoc.url"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            :class="{ 'border-red-300 dark:border-red-700': validationErrors.url }"
          />
          <p v-if="validationErrors.url" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.url }}</p>
        </div>

        <!-- Status -->
        <div class="mb-4">
          <label for="status" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
          <select
            id="status"
            v-model="editableDoc.status"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="URL_ONLY">URL Only</option>
            <option value="RETRIEVING_RAW_CONTENT">Retrieving Raw Content</option>
            <option value="RAW_CONTENT_RETRIEVED">Raw Content Retrieved</option>
            <option value="SCREENING">Screening</option>
            <option value="SCREENED-IN">Screened In</option>
            <option value="SCREENED-OUT">Screened Out</option>
            <option value="PROCESSING">Processing</option>
            <option value="PROCESSED">Processed</option>
            <option value="ERROR-PROCESSING">Error Processing</option>
            <option value="EMBEDDING">Embedding</option>
            <option value="EMBEDDED">Embedded</option>
            <option value="ERROR-EMBEDDING">Error Embedding</option>
            <option value="DISCARDED">Discarded</option>
            <option value="ERROR">Error</option>
            <option value="DELETED">Deleted</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <!-- Scraped Date -->
        <div class="mb-4">
          <label for="scrapedDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Scraped Date</label>
          <input
            id="scrapedDate"
            type="datetime-local"
            v-model="scrapedDateFormatted"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        <!-- Processing Error -->
        <div class="mb-4">
          <label for="processingError" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Processing Error</label>
          <textarea
            id="processingError"
            v-model="editableDoc.processingError"
            rows="3"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            placeholder="Any errors during processing"
          ></textarea>
        </div>
      </div>

      <!-- Right Column - Metadata -->
      <div>
        <h4 class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">Metadata</h4>
        
        <!-- Publisher -->
        <div class="mb-4">
          <label for="publisher" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Publisher
            <span class="text-xs text-gray-500 dark:text-gray-400 ml-1">Required</span>
          </label>
          <input
            id="publisher"
            v-model="editableDoc.meta.publisher"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            :class="{ 'border-red-300 dark:border-red-700': validationErrors.publisher }"
          />
          <p v-if="validationErrors.publisher" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.publisher }}</p>
        </div>

        <!-- Published/Updated Date -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="mb-4">
            <label for="publishedDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Published Date</label>
            <input
              id="publishedDate"
              type="date"
              :value="formatDate(editableDoc.meta?.publishedDate)"
              @input="updateMetaDate('publishedDate', $event)"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div class="mb-4">
            <label for="updatedDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Updated Date</label>
            <input
              id="updatedDate"
              type="date"
              :value="formatDate(editableDoc.meta?.updatedDate)"
              @input="updateMetaDate('updatedDate', $event)"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <!-- Authors -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Authors</label>
          <div v-for="(author, index) in editableDoc.meta?.authors" :key="index" class="flex gap-2 mb-2">
            <input
              v-model="editableDoc.meta.authors[index]"
              placeholder="Author name"
              class="flex-grow px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
            <button 
              @click="removeAuthor(index)" 
              class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
              title="Remove author"
            >✕</button>
          </div>
          <button 
            @click="addAuthor" 
            class="mt-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            + Add Author
          </button>
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
          <div v-if="editableDoc.meta?.tags?.length" class="mt-2 flex flex-wrap gap-1">
            <span 
              v-for="(tag, index) in editableDoc.meta.tags" 
              :key="index" 
              class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-xs rounded-full"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- Source Type -->
        <div class="mb-4">
          <label for="sourceType" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Source Type</label>
          <select
            id="sourceType"
            v-model="editableDoc.meta.sourceType"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="ARTICLE">Article</option>
            <option value="MEDIA">Media</option>
            <option value="SOCIAL">Social</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>
    </div>

    <!-- AI Generated Content -->
    <div class="mt-6 border-t pt-4 dark:border-gray-700">
      <h4 class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">AI Generated Content</h4>
      
      <div class="mb-4">
        <label for="aiSummary" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">AI Summary</label>
        <MarkdownEditor v-model="editableDoc.aiSummary" />
      </div>

      <div class="mb-4">
        <label for="aiTags" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">AI Tags (comma-separated)</label>
        <input
          id="aiTags"
          v-model="aiTagsInput"
          placeholder="generated, tags, ai"
          class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        <div v-if="editableDoc.aiTags?.length" class="mt-2 flex flex-wrap gap-1">
          <span 
            v-for="(tag, index) in editableDoc.aiTags" 
            :key="index" 
            class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
          >
            {{ tag }}
          </span>
        </div>
      </div>
    </div>

    <!-- Content Section (Raw Content and Processed Content) -->
    <div class="mt-6 border-t pt-4 dark:border-gray-700">
      <h4 class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">Content</h4>
      
      <div class="mb-4">
        <div class="flex justify-between items-center">
          <label for="content" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Processed Content</label>
          <span class="text-xs text-gray-500">Characters: {{ editableDoc.content?.length || 0 }}</span>
        </div>
        <textarea
          id="content"
          v-model="editableDoc.content"
          rows="10"
          class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono text-sm"
          placeholder="Processed content from the source"
        ></textarea>
      </div>
      
      <div class="mb-4">
        <div class="flex justify-between items-center">
          <label for="rawContent" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Raw Content</label>
          <span class="text-xs text-gray-500">Characters: {{ editableDoc.rawContent?.length || 0 }}</span>
        </div>
        <textarea
          id="rawContent"
          v-model="editableDoc.rawContent"
          rows="6"
          class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono text-sm"
          placeholder="Raw HTML or text retrieved from the source"
        ></textarea>
      </div>
    </div>

    <!-- Actions Buttons -->
    <div class="mt-6 pt-4 border-t dark:border-gray-700 flex flex-wrap gap-3">
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

// Ensure meta object exists
if (!editableDoc.meta) {
  editableDoc.meta = {
    publisher: '',
    publishedDate: null,
    updatedDate: null,
    authors: [],
    tags: [],
    sourceType: 'ARTICLE'
  };
}

// Date formatted values
const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().slice(0, 10);
};

const formatDateTimeLocal = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().slice(0, 16);
};

// Update metadata dates
function updateMetaDate(dateField, event) {
  if (!editableDoc.meta) editableDoc.meta = {};
  const value = event.target.value;
  editableDoc.meta[dateField] = value ? new Date(value).toISOString() : null;
}

// Computed property for scraped date
const scrapedDateFormatted = computed({
  get() { return formatDateTimeLocal(editableDoc.scrapedDate); },
  set(value) { editableDoc.scrapedDate = value ? new Date(value).toISOString() : null; }
});

// Tags as comma-separated string for easier editing
const tagsInput = computed({
  get() {
    return editableDoc.meta?.tags?.join(', ') || '';
  },
  set(value) {
    if (!editableDoc.meta) editableDoc.meta = {};
    // Split by comma and trim whitespace
    editableDoc.meta.tags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag); // Filter out empty tags
  }
});

// AI Tags as comma-separated string for easier editing
const aiTagsInput = computed({
  get() {
    return editableDoc.aiTags?.join(', ') || '';
  },
  set(value) {
    // Split by comma and trim whitespace
    editableDoc.aiTags = value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag); // Filter out empty tags
  }
});

// Helper functions for array management
function addAuthor() {
  if (!editableDoc.meta) editableDoc.meta = {};
  if (!editableDoc.meta.authors) editableDoc.meta.authors = [];
  editableDoc.meta.authors.push('');
}

function removeAuthor(index) {
  editableDoc.meta.authors.splice(index, 1);
}

// Validation
function validate() {
  validationErrors.url = !editableDoc.url?.trim() ? 'URL is required' : null;
  validationErrors.publisher = !editableDoc.meta?.publisher?.trim() ? 'Publisher is required' : null;
  
  return !Object.values(validationErrors).some(error => error);
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
  Object.assign(editableDoc, JSON.parse(JSON.stringify(newDoc)));
  
  // Ensure meta object exists after update
  if (!editableDoc.meta) {
    editableDoc.meta = {
      publisher: '',
      publishedDate: null,
      updatedDate: null,
      authors: [],
      tags: [],
      sourceType: 'ARTICLE'
    };
  }
}, { deep: true });

// Initialize
onMounted(() => {
  // Ensure objects and arrays exist
  if (!editableDoc.meta) editableDoc.meta = {};
  if (!editableDoc.meta.authors) editableDoc.meta.authors = [];
  if (!editableDoc.meta.tags) editableDoc.meta.tags = [];
  if (!editableDoc.aiTags) editableDoc.aiTags = [];
  
  // Reset errors when mounted
  Object.keys(validationErrors).forEach(key => {
    validationErrors[key] = null;
  });
});
</script> 