<template>
  <div class="container mx-auto px-4 py-8 max-w-4xl">
    <h1 class="text-3xl font-bold mb-6 text-primary-700 dark:text-primary-300">Contact Us</h1>
    
    <div class="bg-article p-6 rounded-lg shadow-sm mb-8">
      <p class="mb-6">
        Have questions, feedback, or need assistance? We'd love to hear from you. Please use the form below or reach out through one of our alternative contact methods.
      </p>
      
      <form class="space-y-4">
        <div>
          <label for="name" class="block text-sm font-medium mb-1">Name</label>
          <input 
            type="text" 
            id="name" 
            class="w-full px-4 py-2 rounded border border-bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 bg-bg"
            placeholder="Your name"
          />
        </div>
        
        <div>
          <label for="email" class="block text-sm font-medium mb-1">Email</label>
          <input 
            type="email" 
            id="email" 
            class="w-full px-4 py-2 rounded border border-bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 bg-bg"
            placeholder="your.email@example.com"
          />
        </div>
        
        <div>
          <label for="subject" class="block text-sm font-medium mb-1">Subject</label>
          <input 
            type="text" 
            id="subject" 
            class="w-full px-4 py-2 rounded border border-bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 bg-bg"
            placeholder="What's this about?"
          />
        </div>
        
        <div>
          <label for="message" class="block text-sm font-medium mb-1">Message</label>
          <textarea 
            id="message" 
            rows="5" 
            class="w-full px-4 py-2 rounded border border-bg-muted focus:outline-none focus:ring-2 focus:ring-primary-500 bg-bg"
            placeholder="Your message here..."
          ></textarea>
        </div>
        
        <button type="submit" class="px-5 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors">
          Send Message
        </button>
      </form>
    </div>
    
    <div class="grid md:grid-cols-3 gap-6">
      <div class="bg-article p-5 rounded-lg shadow-sm text-center">
        <h3 class="font-bold mb-2 text-primary-600 dark:text-primary-400">Email</h3>
        <p>support@lightcone.news</p>
      </div>
      
      <div class="bg-article p-5 rounded-lg shadow-sm text-center">
        <h3 class="font-bold mb-2 text-primary-600 dark:text-primary-400">Phone</h3>
        <p>+1 (555) 123-4567</p>
      </div>
      
      <div class="bg-article p-5 rounded-lg shadow-sm text-center">
        <h3 class="font-bold mb-2 text-primary-600 dark:text-primary-400">Address</h3>
        <p>123 News Lane<br>San Francisco, CA 94102</p>
      </div>
    </div>
  </div>
</template> 