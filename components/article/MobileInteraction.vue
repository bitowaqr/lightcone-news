<template>
  <div class="mobile-interaction-container space-y-1">
    <!-- Single Interaction Button -->
    <button 
      @click="handleItemClick"
      :class="[
        'interaction-row', 
        { 'active': showResponseWindow },
        /* Custom styling for custom type */
        props.type === 'custom' ? 'bg-bg font-semibold' : 'bg-bg',
      ]"
      :disabled="isLoading && !showResponseWindow"
    >
      <!-- Label and Sparkle -->
      <div class="flex items-center flex-grow mr-2">
            <Icon 
              v-if="props.type === 'custom'"
              name="mdi:sparkles" class="w-4 h-4 mr-1 text-primary dark:text-primary-400" 
              :class="isLoading ? 'animate-sparkle' : ''"/>
            <span class="">{{ buttonLabel }}</span>
      </div>

      <!-- Loaded Checkmark (Visible when loaded) -->
      <Icon 
         v-if="isLoaded" 
         name="heroicons:check-circle" 
         class="w-4 h-4 text-primary dark:text-primary-400 opacity-70 mr-1.5 flex-shrink-0"
      /> 

      <!-- Expand/Collapse/Hide Icon -->
      <Icon 
        :name="!showResponseWindow || isResponseHidden 
                  ? 'heroicons:plus-circle-20-solid' 
                  : 'heroicons:minus-circle-20-solid'"
        class="row-icon flex-shrink-0" 
      />
    </button>

    <!-- Single Response Window (Attached directly below button) -->
    <div v-if="showResponseWindow" 
         class="response-window -mt-px border-x border-b"
         :class="{
           'bg-bg border-primary': true, 
           'border-primary': true /* Keep border always primary when open */
         }"
         >
       <!-- Inner container for content hiding -->
       <div v-show="!isResponseHidden" class="response-content-wrapper px-4 py-2 space-y-4">
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
                       class="user-question-header text-sm font-semibold text-fg mb-1">
                    {{ interaction.text }}
                  </div>
                  <!-- Style AI History Item as Plain Text -->
                  <div v-else-if="interaction.type === 'ai'" 
                       class="ai-response-text text-sm text-fg whitespace-pre-wrap break-words">
                     {{ interaction.text }}
                  </div>
                </div>

                <!-- Display Current/Streaming AI Response (as plain text) -->
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
                  <!-- Streaming/Final Text -->
                  <div v-else-if="currentAiResponse.text" 
                       class="ai-response-text text-sm text-fg whitespace-pre-wrap break-words response-content">
                     {{ currentAiResponse.text }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Input/Follow-up Buttons moved AFTER content display -->

            <!-- Custom Input Area -->
            <div v-if="showCustomInput && (props.type === 'custom' || (props.type === 'prompt' && currentAiResponse && !currentAiResponse.isPlaceholder))" 
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
// import { useMarkdown } from '~/composables/useMarkdown';
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
const showResponseWindow = ref(false); // Tracks if the response container DIV is attached
const isResponseHidden = ref(false); // Tracks if content *within* the container is hidden
const showCustomInput = ref(false); // Controls visibility of the text input
const customUserInput = ref(''); 
const inputError = ref(''); // Specific error for input validation
// Store completed interactions (user questions, final AI answers)
const interactionHistory = ref([]); // Array of { type: 'user' | 'ai', text: string }
// Store the prompt text that *led* to the currentAiResponse or the initial prompt
const currentPromptText = ref(''); 
// Stores the AI response currently being streamed or just completed
const currentAiResponse = ref(null); // { text: '', isPlaceholder: boolean }

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
  // Not loaded if currently loading or has an error when window is closed
  // (If window is open, error is displayed inside)
  if (!showResponseWindow.value && (isLoading.value || error.value)) return false;
  
  // Timeline is loaded if it has data (check prop as could be closed)
  if (props.type === 'timeline') {
    return props.timelineData?.length > 0;
  }

  // Prompt/Custom is loaded if there's interaction history OR a valid *completed* current response
  if (props.type === 'prompt' || props.type === 'custom') {
    return interactionHistory.value.length > 0 || 
           (currentAiResponse.value && !currentAiResponse.value.isPlaceholder && !!currentAiResponse.value.text);
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
  currentPromptText.value = '';  // Clear prompt text
  showCustomInput.value = false; 
  customUserInput.value = '';   
  error.value = null;
  inputError.value = ''; // Clear input error
  isLoading.value = false;
};

// Toggle visibility and fetch data if needed
const handleItemClick = async () => {
  if (showResponseWindow.value) {
    // Window is currently open
    const hasInteractionStarted = 
        props.type === 'timeline' || 
        isLoading.value || 
        interactionHistory.value.length > 0 || 
        currentAiResponse.value;
        
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
  currentPromptText.value = ''; 
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
   if (currentAiResponse.value && !currentAiResponse.value.isPlaceholder && currentAiResponse.value.text) {
      // Push only the completed AI response
      interactionHistory.value.push({ type: 'ai', text: currentAiResponse.value.text });
      currentPromptText.value = ''; // Clear the prompt associated with the now-historical response
   } else if (props.type === 'custom' && !interactionHistory.value.length && currentPromptText.value) {
      // Handle edge case: First submission in custom type might have a leftover prompt text
      currentPromptText.value = '';
   }

   // Add new user query (the one just submitted) to history
   interactionHistory.value.push({ type: 'user', text: textToSend });

   const promptForAI = textToSend;
   customUserInput.value = ''; // Clear the input field
   showCustomInput.value = false; // Hide input field while loading
   currentAiResponse.value = null; // Clear the display area for the new response

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
  // Set placeholder in the *current* AI response slot
  currentAiResponse.value = { text: '', isPlaceholder: true };

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
      let errorData; try { errorData = await response.json(); } catch (e) { /* ignore */ }
      throw new Error(errorData?.message || `HTTP error! Status: ${response.status}`);
    }
    if (!response.body) { 
        currentAiResponse.value = null;
        throw new Error('Response body missing.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let isFirstChunk = true; 
    let streamedText = ''; // Accumulate text locally before final assignment if needed

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      
      // Update this instance's *current* AI response
      if (currentAiResponse.value) { 
          if (isFirstChunk && currentAiResponse.value.isPlaceholder) {
             currentAiResponse.value.isPlaceholder = false;
             isFirstChunk = false;
          }
          currentAiResponse.value.text += chunk; 
          streamedText += chunk; // Keep track locally too
      } else { 
          console.warn(`[MobileInteraction:${props.type}] AI response ref became null during stream.`);
          break; 
      }
    }
    
    // Final cleanup & store the prompt that led to this response
    if (currentAiResponse.value) {
        currentPromptText.value = promptTextForAPI; // Store the successful prompt
        if (isFirstChunk && currentAiResponse.value.isPlaceholder) {
            currentAiResponse.value.isPlaceholder = false; 
        }
        if (typeof currentAiResponse.value.text !== 'string') {
            currentAiResponse.value.text = String(streamedText || '');
        }
        // --- Automatically show input after successful response --- 
        if (!currentAiResponse.value.isPlaceholder && currentAiResponse.value.text) {
            showCustomInput.value = true;
        }
        // ----------------------------------------------------------
    } else {
        currentPromptText.value = ''; // Clear prompt if response failed
    }

  } catch (err) {
    console.error(`[MobileInteraction:${props.type}] AI Stream Error:`, err);
    error.value = err.message || 'Failed to get AI response.';
    currentAiResponse.value = null; // Clear response on error
    currentPromptText.value = ''; // Clear prompt on error
  } finally {
    isLoading.value = false;
    // Ensure placeholder is always false after loading finishes
    if(currentAiResponse.value) currentAiResponse.value.isPlaceholder = false; 
    // Re-show input if loading finished and there's content (might be redundant due to above check)
    if (!isLoading.value && currentAiResponse.value?.text) {
        showCustomInput.value = true;
    }
  }
}

</script>

<style scoped>
/* Styles largely remain, but some might be simplified */
.interaction-row {
  @apply w-full flex justify-between items-center text-left p-3 border border-accent-bg text-sm text-fg disabled:opacity-60 transition-colors;
  /* Apply rounding directly based on state now */
}
/* Default hover */
.interaction-row:not([class*='bg-bg-muted']):hover {
   @apply bg-bg-muted;
}
/* Custom button hover */
.interaction-row[class*='bg-bg-muted']:hover {
    @apply bg-accent-bg;
}

/* Active state just changes border */
.interaction-row.active {
   @apply border-primary z-10 relative;
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
  @apply text-sm text-fg leading-snug;
}

/* If using markdown rendering later: */
/* .response-content.prose :deep(p) {
  @apply mb-2;
} */

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
</style> 
