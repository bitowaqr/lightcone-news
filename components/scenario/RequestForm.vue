<template>
  <!-- Modern, clean form approach -->
  <div class="bg-bg border-r border-bg-muted p-4 sm:p-6 lg:h-[calc(100vh-114px)]"> <!-- Clean container -->
    <h1 class="text-2xl font-bold mb-4 text-fg">
        Request New Scenario
    </h1>
    <p class="text-base text-fg mb-4 font-medium leading-tight"> 
      Our AI Agents will submit probabilistic forecasts and rationales within 5-20 minutes.
    </p>
    <p class="text-base text-fg mb-8 font-medium leading-tight"> 
      Forecasts will be updated regularly, as new information comes in.
    </p>

    <form @submit.prevent="submitForm" class="space-y-8"> 
       

      <!-- Section 1: The Question -->
      <div>
        <label for="request-question" class="block text-base font-medium text-fg-muted mb-2">Forecast Question</label>
        <textarea
          id="request-question" 
          v-model="formData.question"
          rows="1"
          required
          class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:border-primary bg-bg-input text-fg placeholder-fg-muted/60 focus:outline-none"
          placeholder="Will the woolly mammoth be de-extincted before 2030?"
          style="resize: none;"
        ></textarea>
        <p class="text-xs text-fg">Read <a href="/docs/scenarios" class="text-primary font-medium" target="_blank">this guide</a> on how to ask good scenario questions.</p>
      </div>



