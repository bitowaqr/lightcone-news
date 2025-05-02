<template>
  <div class="container mx-auto py-8 md:py-12 max-w-3xl">
    <!-- Removed Article Title display from here -->

    <h1 class="text-3xl font-bold mb-4 px-4 sm:px-0 text-primary-700 dark:text-primary-300">
      {{ articleTitleFromQuery ? 'Request Related Forecast' : 'Request a Forecast' }}
    </h1>
    <p class="text-lg text-fg-muted mb-8 px-4 sm:px-0" v-if="!requestSubmittedSuccessfully">
      Propose a question about a future event. If accepted, we'll work on generating a probabilistic forecast.
    </p>

    <!-- Show Form or Success Message -->
    <form @submit.prevent="submitForm" class="space-y-8" v-if="!requestSubmittedSuccessfully">
      <!-- Combined Form Sections into One Card -->
      <div class="bg-article px-0 sm:px-6 md:px-8 pt-6 sm:rounded-lg shadow-sm border border-bg-muted">

        <!-- Display Article Title inside the card -->
        <div v-if="articleTitleFromQuery" class="pb-5 mb-6 border-b border-bg-muted px-4 sm:px-0">
          <!-- Apply standard label styles -->
          <label class="block text-sm font-medium text-fg mb-1">Related Article</label>
          <!-- Input-like container for the title using the new explicit variable -->
          <div class="bg-bg-input border border-fg-muted/20 rounded-md px-3 py-2 cursor-not-allowed">
            <h2 class="text-fg truncate text-primary text-sm italic" :title="articleTitleFromQuery">
              {{ articleTitleFromQuery }}
            </h2>
          </div>
        </div>

        <div class="space-y-8 pb-6"> <!-- Added pb-6 here -->
          <!-- Section 1: The Question -->
          <section>
            <h2 class="text-xl font-semibold mb-4 flex items-center px-4 sm:px-0">
              <Icon name="heroicons:question-mark-circle-solid" class="w-6 h-6 mr-2 text-primary opacity-80" />
              Forecast Question
            </h2>
            <p class="text-sm text-fg-muted mb-4 px-4 sm:px-0">Clearly state the question to be forecasted. Make it unambiguous and answerable with a "Yes", "No", or a specific value/date. <span class="italic">Example: "Will AI achieve human-level intelligence (AGI) before January 1, 2035?"</span></p>
            <div class="px-4 sm:px-0">
              <label for="question" class="block text-sm font-medium text-fg mb-1">Question</label>
              <textarea
                id="question"
                v-model="formData.question"
                rows="3"
                required
                class="w-full px-3 py-2 border border-fg-muted/30 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-bg text-fg placeholder-fg-muted/50"
                placeholder="e.g., Will SpaceX land humans on Mars by 2030?"
              ></textarea>
            </div>
          </section>

          <hr class="border-bg-muted mx-4 sm:px-0" />

          <!-- Section 2: Context/Description -->
          <section>
            <h2 class="text-xl font-semibold mb-4 flex items-center px-4 sm:px-0">
              <Icon name="heroicons:information-circle-solid" class="w-6 h-6 mr-2 text-primary opacity-80" />
              Background & Context
            </h2>
            <p class="text-sm text-fg-muted mb-4 px-4 sm:px-0">Provide helpful background information, context, or why this question is important. Include links to relevant articles or sources if possible.</p>
            <div class="px-4 sm:px-0">
              <label for="description" class="block text-sm font-medium text-fg mb-1">Description (Optional)</label>
              <textarea
                id="description"
                v-model="formData.description"
                rows="5"
                class="w-full px-3 py-2 border border-fg-muted/30 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-bg text-fg placeholder-fg-muted/50"
                placeholder="Explain why this forecast is relevant..."
              ></textarea>
            </div>
          </section>

          <hr class="border-bg-muted mx-4 sm:px-0" />

          <!-- Section 3: Resolution -->
          <section>
            <h2 class="text-xl font-semibold mb-4 flex items-center text-primary-700 dark:text-primary-300 px-4 sm:px-0">
              <Icon name="heroicons:check-circle-solid" class="w-6 h-6 mr-2" />
              Resolution Criteria & Date
            </h2>
            <p class="text-sm text-fg-muted mb-4 px-4 sm:px-0"><strong class="font-medium text-fg">Crucial:</strong> How will we know for sure if the event happened? Define clear, objective criteria. Specify the source(s) of truth if applicable.</p>

            <div class="mb-6 px-4 sm:px-0">
              <label for="resolutionCriteria" class="block text-sm font-medium text-fg mb-1">Resolution Criteria</label>
              <textarea
                id="resolutionCriteria"
                v-model="formData.resolutionCriteria"
                rows="6"
                required
                class="w-full px-3 py-2 border border-fg-muted/30 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-bg text-fg placeholder-fg-muted/50"
                placeholder="Define exactly how the question will be answered. e.g., 'Resolves YES if a reputable news source (NYT, BBC, WSJ) confirms a successful crewed landing before the date. Resolves NO otherwise.'"
              ></textarea>
            </div>

            <div class="px-4 sm:px-0">
              <label for="resolutionDate" class="block text-sm font-medium text-fg mb-1">Latest Resolution Date</label>
               <p class="text-xs text-fg-muted mb-2">When should the question finally be resolved if the event hasn't occurred by then?</p>
              <input
                type="date" 
                id="resolutionDate"
                v-model="formData.resolutionDate"
                required
                :min="minDate" 
                class="w-full md:w-auto px-3 py-2 border border-fg-muted/30 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-bg text-fg"
              />
            </div>
          </section>
        </div>
      </div>

      <!-- Submission Area -->
      <div class="pt-4 text-right px-4 sm:px-0" v-if="!showRevisionDialog">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon v-if="isSubmitting" name="line-md:loading-twotone-loop" class="w-5 h-5 mr-2 animate-spin" />
          {{ isSubmitting ? 'Submitting...' : 'Submit Request' }}
        </button>
      </div>

      <!-- Response Area (for errors/rejections during form submission) -->
      <div ref="errorMessageRef"
           v-if="submissionStatus && !showRevisionDialog && (submissionStatus === 'error' || submissionStatus === 'rejected')" 
           class="mt-6 mx-0 sm:mx-4 p-4 sm:p-6 rounded-none sm:rounded-lg shadow-sm border border-primary-600 dark:border-primary-400 bg-bg-muted/60 dark:bg-bg-muted/40 text-fg flex items-start gap-3">
          <!-- Icon for visual cue -->
          <Icon 
            :name="submissionStatus === 'rejected' ? 'heroicons:no-symbol' : 'heroicons:exclamation-triangle'" 
            class="w-6 h-6 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5"
           />
           <!-- Message Content -->
          <p class="text-sm leading-relaxed">{{ submissionMessage }}</p>
      </div>

    </form>

    <!-- Success Message View -->
    <div v-else class="bg-article px-6 md:px-8 py-8 sm:rounded-lg shadow-sm border border-bg-muted text-center">
      <Icon name="heroicons:check-circle-solid" class="w-16 h-16 text-primary-500 mx-auto mb-4" />
      <h2 class="text-2xl font-semibold mb-3 text-fg">Request Submitted!</h2>
      <p class="text-lg text-fg-muted mb-6">
        {{ submissionMessage || 'Thank you for your forecast request.' }} We'll review it shortly.
        If accepted, we aim to generate the first forecast within 24-48 hours.
      </p>
      <div class="flex flex-col sm:flex-row justify-center gap-4">
         <button
            @click="goBack"
            type="button"
            class="order-1 inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Go Back
          </button>
          <button
            @click="resetForm"
            type="button"
            class="order-2 sm:order-1 inline-flex justify-center py-2 px-6 border border-primary text-primary hover:bg-primary/10 dark:hover:bg-primary/20 shadow-sm text-base font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Make Another Request
          </button>
      </div>
    </div>

    <!-- Revision Suggestion Modal -->
    <div v-if="showRevisionDialog && revisedData" 
         class="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-center justify-center p-4"
         @click.self="closeRevisionDialog"> 
         <!-- Close on backdrop click -->

      <div class="bg-article rounded-lg shadow-xl max-w-2xl w-full border border-bg-muted overflow-hidden">
        <div class="p-6">
           <h2 class="text-xl font-semibold mb-4 flex items-center text-fg">
            <Icon name="heroicons:light-bulb" class="w-6 h-6 mr-2 text-primary" />
            Suggestion for Improvement
          </h2>
          <p class="text-sm text-fg-muted mb-4">
            {{ revisionExplanation || 'We suggest some changes to clarify your request:' }}
          </p>

          <!-- Display changes (same as before) -->
          <div class="space-y-4 bg-bg/50 dark:bg-bg-muted/20 p-4 rounded border border-bg-muted mb-6 max-h-60 overflow-y-auto">
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
             <!-- Add displays for other fields if the agent might revise them -->
          </div>

          <!-- Show error message within the dialog if submission fails -->
          <div v-if="submissionStatus === 'error' && submissionMessage" 
               class="mb-4 p-4 rounded-md border border-primary-600 dark:border-primary-400 bg-bg-muted/60 dark:bg-bg-muted/40 text-fg flex items-start gap-3">
                <!-- Icon -->
               <Icon 
                name="heroicons:exclamation-triangle" 
                class="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5"
               />
               <!-- Message -->
               <p class="text-sm leading-relaxed">{{ submissionMessage }}</p>
          </div>

        </div>
          <!-- Modal Actions -->
        <div class="bg-bg-muted px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-end">
          <button
            @click="acceptRevision"
            type="button"
            :disabled="isSubmitting"
            class="order-1 sm:order-2 inline-flex items-center justify-center py-2 px-5 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon v-if="isSubmitting" name="line-md:loading-twotone-loop" class="w-5 h-5 mr-2 animate-spin" />
            Accept Suggestion & Submit
          </button>
          <button
            @click="closeRevisionDialog"
            type="button"
            :disabled="isSubmitting"
            class="order-2 sm:order-1 inline-flex justify-center py-2 px-5 border border-gray-300 dark:border-gray-600 shadow-sm text-base font-medium rounded-md text-fg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            Edit My Request
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
// useFetch is typically used in setup, $fetch is preferred in event handlers
// import { useFetch } from '#app';

