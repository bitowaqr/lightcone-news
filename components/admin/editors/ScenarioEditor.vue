<template>
  <div class="scenario-editor">
    <h3 class="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
      Editing Scenario: <code class="text-sm bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">{{ document._id }}</code>
    </h3>

    <div class="grid grid-cols-1 gap-6">
      <!-- Left Column - Basic Info -->
      <div>
        <!-- Question -->
        <div class="mb-4">
          <label for="question" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Question</label>
          <textarea
            id="question"
            v-model="editableDoc.question"
            rows="2"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            :class="{ 'border-red-300 dark:border-red-700': validationErrors.question }"
          ></textarea>
          <p v-if="validationErrors.question" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.question }}</p>
        </div>

        <!-- Description and Resolution Criteria (with Markdown) -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
          <MarkdownEditor v-model="editableDoc.description" />
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Resolution Criteria</label>
          <MarkdownEditor v-model="editableDoc.resolutionCriteria" />
        </div>

        <!-- Scenario Type -->
        <div class="mb-4">
          <label for="scenarioType" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Scenario Type</label>
          <select
            id="scenarioType"
            v-model="editableDoc.scenarioType"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            :class="{ 'border-red-300 dark:border-red-700': validationErrors.scenarioType }"
          >
            <option value="BINARY">Binary (Yes/No)</option>
            <option value="CATEGORICAL">Categorical (Multiple choices)</option>
            <option value="NUMERIC">Numeric (Range)</option>
            <option value="DATE">Date</option>
          </select>
          <p v-if="validationErrors.scenarioType" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.scenarioType }}</p>
        </div>
      </div>
      
      <!-- Right Column - Platform Info & Dates -->
      <div>
        <!-- Platform Info -->
        <div class="mb-4">
          <label for="platform" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Platform</label>
          <input
            id="platform"
            v-model="editableDoc.platform"
            placeholder="Metaculus, Polymarket, Manifold, etc."
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div class="mb-4">
          <label for="url" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">URL</label>
          <input
            id="url"
            v-model="editableDoc.url"
            placeholder="https://example.com/scenario"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div class="mb-4">
          <label for="platformScenarioId" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Platform Scenario ID</label>
          <input
            id="platformScenarioId"
            v-model="editableDoc.platformScenarioId"
            placeholder="External ID"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        <!-- Key Dates -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="mb-4">
            <label for="openDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Open Date</label>
            <input
              id="openDate"
              type="datetime-local"
              v-model="openDateFormatted"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <div class="mb-4">
            <label for="closeDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Close Date</label>
            <input
              id="closeDate"
              type="datetime-local"
              v-model="closeDateFormatted"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <!-- Resolution Status -->
        <div class="mb-4">
          <label for="resolutionStatus" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Resolution Status</label>
          <select
            id="resolutionStatus"
            v-model="editableDoc.resolutionData.status"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="RESOLVING">Resolving</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Probability/Value Sections - Varies based on scenario type -->
    <div class="mt-6 border-t pt-4 dark:border-gray-700">
      <h4 class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">
        Prediction Data 
        <span class="text-xs text-gray-500 dark:text-gray-400">({{ editableDoc.scenarioType }})</span>
      </h4>

      <!-- For Binary Scenarios -->
      <div v-if="editableDoc.scenarioType === 'BINARY'" class="mb-4">
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Current Probability (0-1)
        </label>
        <div class="grid grid-cols-6 gap-4">
          <div class="col-span-2">
            <input
              type="number"
              v-model.number="editableDoc.currentProbability"
              min="0"
              max="1"
              step="0.01"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div class="col-span-4 flex items-center">
            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
              <div 
                class="bg-blue-600 h-4 rounded-full" 
                :style="{ width: `${Math.min(Math.max(editableDoc.currentProbability || 0, 0), 1) * 100}%` }"
              ></div>
            </div>
            <span class="ml-2 text-sm">{{ ((editableDoc.currentProbability || 0) * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>

      <!-- For Categorical Scenarios -->
      <div v-if="editableDoc.scenarioType === 'CATEGORICAL'" class="mb-4">
        <div class="flex justify-between items-center mb-2">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Options & Probabilities
          </label>
          <button 
            @click="addCategoricalOption" 
            class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
          >
            + Add Option
          </button>
        </div>
        
        <div 
          v-for="(option, index) in editableDoc.options" 
          :key="index" 
          class="mb-2 grid grid-cols-6 gap-2 items-center"
        >
          <div class="col-span-3">
            <input
              v-model="option.name"
              placeholder="Option name"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>
          <div class="col-span-2">
            <input
              type="number"
              v-model.number="option.probability"
              min="0"
              max="1"
              step="0.01"
              placeholder="Probability (0-1)"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
            />
          </div>
          <div class="col-span-1">
            <button 
              @click="removeCategoricalOption(index)" 
              class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm"
              title="Remove option"
            >✕</button>
          </div>
        </div>
      </div>

      <!-- For Numeric Scenarios -->
      <div v-if="editableDoc.scenarioType === 'NUMERIC'" class="mb-4">
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Current Value</label>
        <input
          type="number"
          v-model.number="editableDoc.currentValue"
          class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      </div>

      <!-- For Date Scenarios -->
      <div v-if="editableDoc.scenarioType === 'DATE'" class="mb-4">
        <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Current Date Value</label>
        <input
          type="date"
          v-model="dateValueFormatted"
          class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
      </div>
    </div>

    <!-- Resolution Data -->
    <div class="mt-6 border-t pt-4 dark:border-gray-700" v-if="showResolutionDetails">
      <h4 class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">Resolution Details</h4>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div class="mb-4">
            <label for="resolutionDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Resolution Date</label>
            <input
              id="resolutionDate"
              type="datetime-local"
              v-model="resolutionDateFormatted"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          
          <!-- Resolution Value - varies by type -->
          <div class="mb-4">
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Resolution Value
              <span class="text-xs text-gray-500 dark:text-gray-400">(for {{ editableDoc.scenarioType }})</span>
            </label>
            
            <div v-if="editableDoc.scenarioType === 'BINARY'">
              <select
                v-model.number="editableDoc.resolutionData.resolutionValue"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option :value="null">Not Yet Resolved</option>
                <option :value="1">Yes (1)</option>
                <option :value="0">No (0)</option>
              </select>
            </div>
            
            <div v-else-if="editableDoc.scenarioType === 'CATEGORICAL'">
              <select
                v-model="editableDoc.resolutionData.resolutionValue"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                <option :value="null">Not Yet Resolved</option>
                <option 
                  v-for="(option, index) in editableDoc.options" 
                  :key="index" 
                  :value="option.name"
                >
                  {{ option.name }}
                </option>
              </select>
            </div>
            
            <div v-else-if="editableDoc.scenarioType === 'NUMERIC'">
              <input
                type="number"
                v-model.number="editableDoc.resolutionData.resolutionValue"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
            
            <div v-else-if="editableDoc.scenarioType === 'DATE'">
              <input
                type="date"
                v-model="resolutionValueDateFormatted"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              />
            </div>
          </div>
        </div>

        <!-- Resolution Sources -->
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Resolution Sources 
            </label>
            <button 
              @click="addResolutionSource" 
              class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
            >
              + Add Source
            </button>
          </div>
          
          <div 
            v-for="(source, index) in editableDoc.resolutionData.resolutionSources" 
            :key="index" 
            class="mb-2 p-2 border rounded dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
          >
            <div class="flex justify-between mb-1">
              <h5 class="text-sm font-medium">Source #{{ index + 1 }}</h5>
              <button 
                @click="removeResolutionSource(index)" 
                class="px-1.5 py-0.5 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-xs"
              >✕</button>
            </div>
            
            <div class="grid grid-cols-2 gap-2">
              <div class="col-span-2">
                <input
                  v-model="editableDoc.resolutionData.resolutionSources[index].name"
                  placeholder="Source name"
                  class="w-full px-3 py-1 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
              <div class="col-span-2">
                <input
                  v-model="editableDoc.resolutionData.resolutionSources[index].url"
                  placeholder="Source URL (optional)"
                  class="w-full px-3 py-1 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
              <div>
                <input
                  v-model="editableDoc.resolutionData.resolutionSources[index].type"
                  placeholder="Source type (required)"
                  class="w-full px-3 py-1 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
              <div>
                <input
                  v-model="editableDoc.resolutionData.resolutionSources[index].originalId"
                  placeholder="Original ID (optional)"
                  class="w-full px-3 py-1 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Related Articles -->
    <div class="mt-6 border-t pt-4 dark:border-gray-700">
      <div class="flex justify-between items-center mb-2">
        <h4 class="text-md font-medium text-gray-700 dark:text-gray-300">Related Articles</h4>
        <button 
          @click="addArticleId" 
          class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
        >
          + Add Article ID
        </button>
      </div>
      
      <div 
        v-for="(articleId, index) in editableDoc.relatedArticleIds" 
        :key="index" 
        class="mb-2 flex items-center gap-2"
      >
        <input
          v-model="editableDoc.relatedArticleIds[index]"
          placeholder="Article ID"
          class="flex-grow px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
        />
        <button 
          @click="removeArticleId(index)" 
          class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm"
        >✕</button>
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

// Ensure nested objects exist
if (!editableDoc.resolutionData) {
  editableDoc.resolutionData = {
    status: 'OPEN',
    resolutionDate: null,
    resolutionValue: null,
    resolutionSources: []
  };
}

// Computed showing resolution details
const showResolutionDetails = computed(() => {
  return ['RESOLVING', 'RESOLVED'].includes(editableDoc.resolutionData?.status);
});

// Date formatted values
const formatDateTimeLocal = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().slice(0, 16);
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toISOString().slice(0, 10);
};

// Computed properties for date formatting
const openDateFormatted = computed({
  get() { return formatDateTimeLocal(editableDoc.openDate); },
  set(value) { editableDoc.openDate = value ? new Date(value).toISOString() : null; }
});

const closeDateFormatted = computed({
  get() { return formatDateTimeLocal(editableDoc.closeDate); },
  set(value) { editableDoc.closeDate = value ? new Date(value).toISOString() : null; }
});

const resolutionDateFormatted = computed({
  get() { return formatDateTimeLocal(editableDoc.resolutionData?.resolutionDate); },
  set(value) { 
    if (!editableDoc.resolutionData) editableDoc.resolutionData = {};
    editableDoc.resolutionData.resolutionDate = value ? new Date(value).toISOString() : null; 
  }
});

const dateValueFormatted = computed({
  get() { 
    return typeof editableDoc.currentValue === 'string' 
      ? formatDate(editableDoc.currentValue) 
      : '';
  },
  set(value) { 
    editableDoc.currentValue = value ? new Date(value).toISOString() : null; 
  }
});

const resolutionValueDateFormatted = computed({
  get() { 
    return typeof editableDoc.resolutionData?.resolutionValue === 'string' 
      ? formatDate(editableDoc.resolutionData.resolutionValue) 
      : '';
  },
  set(value) { 
    if (!editableDoc.resolutionData) editableDoc.resolutionData = {};
    editableDoc.resolutionData.resolutionValue = value ? new Date(value).toISOString() : null; 
  }
});

// Helper functions for array management
function addCategoricalOption() {
  if (!editableDoc.options) editableDoc.options = [];
  editableDoc.options.push({ name: '', probability: 0 });
}

function removeCategoricalOption(index) {
  editableDoc.options.splice(index, 1);
}

function addResolutionSource() {
  if (!editableDoc.resolutionData) editableDoc.resolutionData = {};
  if (!editableDoc.resolutionData.resolutionSources) editableDoc.resolutionData.resolutionSources = [];
  
  editableDoc.resolutionData.resolutionSources.push({ 
    name: '', 
    type: '', 
    url: '',
    originalId: ''
  });
}

function removeResolutionSource(index) {
  editableDoc.resolutionData.resolutionSources.splice(index, 1);
}

function addArticleId() {
  if (!editableDoc.relatedArticleIds) editableDoc.relatedArticleIds = [];
  editableDoc.relatedArticleIds.push('');
}

function removeArticleId(index) {
  editableDoc.relatedArticleIds.splice(index, 1);
}

// Validation
function validate() {
  validationErrors.question = !editableDoc.question?.trim() ? 'Question is required' : null;
  validationErrors.scenarioType = !editableDoc.scenarioType ? 'Scenario type is required' : null;
  
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
  
  // Ensure nested objects exist after update
  if (!editableDoc.resolutionData) {
    editableDoc.resolutionData = {
      status: 'OPEN',
      resolutionDate: null,
      resolutionValue: null,
      resolutionSources: []
    };
  }
}, { deep: true });

// Initialize
onMounted(() => {
  // Ensure arrays exist
  if (!editableDoc.options) editableDoc.options = [];
  if (!editableDoc.relatedArticleIds) editableDoc.relatedArticleIds = [];
  if (!editableDoc.resolutionData) editableDoc.resolutionData = {};
  if (!editableDoc.resolutionData.resolutionSources) editableDoc.resolutionData.resolutionSources = [];
  
  // Reset errors when mounted
  Object.keys(validationErrors).forEach(key => {
    validationErrors[key] = null;
  });
});
</script> 