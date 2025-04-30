<template>
  <div class="mobile-interaction-container space-y-1">
    <!-- Single Interaction Button -->
    <button 
      @click="handleItemClick"
      :class="[
        'interaction-row group',
        { 'active': showResponseWindow },
      { 'border-b-0': !isResponseHidden && showResponseWindow },
        { 'border-b border-bg-muted': !showResponseWindow || isResponseHidden },
        /* Custom styling for custom type */
        props.type === 'custom' ? 'bg-bg font-semibold' : 'bg-bg',
      ]"
      :disabled="isLoading && !showResponseWindow"
    >
      <!-- Chevron Icon (Left) -->
      <Icon 
        name="heroicons:chevron-right-20-solid" 
        class="w-4 h-4 text-fg-muted transition-transform duration-200 flex-shrink-0 mr-2" 
        :class="{ 'rotate-90': showResponseWindow && !isResponseHidden }"
      />

      <!-- Label and Sparkle (Middle) -->
      <div class="flex items-center flex-grow mr-2">
            
            <span class="font-semibold">{{ buttonLabel }}</span>
      </div>

      <!-- Right Icons: Loading, Loaded Checkmark, Not Loaded Sparkle -->
      <!-- Loading State (Initial Prompt Load Only) -->
      <div v-if="isLoading && (props.type === 'prompt' || props.type === 'custom')" class="flex items-center space-x-1 text-xs text-fg-muted flex-shrink-0">
         <span>AI thinking</span>
         <Icon name="mdi:sparkles" class="w-4 h-4 text-primary animate-spin" />
      </div>
      <!-- Loaded Checkmark (Not Initial Prompt Loading) -->
      <Icon 
         v-else-if="isLoaded" 
         name="heroicons:check-circle" 
         class="w-4 h-4 text-primary dark:text-primary-400 opacity-70 flex-shrink-0"
      /> 
      <!-- Not Loaded Sparkle (Not Initial Prompt Loading & Not Loaded) -->
      <Icon 
         v-else-if="!(isLoading && (props.type === 'prompt' || props.type === 'custom'))"
         name="mdi:sparkles" 
         class="w-4 h-4 text-fg-muted opacity-50 flex-shrink-0 transition-colors duration-150 group-hover:text-primary group-hover:opacity-100"
      />
    </button>

    <!-- Single Response Window (Attached directly below button) -->
    <div v-if="showResponseWindow && !isResponseHidden" 
         class="response-window -mt-px border-b border-bg-muted bg-bg border-t-0"
         
         >
       <!-- Inner container for content hiding -->
       <div v-show="!isResponseHidden"
            class="response-content-wrapper px-4 pt-2 pb-8 space-y-4">
         <!-- Content Area -->
         <div>
            <!-- Error State -->
            <div v-if="error" class="text-red-600 text-sm p-4 border border-red-300 bg-red-50 rounded">
               Error: {{ error }}
            </div>

            <!-- Content Display -->
            <div v-else>
              <!-- Timeline Display -->
              <div v-if="props.type === 'timeline' && responseData?.length" class="timeline-display space-y-3">
                 <div v-for="(item, index) in responseData" :key="`resp-timeline-${index}`" class="flex items-start">
                    <div class="w-2 h-2 bg-primary rounded-full mt-1.5 mr-3 flex-shrink-0"></div>
                    <div>
                       <div class="text-xs font-medium text-fg-muted mb-0.5">{{ item.date }}</div>
                       <div class="text-sm text-fg leading-snug">{{ item.event }}</div>
                    </div>
                 </div>
              </div>
              <!-- AI Response Display -->
              <div v-else-if="props.type === 'prompt' || props.type === 'custom'" class="space-y-4">
                <!-- Display Past Interactions -->
                <div v-for="(interaction, index) in interactionHistory" :key="`hist-${index}`">
                  <!-- Style User History Item as Header -->
                  <div v-if="interaction.type === 'user'" 
                       :class="[
                         'user-question-header text-sm font-semibold',
                         // Custom styling only for 'custom' type interactions
                         props.type === 'custom' 
                           ? 'ml-auto w-fit max-w-[85%] py-2 px-4 rounded-lg bg-primary/10 dark:bg-primary/20'
                           : 'text-primary dark:text-primary-400' // Default primary color for non-custom prompts
                       ]"
                      >
                    {{ interaction.text }}
                  </div>
                  <!-- Style AI History Item as Rendered Markdown -->
                  <div v-else-if="interaction.type === 'ai'"
                       class="ai-response-text text-sm text-fg whitespace-pre-wrap break-words response-content"
                       v-html="renderMd(interaction.text)">  </div>
                </div>

                <!-- Display Current/Streaming AI Response (as rendered Markdown with citations) -->
                <div v-if="currentAiResponse">
                  <!-- Placeholder -->
                  <div v-if="currentAiResponse.isPlaceholder" class="flex items-center p-2 text-fg-muted text-sm">
                      <Icon 
                        name="mdi:sparkles" 
                        class="w-4 h-4 mr-2 text-primary dark:text-primary-400" 
                        :class="{ 'animate-sparkle': currentAiResponse.isPlaceholder }" 
                      />
                      <span>AI thinking...</span>
                  </div>
                  <!-- Streaming/Final Text (Direct Markdown Rendering) -->
                  <div v-else-if="currentAiResponse.text"
                       class="ai-response-text text-sm text-fg whitespace-pre-wrap break-words response-content"
                       v-html="renderMd(currentAiResponse.text)"> </div>

                  <!-- Appended Sources List -->
                  <div v-if="currentAiSources.length > 0" class="sources-list pt-1">
                    <h4 class="text-xs font-semibold text-fg-muted mb-1.5 border-t border-accent-bg pt-1 w-fit -mt-2">Sources:</h4>
                    <div class="list-none p-0 m-0 space-y-1">
                      <div v-for="(source, index) in currentAiSources" :key="`source-${index}`" class="text-xs text-fg-muted leading-tight break-all">
                        <span class="inline-block w-5 text-right mr-1">[{{ index + 1 }}]</span>
                        <a :href="source.url" target="_blank" rel="noopener noreferrer" class="text-primary dark:text-primary-400 hover:underline" :title="source.title || source.url">
                          {{ source.title || source.url }}
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Input/Follow-up Buttons moved AFTER content display -->

            <!-- Custom Input Area -->
            <div v-if="showCustomInput" 
                 class="custom-input-area"
                 :class="[ 
                   // Apply border/padding only if there is history OR it's a prompt follow-up
                   interactionHistory.length > 0 || props.type === 'prompt' 
                     ? 'pt-4 border-t border-accent-bg mt-4' 
                     : 'pt-0 border-t-0 mt-0' // Initial state for custom type
                 ]"
               >
                <form @submit.prevent="handleCustomSubmit">
                   <!-- Relative container for positioning button -->
                   <div class="relative">
                       <textarea
                         v-model="customUserInput"
                         placeholder="Ask a follow-up question..." 
                         rows="2" 
                         class="w-full p-2 pr-10 border border-accent-bg  focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm bg-bg resize-none rounded-sm" 
                         :disabled="isLoading"
                         @keydown.enter.exact.prevent="handleCustomSubmit" 
                       ></textarea>
                       <!-- Absolutely positioned icon button -->
                       <button 
                         type="submit" 
                         :disabled="!customUserInput.trim() || isLoading"
                         class="absolute bottom-3.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full text-white disabled:opacity-50 transition-opacity"
                         :class="!customUserInput.trim() || isLoading ? 'bg-gray-400' : 'bg-primary hover:bg-primary-dark'"
                         aria-label="Submit question"
                        >
                          <Icon name="heroicons:arrow-up-20-solid" class="w-5 h-5" />
                         </button>
                   </div>
                    <!-- Input error message -->
                    <p v-if="inputError" class="text-xs text-red-500 mt-1">{{ inputError }}</p> 
                </form>
            </div>

          </div>
       </div> 
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
// Optional: Keep useMarkdown if rendering later
import { useMarkdown } from '~/composables/useMarkdown';
// const { render: renderMd } = useMarkdown();