<!-- Article Selection -->
<div class="space-y-2">
          <label class="block text-base font-medium text-fg-muted mb-2">Related Article (Optional)</label>
          <Combobox v-model="selectedArticle" @update:modelValue="handleSelectionUpdate" nullable>
            <div class="relative">
              <!-- Input styling using bg-bg-input and standard border -->
              <div class="relative w-full cursor-default overflow-hidden rounded-md bg-bg-input text-left border border-gray-300 dark:border-gray-700 shadow-sm focus-within:outline-none focus-within:ring-1 focus-within:ring-primary focus-within:border-primary sm:text-sm">
                <ComboboxInput
                  ref="comboboxInputRef"
                  class="w-full border-none text-sm px-3 py-2 leading-5 text-fg bg-transparent placeholder-fg-muted/60 focus:ring-0 focus:outline-none" 
                  :displayValue="(article) => article?.title ?? ''"
                  @change="articleQuery = $event.target.value"
                  @focus="handleComboboxFocus"
                  @blur="handleComboboxBlur"
                  placeholder="Search or select an article..."
                />
                <ComboboxButton class="absolute inset-y-0 right-0 flex items-center pr-2">
                  <Icon name="heroicons:chevron-up-down-20-solid" class="h-5 w-5 text-gray-400" aria-hidden="true" />
                </ComboboxButton>
              </div>
              <Transition
                leave-active-class="transition duration-100 ease-in"
                leave-from-class="opacity-100"
                leave-to-class="opacity-0"
                @after-leave="articleQuery = ''"
              >
                <!-- Dropdown options styling -->
                <ComboboxOptions class="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-bg py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-10 border border-bg-muted">
                    <div v-if="filteredArticles.length === 0 && articleQuery !== '' && !loadingTitles" class="relative cursor-default select-none px-4 py-2 text-fg-muted"> Nothing found. </div>
                    <div v-else-if="loadingTitles" class="relative cursor-default select-none px-4 py-2 text-fg-muted italic"> Loading articles... </div>
                   
                    <ComboboxOption
                       v-for="article in filteredArticles" 
                       :key="article._id || 'no-article'"
                       :value="article"
                       v-slot="{ selected, active }"
                       as="template"
                     >
                       <li :class="[
                           'relative list-none cursor-default select-none py-2 pl-4 pr-4',
                           active ? 'bg-primary/10 text-primary' : (article._id === null ? 'text-fg-muted' : 'text-fg'),
                         ]">
                           <span :class="[
                               'block truncate', 
                               selected ? 'font-medium text-primary' : 'font-normal',
                               article._id === null ? 'italic' : ''
                           ]"> 
                            {{ article.title }} 
                           </span>
                       </li>
                     </ComboboxOption>
                </ComboboxOptions>
              </Transition>
            </div>
          </Combobox>
          <div v-if="!selectedArticle?._id" class="text-xs text-fg">If this Scenario question is related to an article, select the article to the left.
          </div>
          <!-- Display Precis -->
          <blockquote v-if="selectedArticle?._id && selectedArticle?.precis" class="pt-1"> <!-- Clean separator -->
            <p class="text-sm text-fg leading-tight italic">
              {{ selectedArticle.precis }}
            </p>
          </blockquote>
       </div>




     
      <!-- Section 3: Resolution -->
       
          
          <!-- Criteria Input -->
          <div>
            <label for="request-resolutionCriteria" class="block text-base font-medium text-fg-muted mb-2">Resolution Criteria</label>
            <textarea
              id="request-resolutionCriteria"
              v-model="formData.resolutionCriteria"
              rows="5"
              required
              class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:border-primary bg-bg-input text-fg placeholder-fg-muted/60 focus:outline-none"
              placeholder="Define exactly how the question will be answered (e.g., based on announcement from Agency X, data from Source Y)."
            ></textarea>
            <p class="text-xs text-fg">Define clear, objective criteria for how the question will be resolved. See <a href="/docs/scenarios" class="text-primary font-medium" target="_blank">this guide</a> for tips.</p>
          </div>

          <!-- Date Input -->
          <div>
            <label for="request-resolutionDate" class="block text-base font-medium text-fg-muted mb-2">Resolution Date</label>
            <input
              type="date" 
              id="request-resolutionDate"
              v-model="formData.resolutionDate"
              required
              :min="minDate" 
              :max="maxDate"
              class="w-full md:w-auto text-sm px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:border-primary bg-bg-input text-fg focus:outline-none"
            />
            <p class="text-xs text-fg mt-1.5">Max. limit: 1 year from now.</p>
          </div>
       





        <!-- Section 2: Context/Description -->
      <div>
         <label for="request-description" class="block text-base font-medium text-fg-muted mb-2">Background (Optional)</label>
        <textarea
          id="request-description"
          v-model="formData.description"
          rows="4"
          class="w-full text-sm px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:border-primary bg-bg-input text-fg placeholder-fg-muted/60 focus:outline-none"
          placeholder="Add background information here..."
        ></textarea>
         <p class="text-xs text-fg">Provide additional information to explain the context or help our AI agents better understand the question.</p>
      </div>

      <!-- ADDED: Visibility Toggle -->
      <div class="space-y-2">
        <label class="block text-base font-medium text-fg-muted mb-1">Visibility</label>
        <div class="flex items-center space-x-6">
          <div class="flex items-center">
            <input
              id="visibility-public"
              name="visibility"
              type="radio"
              value="PUBLIC"
              v-model="formData.visibility"
              class="h-4 w-4 border-gray-300 dark:border-gray-600 accent-primary focus:outline-none  focus:ring-offset-bg rounded-full focus:ring-none"
            />
            <label for="visibility-public" class="ml-2.5 block text-sm font-medium text-fg">Public</label>
          </div>
          <div class="flex items-center">
            <input
              id="visibility-private"
              name="visibility"
              type="radio"
              value="PRIVATE"
              v-model="formData.visibility"
              class="h-4 w-4 border-gray-300 dark:border-gray-600 accent-primary focus:outline-none rounded-full focus:ring-none"
            />
            <label for="visibility-private" class="ml-2.5 block text-sm font-medium text-fg">Private <span class="text-xs text-fg-muted">(Only visible to you)</span></label>
          </div>
        </div>
      </div>


      <!-- Submission Area -->
      <div class="pt-1 flex items-center justify-end gap-3"> 
         <div v-if="isSubmittingLongerThan5Seconds" class="text-xs text-fg-muted mt-auto py-2">Sorry, sometimes this can take a while. Please wait a moment.</div>
          <!-- Submit button styling -->
        <button
          type="submit"
          :disabled="isSubmitting"
          class="inline-flex items-center py-2 px-5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
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

    <!-- Revision Suggestion Modal -->
     <div v-if="showRevisionDialog && revisedData" 
         class="fixed inset-0 z-[60] overflow-y-auto bg-black/60 flex items-center justify-center p-4"
         @click.self="closeRevisionDialog"> 
      <div class="bg-article rounded-md shadow-xl max-w-2xl w-full border border-bg-muted overflow-hidden">
        <div class="p-6">
           <h2 class="text-xl font-semibold mb-4 flex items-center text-fg">
            <Icon name="heroicons:light-bulb" class="w-6 h-6 mr-2 text-primary" />
            Suggestion for Improvement
          </h2>
          <p class="text-sm text-fg-muted mb-6">
            {{ revisionExplanation || 'We suggest some changes to clarify your request:' }}
          </p>
          <div class="space-y-5 bg-bg/50 dark:bg-bg-muted/20 p-4 rounded border border-bg-muted mb-6 max-h-[50vh] overflow-y-auto">
            
            <!-- Consistent Display for All Revised Fields -->
            <div v-if="revisedData.question && revisedData.question !== formData.question">
              <p class="text-xs font-medium text-fg-muted uppercase tracking-wider mb-1">Suggested Question:</p>
              <p class="text-sm line-through text-fg-muted/70 p-2 bg-fg-muted/5 rounded">{{ formData.question }}</p>
              <p class="text-sm text-primary font-medium p-2 bg-primary/5 rounded border border-primary/20 mt-1">{{ revisedData.question }}</p>
            </div>

            <div v-if="revisedData.resolutionCriteria && revisedData.resolutionCriteria !== formData.resolutionCriteria">
              <p class="text-xs font-medium text-fg-muted uppercase tracking-wider mb-1">Suggested Resolution Criteria:</p>
              <pre class="whitespace-pre-wrap text-sm line-through text-fg-muted/70 p-2 bg-fg-muted/5 rounded">{{ formData.resolutionCriteria }}</pre>
              <pre class="whitespace-pre-wrap text-sm text-primary font-medium p-2 bg-primary/5 rounded border border-primary/20 mt-1">{{ revisedData.resolutionCriteria }}</pre>
            </div>

            <div v-if="revisedData.resolutionDate && revisedData.resolutionDate !== formData.resolutionDate">
              <p class="text-xs font-medium text-fg-muted uppercase tracking-wider mb-1">Suggested Resolution Date:</p>
              <p class="text-sm line-through text-fg-muted/70 p-2 bg-fg-muted/5 rounded">{{ formData.resolutionDate }}</p>
              <p class="text-sm text-primary font-medium p-2 bg-primary/5 rounded border border-primary/20 mt-1">{{ revisedData.resolutionDate }}</p>
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
import { ref, computed, nextTick, defineProps, defineEmits, watch, onMounted } from 'vue';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption, ComboboxLabel, TransitionRoot } from '@headlessui/vue' // Import Headless UI components
import { useBookmarkStore } from '~/stores/bookmarks'; // Import bookmark store

