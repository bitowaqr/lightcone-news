<template>
  <div class="story-ideas-editor">
    <h3 class="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
      Editing Story Idea: <code class="text-sm bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">{{ document._id }}</code>
    </h3>
    <div v-if="editableDoc" class="space-y-6">
      <!-- Display Timestamps & Lineup ID -->
      <div class="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>Created: {{ formatDate(editableDoc.createdAt) }}</p>
        <p>Updated: {{ formatDate(editableDoc.updatedAt) }}</p>
         <p v-if="editableDoc.lineupId" class="text-sm font-medium"> <!-- Increased font size -->
           Lineup ID: <code class="bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">{{ editableDoc.lineupId }}</code>
         </p>
      </div>

      <!-- Story Idea Details Section -->
      <section class="space-y-4">
         <h4 class="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200 border-b pb-1 dark:border-gray-600">Story Idea Details</h4>

         <!-- Priority -->
         <div>
            <label for="story-priority" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Priority</label>
            <input
              id="story-priority"
              type="number"
              v-model.number="editableDoc.priority"
              class="w-full md:w-1/4 px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>

          <!-- Title -->
          <div>
            <label for="story-title" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Title</label>
            <input
              id="story-title"
              v-model="editableDoc.title"
              required
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
             <p v-if="validationErrors.title" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.title }}</p>
          </div>

          <!-- Description -->
          <div>
            <label for="story-description" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
            <textarea
              id="story-description"
              v-model="editableDoc.description"
              rows="3"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            ></textarea>
          </div>

         <!-- Status -->
         <div>
            <label for="story-status" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
            <select
              id="story-status"
              v-model="editableDoc.status"
              class="w-full md:w-1/3 px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="idea">Idea</option>
              <option value="draftingArticle">Drafting Article</option>
              <option value="articleWritten">Article Written</option>
              <option value="archived">Archived</option>
            </select>
         </div>

          <!-- Notes -->
          <div>
            <label for="story-notes" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Notes</label>
            <textarea
              id="story-notes"
              v-model="editableDoc.notes"
              rows="4"
              placeholder="Internal notes about this story idea..."
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            ></textarea>
          </div>
      </section>

       <!-- Update Section -->
       <section class="space-y-3">
         <h4 class="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200 border-b pb-1 dark:border-gray-600">Update Information</h4>
         <div class="flex items-center space-x-2">
           <input
              id="story-update"
              type="checkbox"
              v-model="editableDoc.update"
              class="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600"
            />
            <label for="story-update" class="text-sm font-medium text-gray-700 dark:text-gray-300">Is this an update to an existing article?</label>
         </div>
         <div v-if="editableDoc.update">
            <label for="story-updatedArticleId" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ID of Article Being Updated</label>
             <input
               id="story-updatedArticleId"
               v-model="editableDoc.updatedArticleId"
               placeholder="Enter the ID of the original article"
               class="w-full md:w-2/3 px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
             />
             <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Required if 'Is update' is checked.</p>
         </div>
       </section>


      <!-- Sources Section -->
      <section>
         <h4 class="text-md font-semibold mb-3 text-gray-700 dark:text-gray-300">Sources</h4>
         <div class="space-y-4">
           <div v-for="(source, sourceIndex) in editableDoc.sources" :key="sourceIndex" class="p-3 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 relative">
              <button
                @click="removeSource(sourceIndex)"
                class="absolute top-1 right-1 px-1.5 py-0 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-xs"
                title="Remove Source"
               >&times;</button>

               <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div>
                    <label :for="`source-${sourceIndex}-title`" class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Source Title</label>
                    <input :id="`source-${sourceIndex}-title`" v-model="source.title" required class="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                 </div>
                  <div>
                    <label :for="`source-${sourceIndex}-url`" class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">URL</label>
                    <input :id="`source-${sourceIndex}-url`" type="url" v-model="source.url" required class="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                 </div>
                 <div>
                    <label :for="`source-${sourceIndex}-publisher`" class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Publisher</label>
                    <input :id="`source-${sourceIndex}-publisher`" v-model="source.publisher" required class="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                 </div>
                 <div>
                    <label :for="`source-${sourceIndex}-publishedDate`" class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Published Date (Text)</label>
                    <input :id="`source-${sourceIndex}-publishedDate`" v-model="source.publishedDate" class="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="YYYY-MM-DD or text" />
                 </div>
                  <div class="md:col-span-2">
                    <label :for="`source-${sourceIndex}-description`" class="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Source Description (Optional)</label>
                    <textarea :id="`source-${sourceIndex}-description`" v-model="source.description" rows="2" class="w-full px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"></textarea>
                 </div>
               </div>
           </div>
           <button
              @click="addSource"
              class="mt-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 text-sm"
            >
              + Add Source
            </button>
            <p v-if="validationErrors.sources" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.sources }}</p>
         </div>
      </section>

    </div>

    <!-- Actions Buttons -->
    <div class="mt-6 pt-4 border-t dark:border-gray-700 flex flex-wrap gap-3">
      <button
        @click="saveChanges"
        :disabled="isSaving"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
      >
        {{ isSaving ? 'Saving...' : 'Save Changes' }}
      </button>
      <button
        @click="cancel"
        :disabled="isSaving"
        class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
      >
        Cancel
      </button>

      <!-- Navigate to Article Button -->
      <button
        v-if="editableDoc && (editableDoc.status === 'articleWritten' || editableDoc.status === 'draftingArticle')"
        @click="navigateToArticle"
        :disabled="isSaving"
        class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
        title="Go to the article created from this story idea (if it exists)"
      >
        View Related Article
      </button>
    </div>
     <div v-if="saveError" class="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
        Save error: {{ saveError }}
     </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';
