<template>
  <div class="generic-json-editor">
    <h3 class="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
      Editing {{ collectionName }}: <code class="text-sm bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">{{ document._id }}</code>
    </h3>

    <div class="mb-4">
      <label for="jsonEditor" class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        Edit JSON Data
        <span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
          (Be careful with syntax - data must be valid JSON)
        </span>
      </label>
      
      <div class="relative">
        <textarea
          id="jsonEditor"
          v-model="jsonContent"
          rows="20"
          class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono text-sm"
          :class="{ 'border-red-300 dark:border-red-700': jsonError }"
          @input="checkJson"
          placeholder="Edit the document data in JSON format"
        ></textarea>
        
        <div 
          v-if="jsonError" 
          class="absolute right-0 bottom-0 m-2 px-3 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-xs rounded-md shadow"
        >
          {{ jsonError }}
        </div>
      </div>
    </div>
    
    <div class="mb-4">
      <label class="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Field Explorer</label>
      
      <div class="border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4 overflow-x-auto">
        <!-- Only show this when we have parsed data -->
        <div v-if="!jsonError">
          <div 
            v-for="(value, key) in parsedDocument" 
            :key="key"
            class="mb-2 border-b dark:border-gray-700 pb-2 last:border-b-0 last:pb-0 last:mb-0"
          >
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium">{{ key }}:</span>
              <span 
                v-if="isSimpleType(value)"
                :class="{
                  'text-blue-600 dark:text-blue-400': typeof value === 'number',
                  'text-green-600 dark:text-green-400': typeof value === 'string',
                  'text-purple-600 dark:text-purple-400': typeof value === 'boolean',
                  'italic text-gray-500': value === null
                }"
              >
                {{ formatSimpleValue(value) }}
              </span>
              <span v-else-if="Array.isArray(value)" class="text-gray-500 dark:text-gray-400">
                Array [{{ value.length }} item{{ value.length !== 1 ? 's' : '' }}]
              </span>
              <span v-else class="text-gray-500 dark:text-gray-400">Object</span>
            </div>
          </div>
        </div>
        
        <div v-else class="text-yellow-600 dark:text-yellow-400 text-sm">
          Fix JSON syntax errors to see field overview
        </div>
      </div>
    </div>
    
    <!-- Actions Buttons -->
    <div class="mt-6 pt-4 border-t dark:border-gray-700 flex flex-wrap gap-3">
      <button 
        @click="saveChanges" 
        :disabled="!!jsonError"
        class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:bg-gray-500"
      >
        Save Changes
      </button>
      <button 
        @click="formatJson" 
        :disabled="!!jsonError"
        class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:bg-gray-500"
      >
        Format JSON
      </button>
      <button 
        @click="cancel" 
        class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
      >
        Cancel
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  document: {
    type: Object,
    required: true
  },
  collectionName: {
    type: String,
    default: 'Document'
  }
});

const emit = defineEmits(['save', 'cancel']);

// Convert the document to a formatted JSON string
const jsonContent = ref(JSON.stringify(props.document, null, 2));
const jsonError = ref(null);
const parsedDocument = ref({...props.document});

// Watch for document changes from parent
watch(() => props.document, (newDoc) => {
  jsonContent.value = JSON.stringify(newDoc, null, 2);
  parsedDocument.value = {...newDoc};
  jsonError.value = null;
}, { deep: true });

// Check JSON on input
function checkJson() {
  try {
    parsedDocument.value = JSON.parse(jsonContent.value);
    jsonError.value = null;
  } catch (error) {
    jsonError.value = `Invalid JSON: ${error.message}`;
  }
}

// Format JSON nicely
function formatJson() {
  try {
    const parsed = JSON.parse(jsonContent.value);
    jsonContent.value = JSON.stringify(parsed, null, 2);
    jsonError.value = null;
  } catch (error) {
    jsonError.value = `Cannot format: ${error.message}`;
  }
}

// Helper to determine simple types
function isSimpleType(value) {
  return (
    typeof value === 'string' || 
    typeof value === 'number' || 
    typeof value === 'boolean' || 
    value === null
  );
}

// Format simple values for display
function formatSimpleValue(value) {
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  return String(value);
}

// Save changes
function saveChanges() {
  if (jsonError.value) return;
  
  try {
    const updatedDoc = JSON.parse(jsonContent.value);
    emit('save', updatedDoc);
  } catch (error) {
    jsonError.value = `Save error: ${error.message}`;
  }
}

function cancel() {
  emit('cancel');
}
</script>

<style scoped>
/* Add custom styling if needed */
</style> 