const props = defineProps({
  type: { 
    type: String, 
    required: true, 
    validator: (value) => ['timeline', 'prompt', 'custom'].includes(value) 
  },
  promptText: { type: String, default: '' }, // Used if type is 'prompt'
  timelineData: { type: Array, default: () => [] }, // Used if type is 'timeline'
  contextId: { type: String }, // Needed for AI calls
});

// --- Instance State --- 
const responseData = ref(null); // Holds timeline data if applicable
const isLoading = ref(false);
const error = ref(null);
// Expand custom type by default
const showResponseWindow = ref(props.type === 'custom'); 
const isResponseHidden = ref(false); // Tracks if content *within* the container is hidden
// Show input for custom type by default
const showCustomInput = ref(props.type === 'custom'); 
const customUserInput = ref(''); 
const inputError = ref(''); // Specific error for input validation
// Store completed interactions (user questions, final AI answers)
const interactionHistory = ref([]); // Array of { type: 'user' | 'ai', text: string }
// Stores the AI response currently being streamed or just completed
const currentAiResponse = ref(null); // { text: '' } // Removed isPlaceholder
// Stores the sources associated with the current AI response
const currentAiSources = ref([]); // Array of { url: string, title?: string, snippet?: string }

// --- useMarkdown Integration ---
const { render: renderMd } = useMarkdown();

