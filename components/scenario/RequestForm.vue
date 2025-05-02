<template>
  <!-- Form structure copied from pages/scenarios/request.vue -->
  <!-- We'll wrap it slightly differently if needed for embedding -->
  <div class="p-4 lg:p-0">
    <h1 class="text-2xl font-bold mb-4 text-primary-700 dark:text-primary-300">
      {{ articleTitleFromQuery ? 'Request Related Forecast' : 'Request a New Scenario' }}
    </h1>
    <p class="text-base text-fg-muted mb-6">
      Propose a question about a future event. If accepted, we'll work on generating a probabilistic forecast.
    </p>

    <!-- Show Form or Success Message -->
    <form @submit.prevent="submitForm" class="space-y-6">
       <!-- Combined Form Sections into One Card/Area -->
       <!-- Removed outer card bg/border - parent container handles styling -->
       <div>
        <!-- Display Article Title if provided -->
        <div v-if="articleTitleFromQuery" class="pb-4 mb-4 border-b border-bg-muted">
          <label class="block text-sm font-medium text-fg mb-1">Related Article</label>
          <div class="bg-bg-input border border-fg-muted/20 rounded-md px-3 py-2 cursor-not-allowed">
            <h2 class="text-fg truncate text-primary text-sm italic" :title="articleTitleFromQuery">
              {{ articleTitleFromQuery }}
            </h2>
          </div>
        </div>

        <div class="space-y-6"> 
          <!-- Section 1: The Question -->
          <section>
            <h2 class="text-lg font-semibold mb-2 flex items-center">
              <Icon name="heroicons:question-mark-circle-solid" class="w-5 h-5 mr-2 text-primary opacity-80" />
              Forecast Question
            </h2>
            <p class="text-xs text-fg-muted mb-3">Clearly state the question (unambiguous, answerable Yes/No or with value/date).</p>
            <div>
              <label for="request-question" class="block text-sm font-medium text-fg mb-1">Question</label>
              <textarea
                id="request-question" 
                v-model="formData.question"
                rows="3"
                required
                class="w-full text-sm px-3 py-1.5 border border-fg-muted/30 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-bg text-fg placeholder-fg-muted/50"
                placeholder="e.g., Will SpaceX land humans on Mars by 2030?"
              ></textarea>
            </div>
          </section>

          <!-- Section 2: Context/Description -->
          <section>
            <h2 class="text-lg font-semibold mb-2 flex items-center">
              <Icon name="heroicons:information-circle-solid" class="w-5 h-5 mr-2 text-primary opacity-80" />
              Background & Context
            </h2>
            <p class="text-xs text-fg-muted mb-3">Provide context, importance, relevant links.</p>
            <div>
              <label for="request-description" class="block text-sm font-medium text-fg mb-1">Description (Optional)</label>
              <textarea
                id="request-description"
                v-model="formData.description"
                rows="4"
                class="w-full text-sm px-3 py-1.5 border border-fg-muted/30 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-bg text-fg placeholder-fg-muted/50"
                placeholder="Explain why this forecast is relevant..."
              ></textarea>
            </div>
          </section>

          <!-- Section 3: Resolution -->
          <section>
            <h2 class="text-lg font-semibold mb-2 flex items-center text-primary-700 dark:text-primary-300">
              <Icon name="heroicons:check-circle-solid" class="w-5 h-5 mr-2" />
              Resolution Criteria & Date
            </h2>
            <p class="text-xs text-fg-muted mb-3"><strong class="font-medium text-fg">Crucial:</strong> Define clear, objective criteria & sources.</p>

            <div class="mb-4">
              <label for="request-resolutionCriteria" class="block text-sm font-medium text-fg mb-1">Resolution Criteria</label>
              <textarea
                id="request-resolutionCriteria"
                v-model="formData.resolutionCriteria"
                rows="5"
                required
                class="w-full text-sm px-3 py-1.5 border border-fg-muted/30 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-bg text-fg placeholder-fg-muted/50"
                placeholder="Define exactly how the question will be answered..."
              ></textarea>
            </div>

            <div>
              <label for="request-resolutionDate" class="block text-sm font-medium text-fg mb-1">Latest Resolution Date</label>
               <p class="text-xs text-fg-muted mb-2">When should the question finally resolve if the event hasn't occurred?</p>
              <input
                type="date" 
                id="request-resolutionDate"
                v-model="formData.resolutionDate"
                required
                :min="minDate" 
                class="w-full md:w-auto text-sm px-3 py-1.5 border border-fg-muted/30 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-bg text-fg"
              />
            </div>
          </section>
        </div>
       </div>

      <!-- Submission Area -->
      <div class="pt-6 flex items-center justify-end gap-3">
         <!-- Add a Cancel button -->
         <button
            type="button"
            @click="cancelForm"
            :disabled="isSubmitting"
            class="inline-flex justify-center py-2 px-5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-fg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            Cancel
          </button>
        <button
          type="submit"
          :disabled="isSubmitting"
          class="inline-flex justify-center items-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon v-if="isSubmitting" name="line-md:loading-twotone-loop" class="w-4 h-4 mr-2 animate-spin" />
          {{ isSubmitting ? 'Submitting...' : 'Submit Request' }}
        </button>
      </div>

      <!-- Response Area -->
      <div ref="errorMessageRef"
           v-if="submissionStatus && !showRevisionDialog && (submissionStatus === 'error' || submissionStatus === 'rejected')" 
           class="mt-4 p-3 rounded-md border text-sm flex items-start gap-2"
           :class="submissionClass"> 
          <Icon 
            :name="submissionStatus === 'rejected' ? 'heroicons:no-symbol' : 'heroicons:exclamation-triangle'" 
            class="w-5 h-5 flex-shrink-0 mt-0.5"
           />
           <p class="leading-relaxed">{{ submissionMessage }}</p>
      </div>

    </form>

    <!-- Revision Suggestion Modal (kept for API consistency) -->
     <div v-if="showRevisionDialog && revisedData" 
         class="fixed inset-0 z-[60] overflow-y-auto bg-black/60 flex items-center justify-center p-4"
         @click.self="closeRevisionDialog"> 
      <div class="bg-article rounded-lg shadow-xl max-w-2xl w-full border border-bg-muted overflow-hidden">
        <div class="p-6">
           <h2 class="text-xl font-semibold mb-4 flex items-center text-fg">
            <Icon name="heroicons:light-bulb" class="w-6 h-6 mr-2 text-primary" />
            Suggestion for Improvement
          </h2>
          <p class="text-sm text-fg-muted mb-4">
            {{ revisionExplanation || 'We suggest some changes to clarify your request:' }}
          </p>
          <div class="space-y-4 bg-bg/50 dark:bg-bg-muted/20 p-4 rounded border border-bg-muted mb-6 max-h-60 overflow-y-auto">
            <!-- ... revision display logic ... -->
             <h3 class="text-lg font-medium text-fg">Proposed Changes:</h3>
            <div v-if="revisedData.question !== formData.question">
              <p class="text-xs font-medium text-fg-muted uppercase tracking-wider">Question:</p>
              <p class="line-through text-fg-muted/70">{{ formData.question }}</p>
              <p class="text-primary font-medium">{{ revisedData.question }}</p>
            </div>
            <div v-if="revisedData.resolutionCriteria !== formData.resolutionCriteria" class="mt-2">
              <p class="text-xs font-medium text-fg-muted uppercase tracking-wider">Resolution Criteria:</p>
              <pre class="whitespace-pre-wrap text-xs line-through text-fg-muted/70 p-2 bg-fg-muted/5 rounded">{{ formData.resolutionCriteria }}</pre>
              <pre class="whitespace-pre-wrap text-xs text-primary font-medium p-2 bg-primary/5 rounded border border-primary/20 mt-1">{{ revisedData.resolutionCriteria }}</pre>
            </div>
          </div>
           <!-- Show error message within the dialog if submission fails -->
           <div v-if="submissionStatus === 'error' && submissionMessage" 
               class="mb-4 p-3 rounded-md border text-sm flex items-start gap-2"
               :class="submissionClass">
                <Icon 
                name="heroicons:exclamation-triangle" 
                class="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5"
               />
               <p class="leading-relaxed">{{ submissionMessage }}</p>
          </div>
        </div>
        <div class="bg-bg-muted px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            @click="acceptRevision"
            type="button"
            :disabled="isSubmitting"
            class="order-1 sm:order-2 inline-flex items-center justify-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon v-if="isSubmitting" name="line-md:loading-twotone-loop" class="w-4 h-4 mr-2 animate-spin" />
            Accept & Submit
          </button>
          <button
            @click="closeRevisionDialog"
            type="button"
            :disabled="isSubmitting"
            class="order-2 sm:order-1 inline-flex justify-center py-2 px-5 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-fg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            Edit My Request
          </button>
        </div>
      </div>
    </div>

  </div> 
