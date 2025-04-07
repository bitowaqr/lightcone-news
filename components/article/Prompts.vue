<script setup>
import { ref, watch, nextTick } from 'vue';
import { useAuthStore } from '~/stores/auth';

const props = defineProps({ contextId: String }); // e.g., article ID
const userInput = ref('');
const isLoading = ref(false);
const chatError = ref(null);
const authStore = useAuthStore();
const messages = ref([]); // Store all messages (user and AI)
const isInputVisible = ref(false); // Toggle input field visibility
const messagesContainer = ref(null); // Ref for the messages container

// Function to scroll to bottom of messages
const scrollToBottom = async () => {
  await nextTick(); // Wait for DOM update
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// Watch for contextId changes to clear the chat state
watch(() => props.contextId, () => {
  userInput.value = '';
  messages.value = [];
  chatError.value = null;
  isLoading.value = false;
  isInputVisible.value = false;
});

async function submitPrompt(promptText = userInput.value) {
  const textToSend = promptText.trim();
  if (!textToSend) return;

  // Add user message to the chat history
  messages.value.push({
    sender: 'user',
    text: textToSend
  });
  await scrollToBottom(); // Scroll after adding user message

  isLoading.value = true;
  chatError.value = null;
  userInput.value = ''; // Clear input immediately after sending
  await scrollToBottom(); // Scroll when loading starts
  
  try {
    // Use $fetch directly here, includes cookies automatically
    const data = await $fetch('/api/chat', {
      method: 'POST',
      body: {
        prompt: textToSend,
        contextId: props.contextId
      }
    });
    
    // Add AI response to chat history
    messages.value.push({
      sender: 'ai',
      text: data.response
    });
    
    await scrollToBottom(); // Scroll to bottom after response
  } catch (error) {
     console.error("Chat error:", error.data || error);
     chatError.value = error.data?.message || 'Could not get AI response.';
     // Handle 401 specifically - prompt user to log in
     if (error.statusCode === 401) {
        chatError.value = 'Authentication required. Please login to use the chat feature.';
     }
  } finally {
     isLoading.value = false;
  }
}

// Placeholder for fetching suggested prompts - could come from articleData
const suggestedPrompts = ref([
    "What is the main point?",
    "What are the implications?",
    // Add more based on articleData if available
]);

function useSuggestion(prompt) {
    userInput.value = prompt;
    // Remove the used prompt from suggestions
    suggestedPrompts.value = suggestedPrompts.value.filter(p => p !== prompt);
    // Show input field and hide sparkle button
    isInputVisible.value = true;
    submitPrompt(prompt);
}

function toggleInput() {
  if (authStore.isAuthenticated) {
    isInputVisible.value = !isInputVisible.value;
    if (isInputVisible.value) {
      // Focus the input field when it becomes visible
      nextTick(() => {
        // Assuming the textarea has a ref="chatInput"
        // You might need to add ref="chatInput" to the <textarea> element
        // const inputEl = document.querySelector('.chat-input-textarea'); // Or use a ref
        // if (inputEl) inputEl.focus(); 
        // ^-- Focusing requires a ref or more complex querySelector, 
        //     leaving commented for now to avoid adding refs without confirmation.
      });
    }
  }
}
</script>

<template>
  <div class="chat-container text-sm">
    <!-- Login Prompt -->
    <p v-if="!authStore.isAuthenticated" class="text-sm text-primary-600 dark:text-primary-400 mb-3 px-1">
        Please <NuxtLink to="/login" class="underline font-medium">login</NuxtLink> to use the AI chat.
    </p>

    <!-- Edit Icon and Suggested Prompts in one scrollable line -->
    <div class="flex items-center gap-2 mb-3 overflow-x-auto whitespace-nowrap scrollbar-hide py-2 ps-1">
      <!-- Edit Icon -->
      <button 
        v-if="!isInputVisible && authStore.isAuthenticated" 
        @click="toggleInput" 
        class="text-sm bg-bg-muted hover:bg-accent-bg dark:hover:bg-accent-bg/50 text-fg-muted p-1.5 rounded-full border border-accent-bg disabled:opacity-50 transition flex items-center justify-center flex-shrink-0"
        :disabled="isLoading"
        aria-label="Start AI chat"
      >
        <Icon name="mdi:sparkles" class="w-5 h-5" />
      </button>

      <!-- Suggested Prompts -->
      <button
        v-for="(prompt, index) in suggestedPrompts" :key="index"
        @click="() => useSuggestion(prompt)"
        :disabled="isLoading"
        class="text-xs bg-bg-muted hover:bg-accent-bg dark:hover:bg-accent-bg/50 text-fg px-3 py-1.5 rounded-full border border-accent-bg disabled:opacity-50 transition flex-shrink-0"
      >
        {{ prompt }}
      </button>
    </div>

    <!-- Messages Area -->
    <div 
      v-if="messages.length > 0 || isLoading" 
      ref="messagesContainer"
      class="messages-list mb-3 max-h-96 overflow-y-auto space-y-3 p-3 border border-accent-bg rounded-lg bg-bg-muted"
    >
      <div
        v-for="(message, index) in messages"
        :key="index"
        :class="[
          'message-bubble flex flex-col', 
          message.sender === 'user' 
            ? 'items-end' // Align user messages to the right
            : 'items-start' // Align AI messages to the left
        ]"
      >
        <div 
          :class="[
            'p-2 px-3 rounded-lg max-w-[90%] w-fit', // Common bubble styles
            message.sender === 'user' 
              ? 'bg-primary-100 dark:bg-primary-900 border border-primary-200 dark:border-primary-800 text-fg' // User bubble specific styles
              : 'bg-bg dark:bg-background border border-accent-bg text-fg' // AI bubble specific styles
          ]"
        >
          <span v-if="message.sender === 'ai'" class="font-semibold text-primary dark:text-primary-400">AI: </span> 
          <span class="whitespace-pre-wrap break-words">{{ message.text }}</span> 
        </div>
      </div>

      
      <div v-if="isLoading" class="flex items-start"> 
        <div class="p-2 px-3 rounded-lg bg-bg dark:bg-background border border-accent-bg text-fg inline-flex items-center gap-2"> 
          <span class="text-primary dark:text-primary-400">AI thinking...</span>
          <div class="sparkle-animation">
            <Icon name="mdi:sparkles" class="w-4 h-4 animate-sparkle text-primary dark:text-primary-400" /> 
          </div>
        </div>
      </div>
    </div>


    <p v-if="chatError" class="text-red-600 text-sm mb-3 px-1">{{ chatError }}</p>

    <!-- Chat Input Form - Only visible when edit is clicked -->
    <div v-if="isInputVisible && authStore.isAuthenticated" class="relative mt-2">
      <textarea
        ref="chatInput"
        v-model="userInput"
        placeholder="Ask follow-up questions..."
        :disabled="isLoading"
        rows="2"
        class="chat-input-textarea w-full px-3 py-2 border border-accent-bg rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm disabled:bg-bg-muted resize-none bg-bg pr-10"
        @keydown.enter.exact.prevent="submitPrompt()"
      >
      </textarea>
      <button
        @click="submitPrompt()"
        :disabled="isLoading || !userInput.trim()"
        class="p-1 bg-primary hover:bg-primary-600 text-white rounded-full disabled:opacity-50 h-7 w-7 flex items-center justify-center absolute right-2.5 bottom-2.5 transition-colors"
        aria-label="Send message"
      >
        <Icon name="mdi:arrow-up" class="w-5 h-5" />
      </button>
    </div>    
  </div>
</template>

<style scoped>
/* Keep only the animations, remove color/layout styles */
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
    transform: translateY(-3px) rotate(90deg);
  }
  50% {
    transform: translateY(0) rotate(180deg);
  }
  75% {
    transform: translateY(3px) rotate(270deg);
  }
}

.animate-sparkle {
  animation: sparkle-rotate 2s infinite, sparkle-bounce 1.5s infinite;
  transform-origin: center;
}

.sparkle-animation {
  display: inline-flex;
  /* Color is now handled by Tailwind text-primary */
}

/* Hide scrollbar utility */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* Removed .chat-container, .user-message, .ai-message, and dark mode CSS */
/* Tailwind handles dark mode via `dark:` prefixes */
</style> 