// --- Constants ---
const MAX_INPUT_LENGTH = 2000; // Character limit for input

// Determine the button label based on type and promptText
const buttonLabel = computed(() => {
  switch (props.type) {
    case 'timeline': return 'Timeline';
    case 'prompt': return props.promptText || 'Suggested Prompt'; // Fallback text
    case 'custom': return 'Ask your own question';
    default: return 'Interact';
  }
});

// Check if content has been successfully loaded for this item
const isLoaded = computed(() => {
  // Timeline is loaded if the prop has data
  if (props.type === 'timeline') {
    return props.timelineData?.length > 0;
  }

  // Prompt/Custom is loaded if it's NOT currently loading, has no error, AND
  // (EITHER there's history OR there's a current response with text)
  if (props.type === 'prompt' || props.type === 'custom') {
    const hasContent = interactionHistory.value.length > 0 || 
                       (currentAiResponse.value && !!currentAiResponse.value.text);
    // Loaded means not currently loading, no error, and has content from a previous/current successful fetch.
    return !isLoading.value && !error.value && hasContent; 
  }

  return false; // Default
});

// Reset state when props change (e.g., navigating between articles)
watch(() => [props.type, props.promptText, props.contextId], () => {
  closeResponseWindow(); // Close and reset everything
});

const closeResponseWindow = () => {
  showResponseWindow.value = false;
  isResponseHidden.value = false; // Reset hidden state
  responseData.value = null;
  currentAiResponse.value = null;
  interactionHistory.value = []; // Clear history
  showCustomInput.value = false; 
  customUserInput.value = '';   
  error.value = null;
  inputError.value = ''; // Clear input error
  isLoading.value = false;
  currentAiSources.value = [];   // Clear sources for the new response
};

// Toggle visibility and fetch data if needed
const handleItemClick = async () => {
  if (showResponseWindow.value) {
    // Window is currently open
    const hasInteractionStarted = 
        props.type === 'timeline' || // Timeline always counts as started if open
        isLoading.value || // If loading, interaction has started
        interactionHistory.value.length > 0 || // If history exists, it started
        (currentAiResponse.value && currentAiResponse.value.text); // If current response has text
        
    if (hasInteractionStarted) {
      // If interaction started, just toggle hidden state
      isResponseHidden.value = !isResponseHidden.value;
    } else {
      // If no interaction, close the window fully
      closeResponseWindow();
    }
    return; // Stop further execution
  }

  // --- Opening the window --- 
  isLoading.value = false;
  error.value = null;
  inputError.value = ''; 
  currentAiResponse.value = null;
  interactionHistory.value = []; 
  responseData.value = null;
  customUserInput.value = ''; 
  showCustomInput.value = false; 
  isResponseHidden.value = false; // Ensure content is visible when first opened
  showResponseWindow.value = true; // Attach the response window div
  
  // Fetch/show data based on type
  if (props.type === 'timeline') {
    responseData.value = props.timelineData; 
  } else if (props.type === 'prompt') {
    await fetchAiResponse(props.promptText);
  } else if (props.type === 'custom') {
    showCustomInput.value = true; 
  }
};