// Define props
const props = defineProps({
  articleId: {
    type: String,
    default: null
  },
  articleTitle: {
    type: String,
    default: null
  },
  isDesktop: {
    type: Boolean,
    required: true
  }
});

// Define emits
const emit = defineEmits(['submitted', 'cancelled', 'scenario-created']); // Added 'scenario-created'

// Initialize bookmark store
const bookmarkStore = useBookmarkStore();

// Form state - use props for initial values if provided
const formData = ref({
  question: '',
  description: '',
  resolutionCriteria: '',
  resolutionDate: '',
  visibility: 'PUBLIC' // Added visibility field
});

const isSubmitting = ref(false);
const isSubmittingLongerThan5Seconds = ref(false);
const submissionStatus = ref(null); // 'success', 'error', 'rejected', 'revision_needed'
const submissionMessage = ref('');

// State for revision handling
const showRevisionDialog = ref(false);
const revisedData = ref(null);
const revisionExplanation = ref('');

// State for Article Selection
const articleTitlesList = ref([]); // Will now contain {_id, title, precis}
const loadingTitles = ref(false);
const selectedArticle = ref(null); 
const articleQuery = ref('');

// State for interaction logic
const previousSelection = ref(null); // Store selection before focus
const selectionMade = ref(false); // Flag to track if a selection happened between focus/blur

// Use props directly in template or computed properties
const articleTitleFromQuery = computed(() => props.articleTitle);

