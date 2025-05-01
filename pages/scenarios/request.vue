<template>
  <div class="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
    <h1 class="text-3xl font-bold mb-4 text-primary-700 dark:text-primary-300">Request a Forecast</h1>
    <p class="text-lg text-fg-muted mb-8">
      Propose a question about a future event. If accepted, we'll work on generating a probabilistic forecast.
    </p>

    <form @submit.prevent="submitForm" class="space-y-8">
      <!-- Section 1: The Question -->
      <section class="bg-article p-6 rounded-lg shadow-sm border border-bg-muted">
        <h2 class="text-xl font-semibold mb-4 flex items-center">
          <Icon name="heroicons:question-mark-circle" class="w-6 h-6 mr-2 text-primary opacity-80" />
          Forecast Question
        </h2>
        <p class="text-sm text-fg-muted mb-4">Clearly state the question to be forecasted. Make it unambiguous and answerable with a "Yes", "No", or a specific value/date. <span class="italic">Example: "Will AI achieve human-level intelligence (AGI) before January 1, 2035?"</span></p>
        <div>
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

      <!-- Section 2: Context/Description -->
      <section class="bg-article p-6 rounded-lg shadow-sm border border-bg-muted">
        <h2 class="text-xl font-semibold mb-4 flex items-center">
          <Icon name="heroicons:information-circle" class="w-6 h-6 mr-2 text-primary opacity-80" />
          Background & Context
        </h2>
        <p class="text-sm text-fg-muted mb-4">Provide helpful background information, context, or why this question is important. Include links to relevant articles or sources if possible.</p>
        <div>
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

      <!-- Section 3: Resolution -->
      <section class="bg-article p-6 rounded-lg shadow-sm border border-primary/30">
        <h2 class="text-xl font-semibold mb-4 flex items-center text-primary-700 dark:text-primary-300">
          <Icon name="heroicons:check-circle-20-solid" class="w-6 h-6 mr-2" />
          Resolution Criteria & Date
        </h2>
        <p class="text-sm text-fg-muted mb-4"><strong class="font-medium text-fg">Crucial:</strong> How will we know for sure if the event happened? Define clear, objective criteria. Specify the source(s) of truth if applicable.</p>
        
        <div class="mb-6">
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

        <div>
          <label for="resolutionDate" class="block text-sm font-medium text-fg mb-1">Latest Resolution Date/Time</label>
           <p class="text-xs text-fg-muted mb-2">When should the question finally be resolved if the event hasn't occurred by then?</p>
          <input 
            type="datetime-local" 
            id="resolutionDate" 
            v-model="formData.resolutionDate" 
            required
            :min="minDate"
            class="w-full md:w-auto px-3 py-2 border border-fg-muted/30 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-bg text-fg"
          />
        </div>
      </section>

      <!-- Submission Area -->
      <div class="pt-4 text-right">
        <button 
          type="submit" 
          :disabled="isSubmitting"
          class="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon v-if="isSubmitting" name="line-md:loading-twotone-loop" class="w-5 h-5 mr-2 animate-spin" />
          {{ isSubmitting ? 'Submitting...' : 'Submit Request' }}
        </button>
      </div>

      <!-- Response Area (Placeholder) -->
      <div v-if="submissionStatus" class="mt-6 p-4 rounded-md" :class="submissionClass">
        <p>{{ submissionMessage }}</p>
        <!-- Area for potential AI suggestions in the future -->
      </div>

    </form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

// Form state
const formData = ref({
  question: '',
  description: '',
  resolutionCriteria: '',
  resolutionDate: ''
});

const isSubmitting = ref(false);
const submissionStatus = ref(null); // 'success', 'error', 'pending_review'
const submissionMessage = ref('');

// Calculate minimum date for resolution (today)
const minDate = computed(() => {
  const today = new Date();
  // Adjust for local timezone offset
  const offset = today.getTimezoneOffset() * 60000; // offset in milliseconds
  const localISOTime = (new Date(today.getTime() - offset)).toISOString().slice(0, 16);
  return localISOTime;
});

// Placeholder submit function
async function submitForm() {
  isSubmitting.value = true;
  submissionStatus.value = null;
  submissionMessage.value = '';
  console.log('Submitting form data:', JSON.parse(JSON.stringify(formData.value)));

  // --- Backend Integration Placeholder --- 
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    // const response = await $fetch('/api/scenarios/request', {
    //   method: 'POST',
    //   body: formData.value
    // });

    // TODO: Handle response - could be success, or could be AI suggestions
    // For now, assume success:
    submissionStatus.value = 'success';
    submissionMessage.value = 'Thank you! Your forecast request has been submitted for review.';
    // Optionally reset form: 
    // formData.value = { question: '', description: '', resolutionCriteria: '', resolutionDate: '' };

  } catch (error) {
    console.error('Error submitting request:', error);
    submissionStatus.value = 'error';
    submissionMessage.value = 'Sorry, there was an error submitting your request. Please try again.';
     // Handle specific error messages from backend if available
     // if (error.response && error.response._data) { 
     //   submissionMessage.value = error.response._data.message || submissionMessage.value;
     // }
  } finally {
    isSubmitting.value = false;
  }
  // --- End Placeholder ---
}

// Computed class for submission message styling
const submissionClass = computed(() => {
  if (submissionStatus.value === 'success') {
    return 'bg-green-100 border border-green-300 text-green-800';
  }
  if (submissionStatus.value === 'error') {
    return 'bg-red-100 border border-red-300 text-red-800';
  }
  // Add class for 'pending_review' or other states later
  return 'bg-blue-100 border border-blue-300 text-blue-800'; // Default/info style
});

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