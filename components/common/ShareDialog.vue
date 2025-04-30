<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" @click.self="closeDialog">
    <div class="bg-article rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-medium text-fg">Share Article</h3>
        <button @click="closeDialog" class="text-fg-muted hover:text-fg">
          <Icon name="heroicons:x-mark-20-solid" class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-4">
        <!-- Link -->
        <div>
          <label for="share-link" class="block text-sm font-medium text-fg-muted mb-1">Link</label>
          <div class="flex">
            <input 
              id="share-link" 
              type="text" 
              :value="articleUrl" 
              readonly 
              class="flex-1 block w-full rounded-l-md border border-accent-bg shadow-sm focus:border-primary focus:ring-primary sm:text-sm px-3 py-2 bg-bg-muted text-fg-muted ring-0 outline-none focus:ring-0"
            >
            <button 
              @click="copyLink" 
              class="inline-flex items-center justify-center w-[100px] px-3 py-2 border border-l-0 border-accent-bg rounded-r-md bg-bg hover:bg-bg-alt text-sm font-medium text-primary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            >
              <Icon :name="copyIcon" class="w-4 h-4 mr-1.5 flex-shrink-0" />
              <span class="truncate">{{ copyButtonText }}</span>
            </button>
          </div>
           <p v-if="copyError" class="text-xs text-red-500 mt-1">{{ copyError }}</p>
        </div>

        <!-- Social Buttons -->
        <div class="flex space-x-2">
           <a :href="`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`" target="_blank" rel="noopener noreferrer" class="social-button bg-[#0077b5] hover:bg-[#005e90]" title="Share on LinkedIn">
              <Icon name="mdi:linkedin" class="w-5 h-5" />
           </a>
           <a :href="`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`" target="_blank" rel="noopener noreferrer" class="social-button bg-[#1DA1F2] hover:bg-[#0c85d0]" title="Share on X (Twitter)">
              <Icon name="mdi:twitter" class="w-5 h-5" />
           </a>
           <!-- Facebook removed -->
           <a :href="`https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`" target="_blank" rel="noopener noreferrer" class="social-button bg-[#FF4500] hover:bg-[#cc3700]" title="Share on Reddit">
              <Icon name="mdi:reddit" class="w-5 h-5" />
           </a>
           <a :href="`https://bsky.app/intent/compose?text=${encodedTitle}%0A${encodedUrl}`" target="_blank" rel="noopener noreferrer" class="social-button bg-[#0085FF] hover:bg-[#006acc]" title="Share on Bluesky">
              <Icon name="simple-icons:bluesky" class="w-5 h-5" /> 
           </a>
           <a :href="`mailto:?subject=${encodedTitle}&body=Check out this article: ${encodedUrl}`" class="social-button bg-gray-500 hover:bg-gray-600" title="Share via Email">
              <Icon name="mdi:email-outline" class="w-5 h-5" />
           </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  show: Boolean,
  articleUrl: {
    type: String,
    default: '',
  },
  articleTitle: {
     type: String,
     default: 'Interesting Article',
  }
});

const emit = defineEmits(['close']);

const copyButtonText = ref('Copy');
const copyIcon = ref('heroicons:clipboard-document');
const copyError = ref('');

const encodedUrl = computed(() => encodeURIComponent(props.articleUrl));
const encodedTitle = computed(() => encodeURIComponent(props.articleTitle));

const closeDialog = () => {
  emit('close');
};

const copyLink = async () => {
  copyError.value = ''; // Clear previous error
  try {
    await navigator.clipboard.writeText(props.articleUrl);
    copyButtonText.value = 'Copied!';
    copyIcon.value = 'heroicons:check-20-solid';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
      copyIcon.value = 'heroicons:clipboard-document';
    }, 2000); // Reset after 2 seconds
  } catch (err) {
    console.error('Failed to copy text: ', err);
    copyError.value = 'Could not copy link. Please copy manually.';
    copyButtonText.value = 'Error';
     copyIcon.value = 'heroicons:exclamation-triangle';
     setTimeout(() => {
      copyButtonText.value = 'Copy';
      copyIcon.value = 'heroicons:clipboard-document';
      copyError.value = '';
    }, 3000); 
  }
};

// Reset copy button state if URL changes while dialog is open
watch(() => props.articleUrl, () => {
  copyButtonText.value = 'Copy';
  copyIcon.value = 'heroicons:clipboard-document';
  copyError.value = '';
});
</script>

<style scoped>
.social-button {
  @apply inline-flex items-center justify-center w-10 h-10 rounded-full text-white transition-colors duration-150;
}
</style> 