// Declare the template ref
const errorMessageRef = ref(null);

// Define ref for the input element
const comboboxInputRef = ref(null);

// Calculate minimum date
const minDate = computed(() => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const localDate = new Date(today.getTime() - offset);
  return localDate.toISOString().split('T')[0];
});

const maxDate = computed(() => {
  // in 1 year lates, ie today + 1 year + 1 day
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  const localDate = new Date(today.getTime() - offset);
  localDate.setFullYear(localDate.getFullYear() + 1);
  localDate.setDate(localDate.getDate() + 1);
  return localDate.toISOString().split('T')[0];
});

// Define the placeholder object
const NO_ARTICLE_SELECTED = { _id: null, title: '-- Not related to a specific article --', precis: null };

// Filtered articles - always include placeholder at the top if query is empty or matches it
const filteredArticles = computed(() => {
    const query = articleQuery.value.toLowerCase().replace(/\s+/g, '');
    let articles = articleTitlesList.value;

    if (query !== '') {
        articles = articles.filter((article) =>
            article.title.toLowerCase().replace(/\s+/g, '').includes(query)
        );
    }
    
    // Always include the placeholder option at the beginning
    return [NO_ARTICLE_SELECTED, ...articles];
});

// --- Lifecycle --- 
onMounted(async () => {
    // Fetch titles and precis together
    const fetchArticles = async () => {
        loadingTitles.value = true;
        try {
            // Endpoint now returns title and precis
            const articles = await $fetch('/api/articles/titles');
            articleTitlesList.value = articles || [];
        } catch (error) {
            console.error("Error fetching articles:", error);
        } finally {
            loadingTitles.value = false;
        }
    };
    
    // Run article fetch
    await fetchArticles();
    
    // Find initial selected article object based on prop ID
    if (props.articleId) {
        const initialArticle = articleTitlesList.value.find(a => a._id === props.articleId);
        selectedArticle.value = initialArticle || NO_ARTICLE_SELECTED;
    } else {
        selectedArticle.value = NO_ARTICLE_SELECTED;
    }
    // Initialize previous selection after potentially finding initial article
    previousSelection.value = selectedArticle.value; 
});

// --- Combobox Interaction Handlers ---
const handleComboboxFocus = (event) => {
    // Store the current selection when focus starts
    previousSelection.value = selectedArticle.value;
    selectionMade.value = false; // Reset flag
    // Don't clear input if placeholder is selected, allow typing over it
    if (selectedArticle.value?._id !== null) {
         event.target.value = '';
    }
    articleQuery.value = ''; 
};

const handleComboboxBlur = () => {
    setTimeout(() => {
        if (!selectionMade.value) {
             // If no selection was made, revert selectedArticle to its pre-focus state
             // Check if the selection actually changed during typing (e.g. user typed exact match but didnt select)
             // Or more simply, just revert if the current state doesn't match the pre-focus state.
             if (selectedArticle.value !== previousSelection.value) {
                selectedArticle.value = previousSelection.value; 
             }
             
             // **CRITICAL FIX:** Explicitly set the input display value after potential revert
             if (comboboxInputRef.value?.el) { // Check if ref and element exist
                // Use the final value of selectedArticle after potential revert
                comboboxInputRef.value.el.value = selectedArticle.value?.title ?? ''; 
             }
        }
        // Reset the query variable used for filtering options
        articleQuery.value = ''; 
        // Reset the flag for the next interaction
        selectionMade.value = false; 
    }, 100); // Timeout allows selection event to fire first
};

// Track when a selection is actually made via the Combobox v-model update
const handleSelectionUpdate = (value) => {
    selectionMade.value = true; // Set flag when a valid option is selected
    // Ensure previousSelection is updated if user selects via dropdown without focus/blur cycle
    previousSelection.value = value; 
};

// Watch selectedArticle to update precis (only if not null)
watch(selectedArticle, (newArticle) => {
    // The precis is now part of the articleTitlesList object, no need to fetch
    // console.log("Selected article changed:", newArticle?.title);
});

