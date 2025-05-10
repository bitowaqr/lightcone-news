<template>
  <footer class="bg-bg-muted text-fg-muted text-sm py-6 px-4 border-t border-bg-muted mt-auto">
    <div class="container mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="mb-4 md:mb-0">
          <NuxtLink to="/" class="font-semibold text-fg hover:opacity-80">Lightcone News</NuxtLink>
        </div>
        
        <div class="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-4 md:mb-0">
          <NuxtLink to="/scenarios" class="hover:text-fg">Scenarios</NuxtLink>
          <NuxtLink to="/about" class="hover:text-fg">About</NuxtLink>
          <NuxtLink to="/terms" class="hover:text-fg">Terms</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-fg">Privacy</NuxtLink>
        </div>
        
        <div class="text-xs">
          &copy; {{ new Date().getFullYear() }} PRIORB 
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
// No script logic needed for basic footer
</script>

<style scoped>
/* Footer-specific styles */
</style> 