</template>

<script setup>
import { ref, computed, nextTick, defineProps, defineEmits, watch } from 'vue';

// Define props
const props = defineProps({
  articleId: {
    type: String,
    default: null
  },
  articleTitle: {
    type: String,
    default: null
  }
});

// Define emits
const emit = defineEmits(['submitted', 'cancelled']);

// Form state - use props for initial values if provided
const formData = ref({
  question: '',
  description: '',
  resolutionCriteria: '',
  resolutionDate: ''
});

const isSubmitting = ref(false);
const submissionStatus = ref(null); // 'success', 'error', 'rejected', 'revision_needed'
const submissionMessage = ref('');

// State for revision handling
const showRevisionDialog = ref(false);
const revisedData = ref(null);
const revisionExplanation = ref('');

// Use props directly in template or computed properties
const articleIdFromQuery = computed(() => props.articleId);
const articleTitleFromQuery = computed(() => props.articleTitle);

// Declare the template ref
const errorMessageRef = ref(null);

// Calculate minimum date
const minDate = computed(() => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const localDate = new Date(today.getTime() - offset);
  return localDate.toISOString().split('T')[0];
});

// Submit function - adapted for component context
async function submitForm() {
  isSubmitting.value = true;
  submissionStatus.value = null;
  submissionMessage.value = '';
  showRevisionDialog.value = false;
  revisedData.value = null;
  revisionExplanation.value = '';

  const payload = {
    ...formData.value,
    ...(articleIdFromQuery.value && { articleId: articleIdFromQuery.value })
  };

  console.log('Submitting form data (from component):', JSON.parse(JSON.stringify(payload)));

  try {
    const result = await $fetch('/api/scenarios/request', {
      method: 'POST',
      body: payload,
    });

    console.log('API Response:', result);
    if (result.status === 'success') {
      submissionStatus.value = 'success';
      submissionMessage.value = result.message;
      emit('submitted', result.message || 'Request submitted successfully!');
      resetFormFields();
    } else if (result.status === 'revision_needed') {
      submissionStatus.value = 'revision_needed';
      revisedData.value = result.revisedData;
      revisionExplanation.value = result.explanation;
      showRevisionDialog.value = true;
    } else if (result.status === 'rejected') {
      submissionStatus.value = 'rejected';
      submissionMessage.value = result.message || 'Your request was rejected.';
      nextTick(() => { errorMessageRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    } else {
      submissionStatus.value = 'error';
      submissionMessage.value = result.message || 'Received an unexpected response status.';
      nextTick(() => { errorMessageRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    }

  } catch (err) {
     console.error('Network/Server Error submitting request (raw error object):', err);
     console.error('Error data payload (if any):', err.data);
     submissionStatus.value = 'error';
     submissionMessage.value = err.data?.message || 'A network or server error occurred.';
     nextTick(() => { errorMessageRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  } finally {
    isSubmitting.value = false;
  }
}

// Accept revision function - adapted for component
async function acceptRevision() {
  if (!revisedData.value) return;

  isSubmitting.value = true;
  submissionStatus.value = null;
  submissionMessage.value = '';

  const payload = {
    ...revisedData.value,
    isRevisionConfirmation: true,
    ...(articleIdFromQuery.value && { articleId: articleIdFromQuery.value })
  };
   if (revisedData.value.articleId && !payload.articleId) {
     payload.articleId = revisedData.value.articleId;
   }

  console.log('Accepting and resubmitting revised data (from component):', JSON.parse(JSON.stringify(payload)));

  try {
    const result = await $fetch('/api/scenarios/request', {
      method: 'POST',
      body: payload,
    });

    if (result.status === 'success') {
      showRevisionDialog.value = false;
      submissionStatus.value = 'success';
      submissionMessage.value = result.message || 'Revised request accepted!';
      emit('submitted', submissionMessage.value);
      resetFormFields();
    } else {
      submissionStatus.value = 'error';
      submissionMessage.value = result.message || 'Unexpected response after revision.';
      showRevisionDialog.value = false; 
    }

  } catch (err) {
    console.error('Error submitting accepted revision:', err);
    submissionStatus.value = 'error';
    submissionMessage.value = err.data?.message || 'Error submitting revised request.';
    // Keep dialog open on error
  } finally {
    isSubmitting.value = false;
  }
}

// Close revision dialog function
function closeRevisionDialog() {
  showRevisionDialog.value = false;
}

// Function to reset internal form fields
function resetFormFields() {
  formData.value = { question: '', description: '', resolutionCriteria: '', resolutionDate: '' };
  submissionStatus.value = null;
  submissionMessage.value = '';
  showRevisionDialog.value = false;
  revisedData.value = null;
  revisionExplanation.value = '';
  isSubmitting.value = false;
}

// Function for the Cancel button
function cancelForm() {
  resetFormFields(); // Clear fields
  emit('cancelled'); // Notify parent to close/hide the form
}

// Computed class for message styling
const submissionClass = computed(() => {
  switch (submissionStatus.value) {
    case 'success': // Success is handled by emitting event now
      return ''; 
    case 'error':
    case 'rejected':
      return 'bg-red-100 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300';
    case 'revision_needed':
      // This status now only controls the modal visibility
      return ''; 
    default:
      return '';
  }
});

// Watch props if they might change after mount (optional, depends on parent)
// watch(() => props.articleId, (newVal) => { /* maybe update state */ });
// watch(() => props.articleTitle, (newVal) => { /* maybe update state */ });

</script>

<style scoped>
/* Styles from original page */
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(0.6);
}
.dark input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(0.8);
}
</style> 