// Submit function - use selectedArticle._id
async function submitForm() {
  isSubmitting.value = true;
  isSubmittingLongerThan5Seconds.value = false;

  const submittingTimeout = setTimeout(() => {
    isSubmittingLongerThan5Seconds.value = true;
  }, 5000);

  // Clear the timeout if the form is submitted before 5 seconds
  const clearSubmittingTimeout = () => {
    clearTimeout(submittingTimeout);
  };

  submissionStatus.value = null;
  submissionMessage.value = '';
  showRevisionDialog.value = false;
  revisedData.value = null;
  revisionExplanation.value = '';

  const payload = {
    ...formData.value,
    // Only add articleId if a real article (_id is not null) is selected
    ...(selectedArticle.value?._id && { articleId: selectedArticle.value._id })
  };


  try {
    const result = await $fetch('/api/scenarios/request', {
      method: 'POST',
      body: payload,
    });

    if (result.status === 'success') {
      submissionStatus.value = 'success';
      submissionMessage.value = result.message;
      emit('submitted', result.message || 'Request submitted successfully!');

      // --- New Auto-Bookmark Logic ---
      if (result.scenarioId) {
        try {
          // Wait for bookmark action to complete (or handle potential errors)
          await bookmarkStore.toggleBookmark(result.scenarioId, 'scenario', true); // Force add
          // Emit event for parent page (scenarios/index.vue)
          emit('scenario-created', result.scenarioId);
        } catch (bookmarkError) {
          console.error(`Failed to auto-bookmark scenario ${result.scenarioId}:`, bookmarkError);
          // Decide how to handle bookmarking error - maybe inform user?
          // For now, just log it, the scenario was still created.
        }
      } else {
        console.warn('Scenario creation success response did not include scenarioId.');
      }
      // --- End Auto-Bookmark Logic ---

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
    clearSubmittingTimeout();
    isSubmittingLongerThan5Seconds.value = false;
  }
}

// Accept revision function - use selectedArticle._id
async function acceptRevision() {
   if (!revisedData.value) return;

  isSubmitting.value = true;
  submissionStatus.value = null;
  submissionMessage.value = '';

  const payload = {
    ...revisedData.value,
    isRevisionConfirmation: true,
    // Only add articleId if a real article (_id is not null) is selected
    ...(selectedArticle.value?._id && { articleId: selectedArticle.value._id })
  };
  // ... rest of acceptRevision ...

  
   try {
    const result = await $fetch('/api/scenarios/request', {
      method: 'POST',
      body: payload,
    });
    // ... rest of revision handling ...
     if (result.status === 'success') {
      showRevisionDialog.value = false;
      submissionStatus.value = 'success';
      submissionMessage.value = result.message || 'Revised request accepted!';
      emit('submitted', submissionMessage.value); 

      // --- New Auto-Bookmark Logic (also for accepted revisions) ---
      if (result.scenarioId) {
         try {
           await bookmarkStore.toggleBookmark(result.scenarioId, 'scenario', true); // Force add
           emit('scenario-created', result.scenarioId);
         } catch (bookmarkError) {
           console.error(`Failed to auto-bookmark revised scenario ${result.scenarioId}:`, bookmarkError);
         }
      } else {
        console.warn('Revised scenario acceptance response did not include scenarioId.');
      }
      // --- End Auto-Bookmark Logic ---

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
  } finally {
    isSubmitting.value = false;
  }
}

// Reset function - reset selectedArticle to placeholder or initial
function resetFormFields() {
  formData.value = { question: '', description: '', resolutionCriteria: '', resolutionDate: '', visibility: 'PUBLIC' };
  const initialArticle = props.articleId 
      ? articleTitlesList.value.find(a => a._id === props.articleId) 
      : null;
  selectedArticle.value = initialArticle || NO_ARTICLE_SELECTED; // Reset to initial prop or placeholder
  previousSelection.value = selectedArticle.value; // Reset previous selection
  articleQuery.value = '';
  selectionMade.value = false;
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

// Function to close revision dialog
function closeRevisionDialog() {
  showRevisionDialog.value = false;
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

</script>

<style scoped>
/* Styles from original page */
input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(0.6);
}
.dark input[type="datetime-local"]::-webkit-calendar-picker-indicator {
    filter: invert(0.8);
}
/* Remove default list styling */
li {
  list-style-type: none;
}
ul {
  padding-left: 0;
}
/* Additional scoped styles if needed */
</style> 