import { navigateTo } from '#app'; // Import navigateTo

const props = defineProps({
  document: {
    type: Object,
    required: true
  },
  collectionName: { // Passed from parent to know we're dealing with StoryIdeas
    type: String,
    required: true
  }
});

const emit = defineEmits(['save', 'cancel']);

const isSaving = ref(false);
const saveError = ref(null);
const validationErrors = reactive({});

// Create a deep copy of the document for editing
const editableDoc = ref(null);

// Function to create a deep copy
function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Function to format dates
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString;
  }
}

// Watch for prop changes to update the editable copy
watch(() => props.document, (newDoc) => {
  if (newDoc && props.collectionName === 'StoryIdeas') { // Ensure it's the correct type
    editableDoc.value = deepCopy(newDoc);
    // Ensure default values or existing values for new fields
    if (!editableDoc.value.sources) editableDoc.value.sources = [];
    editableDoc.value.priority = Number(editableDoc.value.priority) || 1;
    editableDoc.value.status = editableDoc.value.status || 'idea'; // Default status
    editableDoc.value.update = typeof editableDoc.value.update === 'boolean' ? editableDoc.value.update : false; // Default update
    editableDoc.value.updatedArticleId = editableDoc.value.updatedArticleId || ''; // Default updatedArticleId

  } else {
    editableDoc.value = null;
  }
  // Reset errors when document changes
  Object.keys(validationErrors).forEach(key => delete validationErrors[key]);
  saveError.value = null;

}, { deep: true, immediate: true });

// --- Validation ---
function validate() {
  Object.keys(validationErrors).forEach(key => delete validationErrors[key]); // Clear previous errors
  let isValid = true;

  if (!editableDoc.value.title?.trim()) {
    validationErrors.title = 'Title is required.';
    isValid = false;
  }

  // Validation for updatedArticleId if update is checked
   if (editableDoc.value.update && !editableDoc.value.updatedArticleId?.trim()) {
     validationErrors.updatedArticleId = 'Updated Article ID is required when "Is update" is checked.';
     isValid = false;
   } else {
      delete validationErrors.updatedArticleId; // Clear error if condition is met or update is unchecked
   }

   if (!editableDoc.value.sources || editableDoc.value.sources.length === 0) {
     validationErrors.sources = 'At least one source is required.';
     isValid = false;
   } else {
     editableDoc.value.sources.forEach((source, index) => {
       if (!source.title?.trim() || !source.url?.trim() || !source.publisher?.trim()) {
         validationErrors.sources = `Source #${index + 1} is missing required fields (Title, URL, Publisher).`;
         isValid = false;
         // Could add more specific errors per source field if needed
       }
        // Basic URL validation (optional)
        try {
            new URL(source.url);
        } catch (_) {
            validationErrors.sources = validationErrors.sources ? validationErrors.sources + ` Source #${index + 1} URL is invalid.` : `Source #${index + 1} URL is invalid.`;
             isValid = false;
        }
     });
   }

  // Add more validation rules as needed (e.g., priority range)

  return isValid;
}


// --- Add/Remove Sources ---

function addSource() {
  if (!editableDoc.value.sources) editableDoc.value.sources = [];
  editableDoc.value.sources.push({
    title: '',
    url: '',
    publisher: '',
    description: '',
    publishedDate: ''
  });
   // Clear potential source validation error after adding one
   if (validationErrors.sources?.includes('At least one source')) {
     delete validationErrors.sources;
   }
}

function removeSource(sourceIndex) {
  if (editableDoc.value && editableDoc.value.sources) {
    editableDoc.value.sources.splice(sourceIndex, 1);
     // Re-validate if removing the last source causes an error
     if (editableDoc.value.sources.length === 0) {
        validate();
     }
  }
}

// --- Action Handlers ---

async function saveChanges() {
  saveError.value = null;
  if (!validate()) {
    return; // Stop if validation fails
  }

  isSaving.value = true;
  try {
    // The parent component handles the actual API call via the 'save' event
    emit('save', editableDoc.value);
    // Parent will handle success message/state update
  } catch (error) {
      // This catch might not be necessary if parent handles errors,
      // but can be a fallback.
      console.error("Error during save emission:", error);
      saveError.value = 'An unexpected error occurred.';
  } finally {
    // The parent should ideally control the saving state,
    // but we reset it here as a fallback or if parent doesn't.
    // Consider letting the parent signal completion to reset isSaving.
    isSaving.value = false;
  }
}

function cancel() {
  emit('cancel');
}

function navigateToArticle() {
  if (editableDoc.value?._id) {
    // Assuming the admin page can filter by storyId via query param
    // If not, this will just navigate to /admin
    navigateTo({ path: '/admin', query: { storyId: editableDoc.value._id } });
  }
}

</script>

<style scoped>
/* Add any specific styles if needed */
</style> 