const router = useRouter(); // Initialize router
const route = useRoute();   // Initialize route

// Read context from query parameters
const articleIdFromQuery = ref(route.query.articleId || null);
const articleTitleFromQuery = ref(route.query.articleTitle || null);

// Form state
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

// New state to control form vs success message visibility
const requestSubmittedSuccessfully = ref(false);

// Declare the template ref
const errorMessageRef = ref(null);

// Calculate minimum date for resolution (today) as YYYY-MM-DD
const minDate = computed(() => {
  const today = new Date();
  // Adjust for local timezone offset to get the correct local date
  const offset = today.getTimezoneOffset() * 60000; // offset in milliseconds
  const localDate = new Date(today.getTime() - offset);
  return localDate.toISOString().split('T')[0]; // Get YYYY-MM-DD part
});

// Placeholder submit function
async function submitForm() {
  isSubmitting.value = true;
  submissionStatus.value = null;
  submissionMessage.value = '';
  showRevisionDialog.value = false; // Reset revision dialog
  requestSubmittedSuccessfully.value = false; // Reset success state on new submission
  revisedData.value = null;
  revisionExplanation.value = '';

  const payload = {
    ...formData.value,
    // Include articleId if it exists
    ...(articleIdFromQuery.value && { articleId: articleIdFromQuery.value })
  };

  console.log('Submitting form data:', JSON.parse(JSON.stringify(payload)));

  try {
    // Use $fetch
    const result = await $fetch('/api/scenarios/request', {
      method: 'POST',
      body: payload,
    });

    // Handle different success statuses from the 200 OK response
    console.log('API Response:', result);
    if (result.status === 'success') {
      submissionStatus.value = 'success';
      submissionMessage.value = result.message;
      requestSubmittedSuccessfully.value = true;
    } else if (result.status === 'revision_needed') {
      submissionStatus.value = 'revision_needed';
      revisedData.value = result.revisedData;
      revisionExplanation.value = result.explanation;
      showRevisionDialog.value = true;
    } else if (result.status === 'rejected') {
      // Handle rejection explicitly now
      submissionStatus.value = 'rejected';
      submissionMessage.value = result.message || 'Your request was rejected.';
      console.log('Setting status to rejected based on response body:', submissionMessage.value);
      // Scroll to the error message after DOM update
      nextTick(() => {
        errorMessageRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    } else {
      // Handle unexpected statuses within a 200 response
      submissionStatus.value = 'error';
      submissionMessage.value = result.message || 'Received an unexpected response status from the server.';
      console.error('Unexpected 200 response status:', result);
      // Scroll to the error message after DOM update
      nextTick(() => {
        errorMessageRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

  } catch (err) {
     // This catch block now ONLY handles actual network/server errors (e.g., 500s, network down)
     console.error('Network/Server Error submitting request (raw error object):', err);
     console.error('Error data payload (if any):', err.data);
 
     submissionStatus.value = 'error';
     submissionMessage.value = err.data?.message || 'A network or server error occurred. Please try again later.';
      // Scroll to the error message after DOM update
     nextTick(() => {
       errorMessageRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
     });

  } finally {
    isSubmitting.value = false;
  }
}

// Computed class for submission message styling
const submissionClass = computed(() => {
  switch (submissionStatus.value) {
    case 'success':
      return 'bg-green-100 border border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300';
    case 'error':
    case 'rejected': // Style rejection like an error for now
      return 'bg-red-100 border border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-300';
    case 'revision_needed':
      return 'bg-yellow-100 border border-yellow-400 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300';
    default:
      return ''; // No background if no status
  }
});

// Function to accept the revision
async function acceptRevision() {
  if (!revisedData.value) return;

  isSubmitting.value = true;
  submissionStatus.value = null; // Clear previous status
  submissionMessage.value = '';
  // Keep dialog open during submission attempt, close on success/error

  const payload = {
    ...revisedData.value,
    isRevisionConfirmation: true,
    // Ensure articleId is still included if present in original or revised data
    ...(articleIdFromQuery.value && { articleId: articleIdFromQuery.value })
  };
   // Ensure articleId is not lost if it was part of revisedData
   if (revisedData.value.articleId && !payload.articleId) {
     payload.articleId = revisedData.value.articleId;
   }

  console.log('Accepting and resubmitting revised data:', JSON.parse(JSON.stringify(payload)));

  try {
    // Use $fetch here as well
    const result = await $fetch('/api/scenarios/request', {
      method: 'POST',
      body: payload,
    });

    // $fetch resolves directly with the response body on 2xx
    if (result.status === 'success') {
      showRevisionDialog.value = false; // Close dialog on success
      submissionStatus.value = 'success';
      submissionMessage.value = result.message || 'Revised request accepted and submitted!';
      requestSubmittedSuccessfully.value = true; // Show success view
      // Clear form and revision state after success
      // formData.value = { question: '', description: '', resolutionCriteria: '', resolutionDate: '' };
      // revisedData.value = null;
      // revisionExplanation.value = '';
    } else {
      // Handle unexpected success statuses if any
      submissionStatus.value = 'error';
      submissionMessage.value = result.message || 'Received an unexpected response after accepting the revision.';
      // Keep dialog open on unexpected backend response? Or close? Let's close for now.
      showRevisionDialog.value = false; 
    }

  } catch (err) {
     // $fetch throws an error for non-2xx responses
    console.error('Error submitting accepted revision:', err);
    submissionStatus.value = 'error';
    submissionMessage.value = err.data?.message || 'Error submitting the revised request.';
    // Keep dialog open on error so user knows what happened
  } finally {
    isSubmitting.value = false;
  }
}

// Renamed function to close the dialog
function closeRevisionDialog() {
  console.log('Closing revision dialog, allowing user to edit original request...');
  showRevisionDialog.value = false;
  // Clear revision state? Optional, but might be cleaner.
  // revisedData.value = null;
  // revisionExplanation.value = '';
  // submissionStatus.value = null; // Clear the revision_needed status
}

// Function to reset the form for a new request
function resetForm() {
  formData.value = { question: '', description: '', resolutionCriteria: '', resolutionDate: '' };
  submissionStatus.value = null;
  submissionMessage.value = '';
  showRevisionDialog.value = false;
  revisedData.value = null;
  revisionExplanation.value = '';
  requestSubmittedSuccessfully.value = false;
  isSubmitting.value = false;
}

// Function for the Go Back button
function goBack() {
  router.back(); // Or router.push('/scenarios') or similar
}

</script>

<style scoped>
/* Add any page-specific styles if needed */
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(0.6); /* Adjust based on theme later if needed */
}
.dark input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(0.8);
}
</style> 