const handleCustomSubmit = async () => {
   const textToSend = customUserInput.value.trim();
   inputError.value = ''; // Clear previous input errors

   // --- Input Validation ---
   if (!textToSend) return; // Don't submit empty input
   if (textToSend.length > MAX_INPUT_LENGTH) {
       inputError.value = `Input exceeds maximum length of ${MAX_INPUT_LENGTH} characters.`;
       return;
   }
   // ------------------------
   
   // Commit previous interaction to history if it exists
   if (currentAiResponse.value && currentAiResponse.value.text) {
      // Push only the completed AI response
      interactionHistory.value.push({ type: 'ai', text: currentAiResponse.value.text });
   }

   // Add new user query (the one just submitted) to history
   interactionHistory.value.push({ type: 'user', text: textToSend });

   const promptForAI = textToSend;
   customUserInput.value = ''; // Clear the input field
   currentAiResponse.value = null; // Clear the display area for the new response
   currentAiSources.value = [];   // Clear sources for the new response

   // Fetch the AI response (will stream into currentAiResponse)
   await fetchAiResponse(promptForAI);
}

// fetchAiResponse for this specific instance
async function fetchAiResponse(promptTextForAPI) {
  if (!promptTextForAPI || !props.contextId) {
      error.value = 'Missing prompt or context ID.';
      return;
  }
  isLoading.value = true;
  error.value = null;
  inputError.value = ''; // Clear input error on new fetch
  // Initialize the current AI response object (no placeholder needed)
  currentAiResponse.value = { text: '' };
  currentAiSources.value = []; // Clear sources when starting a new fetch

  // Build history for API: ONLY completed interactions
  const historyForAPI = interactionHistory.value.map(item => ({
      sender: item.type, 
      text: item.text
  }));
  // Add the latest prompt (the one we are fetching for now)
  historyForAPI.push({ sender: 'user', text: promptTextForAPI });

  console.log(`[MobileInteraction:${props.type}] Streaming with history:`, historyForAPI);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          prompt: promptTextForAPI, // Send the latest prompt explicitly
          history: historyForAPI, 
          contextId: props.contextId 
      })
    });

    if (!response.ok) {
      currentAiResponse.value = null; 
      currentAiSources.value = []; // Clear sources on error
      let errorData; try { errorData = await response.json(); } catch (e) { /* ignore */ }
      throw new Error(errorData?.message || `HTTP error! Status: ${response.status}`);
    }
    if (!response.body) { 
        currentAiResponse.value = null;
        currentAiSources.value = []; // Clear sources on error
        throw new Error('Response body missing.');
    }

    // --- NDJSON Stream Processing --- 
    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let isFirstChunk = true; 
    let streamedText = ''; // Accumulate raw text
    let accumulatedSources = []; // Accumulate sources

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last potentially incomplete line in the buffer

        for (const line of lines) {
            if (line.trim() === '') continue;
            try {
                const parsedLine = JSON.parse(line);
                
                if (parsedLine.type === 'content') {
                    if (currentAiResponse.value) {
                        currentAiResponse.value.text += parsedLine.data;
                        streamedText += parsedLine.data; // Keep track locally too
                    } else {
                        console.warn(`[MobileInteraction:${props.type}] AI response ref became null during content stream.`);
                        // Optionally break or handle differently
                    }
                } else if (parsedLine.type === 'sources') {
                    if (parsedLine.data && Array.isArray(parsedLine.data)) {
                        // Append new sources, assuming backend sends unique sets or handles deduplication
                        accumulatedSources.push(...parsedLine.data);
                        // Update the reactive ref (make a copy to ensure reactivity)
                        currentAiSources.value = [...accumulatedSources]; 
                        console.log('Client received sources chunk:', parsedLine.data); // DEBUG
                        // console.log('Updated sources:', currentAiSources.value); // DEBUG
                    }
                }
            } catch (e) {
                console.error(`[MobileInteraction:${props.type}] Error parsing JSON line:`, line, e);
            }
        }
    }
    // --- End NDJSON Stream Processing ---

    // Final cleanup & store the prompt that led to this response
    if (currentAiResponse.value) { 
        if (typeof currentAiResponse.value.text !== 'string') {
            currentAiResponse.value.text = String(streamedText || '');
        }
        // ----------------------------------------------------------
    } else {
        // Handle case where currentAiResponse might be null after stream error
        console.warn("[MobileInteraction] currentAiResponse was null after stream completion/error.");
    }

  } catch (err) {
    console.error(`[MobileInteraction:${props.type}] AI Stream Error:`, err);
    error.value = err.message || 'Failed to get AI response.';
    currentAiResponse.value = null; // Clear response on error
  } finally {
    isLoading.value = false; 
  }
}

