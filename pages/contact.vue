<script setup>
import { ref } from 'vue';

const name = ref('');
const email = ref('');
const message = ref('');
const submissionStatus = ref(''); // '', 'sending', 'success', 'error'
const errorMessage = ref('');

const handleSubmit = async () => {
  submissionStatus.value = 'sending';
  errorMessage.value = '';

  try {
    const response = await $fetch('/api/contact', {
      method: 'POST',
      body: {
        name: name.value,
        email: email.value,
        message: message.value,
      },
    });

    if (response.success) {
      submissionStatus.value = 'success';
      // Optionally clear the form
      // name.value = '';
      // email.value = '';
      // message.value = '';
    } else {
      throw new Error(response.message || 'An unknown error occurred.');
    }
  } catch (error) {
    console.error('Contact form submission error:', error);
    submissionStatus.value = 'error';
    errorMessage.value = error.message || 'Failed to send message. Please try again later.';
  }
};

// Function to allow sending another message (optional)
const resetForm = () => {
  submissionStatus.value = '';
  name.value = '';
  email.value = '';
  message.value = '';
  errorMessage.value = '';
};
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <h1 class="text-3xl font-bold mb-6 text-primary-700 dark:text-primary-300">Contact Us</h1>
    
    <div class="bg-article p-6 rounded-lg shadow-sm mb-8 min-h-[300px]">
      <!-- Show Form if not success -->
      <div v-if="submissionStatus !== 'success'">
        <p class="mb-6">
          Have questions, feedback or suggestions? We'd love to hear from you!
        </p>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium mb-1">Name</label>
            <input 
              v-model="name"
              type="text" 
              id="name" 
              required
              class="w-full px-4 py-2 rounded border border-bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 bg-bg"
              placeholder="Your name"
              :disabled="submissionStatus === 'sending'"
            />
          </div>
          
          <div>
            <label for="email" class="block text-sm font-medium mb-1">Email</label>
            <input 
              v-model="email"
              type="email" 
              id="email" 
              required
              class="w-full px-4 py-2 rounded border border-bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 bg-bg"
              placeholder="your.email@example.com"
              :disabled="submissionStatus === 'sending'"
            />
          </div>
          
          <div>
            <label for="message" class="block text-sm font-medium mb-1">Message</label>
            <textarea 
              v-model="message"
              id="message" 
              rows="5" 
              required
              class="w-full px-4 py-2 rounded border border-bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 bg-bg"
              placeholder="Your message here..."
              :disabled="submissionStatus === 'sending'"
            ></textarea>
          </div>
          
          <div class="flex items-center space-x-4">
            <button 
              type="submit" 
              class="px-5 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="submissionStatus === 'sending'"
              >
              {{ submissionStatus === 'sending' ? 'Sending...' : 'Send Message' }}
            </button>
            <!-- Error message shown below button if sending fails -->
            <p v-if="submissionStatus === 'error'" class="text-red-600 dark:text-red-400">Error: {{ errorMessage }}</p>
          </div>
        </form>
      </div>

      <!-- Show Success Message instead of form -->
      <div v-else class="text-center py-10">
        <svg class="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="mt-2 text-lg font-medium text-green-700 dark:text-green-300">Message Sent Successfully!</h3>
        <p class="mt-1 text-text-secondary">Thank you for contacting us. We'll get back to you if needed.</p>
        <!-- Optional: Button to send another message -->
        <!-- 
        <button @click="resetForm" class="mt-4 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-800">
          Send another message
        </button>
        -->
      </div>
    </div>

    <!-- Updated Contact Info Section -->
    <hr class="my-8 border-bg-muted">
    <div class="text-text-secondary text-sm">
      <p>Lightcone News is a service provided by: 
        </p>
        <p>

        <a href="https://priorb.com" class="text-primary-600 dark:text-primary-400 hover:underline">PRIORB</a>,
      Gewerkenstr 8, 44805 Bochum, Germany</p>
      <p class="mt-1">Email: <a href="mailto:contact@priorb.com" class="text-primary-600 dark:text-primary-400 hover:underline">contact@priorb.com</a></p>
    </div>
     <!-- Removed Phone and Address blocks, simplified Email -->

  </div>
</template> 