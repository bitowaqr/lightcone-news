<template>
  <div class="forecaster-editor p-1">
    <form @submit.prevent="onSave" class="space-y-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Name:</label>
        <input type="text" id="name" v-model="editableDocument.name" required class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
      </div>

      <div>
        <label for="type" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
        <select id="type" v-model="editableDocument.type" required class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="AI">AI</option>
          <option value="HUMAN">HUMAN</option>
        </select>
      </div>

      <div v-if="editableDocument.type === 'HUMAN'">
        <label for="userId" class="block text-sm font-medium text-gray-700 dark:text-gray-300">User ID (for HUMAN type):</label>
        <input type="text" id="userId" v-model="editableDocument.userId" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="Mongoose ObjectId">
         <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Required if type is HUMAN. Must be a valid User ObjectId.</p>
      </div>

      <div>
        <label for="avatar" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Avatar (Icon Name or URL):</label>
        <input type="text" id="avatar" v-model="editableDocument.avatar" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" placeholder="e.g., mdi:robot or https://example.com/avatar.png">
      </div>

      <div>
        <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description:</label>
        <textarea id="description" v-model="editableDocument.description" rows="3" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
      </div>

      <div>
        <label for="status" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Status:</label>
        <select id="status" v-model="editableDocument.status" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
          <option value="DISABLED">DISABLED</option>
        </select>
      </div>
      
      <div>
        <label for="accuracyScore" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Accuracy Score (0-1):</label>
        <input type="number" id="accuracyScore" v-model.number="editableDocument.accuracyScore" min="0" max="1" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
      </div>

      <div>
        <label for="calibrationScore" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Calibration Score (min 0):</label>
        <input type="number" id="calibrationScore" v-model.number="editableDocument.calibrationScore" min="0" step="0.01" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
      </div>

      <fieldset v-if="editableDocument.type === 'AI'" class="mt-4 p-3 border dark:border-gray-600 rounded-md">
        <legend class="text-md font-medium text-gray-800 dark:text-gray-200 px-1">AI Model Details</legend>
        <div class="space-y-3 mt-2">
          <div>
            <label for="modelFamily" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Model Family:</label>
            <input type="text" id="modelFamily" v-model="editableDocument.modelDetails.family" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          </div>
          <div>
            <label for="modelVersion" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Model Version:</label>
            <input type="text" id="modelVersion" v-model="editableDocument.modelDetails.version" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
          </div>
          <div>
            <label for="modelToolNotes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Tool Notes:</label>
            <textarea id="modelToolNotes" v-model="editableDocument.modelDetails.toolNotes" rows="2" class="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
          </div>
        </div>
      </fieldset>
      <div v-else>
        <!-- Ensure modelDetails is cleared or handled if type changes from AI -->
      </div>

      <!-- Save/Cancel Buttons -->
      <div class="pt-4 flex justify-end space-x-3">
        <button 
            type="button" 
            @click="onCancel"
            class="px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
        >
            Cancel
        </button>
        <button 
            type="submit"
            :disabled="saving || !isDirty"
            class="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 dark:focus:ring-offset-gray-800"
        >
            {{ saving ? 'Saving...' : 'Save Forecaster' }}
        </button>
      </div>
      <div v-if="saveError" class="mt-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
        Save error: {{ saveErrorDetails }}
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, onMounted } from 'vue';
import _ from 'lodash'; // For deep copying and comparison

const props = defineProps({
  document: { // This could be a new object {} or an existing document
    type: Object,
    default: () => ({})
  },
  collectionName: {
    type: String,
    required: true
  },
  saving: Boolean,
  saveError: [Object, String, Error, null]
});

const emit = defineEmits(['save', 'cancel']);

const initialDocumentState = ref(null);
const editableDocument = reactive({});

const isDirty = computed(() => {
  if (!initialDocumentState.value) return false; // Not initialized yet
  return !_.isEqual(initialDocumentState.value, editableDocument);
});

const saveErrorDetails = computed(() => {
  if (!props.saveError) return null;
  if (typeof props.saveError === 'string') return props.saveError;
  if (props.saveError.data && props.saveError.data.message) return props.saveError.data.message;
  if (props.saveError.message) return props.saveError.message;
  return 'An unknown error occurred.';
});

function initializeForm(docData) {
  const defaults = {
    name: '',
    type: 'AI',
    avatar: '',
    description: '',
    status: 'ACTIVE',
    userId: null,
    accuracyScore: null,
    calibrationScore: null,
    modelDetails: {
      family: '',
      version: '',
      toolNotes: ''
    }
  };
  // Deep clone and merge with defaults to ensure all fields are present
  const dataToEdit = _.merge({}, defaults, _.cloneDeep(docData));
  
  // Ensure modelDetails is an object
  if (!dataToEdit.modelDetails || typeof dataToEdit.modelDetails !== 'object') {
    dataToEdit.modelDetails = { ...defaults.modelDetails };
  }
  
  Object.assign(editableDocument, dataToEdit);
  initialDocumentState.value = _.cloneDeep(dataToEdit);
}

// Initialize when the component mounts or the document prop changes
onMounted(() => {
  initializeForm(props.document);
});

watch(() => props.document, (newDoc) => {
  initializeForm(newDoc);
}, { deep: true });

// Watch for type changes to manage modelDetails and userId
watch(() => editableDocument.type, (newType) => {
  if (newType === 'HUMAN') {
    // Clear AI-specific modelDetails if switching to HUMAN
    // editableDocument.modelDetails = { family: '', version: '', toolNotes: '' };
     // Keep modelDetails, but they won't be shown for HUMAN, schema should handle this
  } else if (newType === 'AI') {
    // Clear userId if switching to AI
    editableDocument.userId = null;
    // Ensure modelDetails object exists
    if (!editableDocument.modelDetails || typeof editableDocument.modelDetails !== 'object') {
         editableDocument.modelDetails = { family: '', version: '', toolNotes: '' };
    }
  }
});

const onSave = () => {
  if (!isDirty.value && props.document?._id) { // If not dirty and it's an existing doc, don't save
    console.log("ForecasterEditor: No changes to save.");
    // emit('cancel'); // Or provide some feedback
    return;
  }

  const payload = { ...editableDocument };

  // Clean up payload based on type
  if (payload.type === 'AI') {
    delete payload.userId; // Remove userId if type is AI
    if (!payload.modelDetails || typeof payload.modelDetails !== 'object'){
        payload.modelDetails = {}; // ensure it's an object
    }
  } else if (payload.type === 'HUMAN') {
    // Remove modelDetails if type is HUMAN - Mongoose schema should handle this, but good practice
    // payload.modelDetails = {}; // Or delete payload.modelDetails;
    if (!payload.userId) {
        // Optionally handle error: User ID is required for HUMAN type
        // For now, let server-side validation catch it.
    }
  }
  
  // Remove empty strings for optional number fields, convert to null for DB
  if (payload.accuracyScore === '') payload.accuracyScore = null;
  if (payload.calibrationScore === '') payload.calibrationScore = null;

  emit('save', payload);
};

const onCancel = () => {
  emit('cancel');
};

</script>

<style scoped>
/* Add any specific styling if needed */
</style> 