</script>

<style scoped>
/* Styles largely remain, but some might be simplified */
.interaction-row {
  @apply w-full flex justify-between items-center text-left p-3 text-sm text-fg disabled:opacity-60 transition-colors;
  /* Apply rounding directly based on state now */
}
/* Default hover */
.interaction-row:not([class*='bg-bg-muted']):hover {
   @apply text-primary;
}
/* Custom button hover */
.interaction-row[class*='bg-bg-muted']:hover {
    @apply bg-accent-bg;
}

/* Active state just changes border */
.interaction-row.active {
   @apply z-10 relative;
   /* Remove border-bottom manipulation, handled by adjacent div */
}
.row-icon {
  @apply w-5 h-5 text-primary opacity-70 flex-shrink-0 ml-2;
}

.response-window {
    /* Attached style: no top margin/border/radius */
    border-top-width: 0 !important; 
    margin-top: -1px !important; /* Overlap slightly */
    border-top-left-radius: 0 !important;
    border-top-right-radius: 0 !important;
    /* Keep bottom/side border/radius */
}

.timeline-display {
   padding-left: 0.25rem; /* Keep indentation */
}

.response-content {
  @apply text-sm text-fg py-1 sm:py-2 -mb-2;
}

/* If using markdown rendering later: */
:deep(li) {
  @apply -mb-2;
}
:deep(ul) {
  margin-top: -20px !important;
  margin-bottom: -10px !important;
}

/* Copied from ArticlePrompts.vue for placeholder animation */
@keyframes sparkle-rotate {
  0% {
    transform: rotate(0deg) scale(1);
    opacity: 0.7;
  }
  25% {
    transform: rotate(90deg) scale(1.2);
    opacity: 1;
  }
  50% {
    transform: rotate(180deg) scale(1);
    opacity: 0.7;
  }
  75% {
    transform: rotate(270deg) scale(1.2);
    opacity: 1;
  }
  100% {
    transform: rotate(360deg) scale(1);
    opacity: 0.7;
  }
}

@keyframes sparkle-bounce {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-2px) rotate(90deg); /* Adjusted bounce slightly */
  }
  50% {
    transform: translateY(0) rotate(180deg);
  }
  75% {
    transform: translateY(2px) rotate(270deg); /* Adjusted bounce slightly */
  }
}

.animate-sparkle {
  animation: sparkle-rotate 2s infinite linear, sparkle-bounce 1.5s infinite ease-in-out;
  transform-origin: center;
}

/* Styling for Citation Markers */
:deep(.citation-marker) {
  @apply inline-block align-baseline mx-px;
}
:deep(.citation-marker a) {
  @apply text-primary dark:text-primary-400 font-medium no-underline hover:underline text-xs;
  line-height: 1; /* Adjust line height for superscript */
  vertical-align: super; /* Use superscript alignment */
}
</style> 
