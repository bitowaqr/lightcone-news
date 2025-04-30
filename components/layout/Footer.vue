<template>
  <footer class="bg-bg-muted text-fg-muted text-sm p-6 border-t border-fg-muted mt-auto">
    <div class="container mx-auto">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="mb-4 md:mb-0">
          <NuxtLink to="/" class="font-medium hover:text-fg">Lightcone News</NuxtLink>
        </div>
        
        <div class="flex flex-wrap justify-center gap-6 mb-4 md:mb-0">
          <NuxtLink to="/scenarios" class="hover:text-fg">Scenarios</NuxtLink>
          <NuxtLink to="/bookmarks" class="hover:text-fg">Bookmarks</NuxtLink>
          <NuxtLink to="/about" class="hover:text-fg">About</NuxtLink>
          <NuxtLink to="/terms" class="hover:text-fg">Terms</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-fg">Privacy</NuxtLink>
          <NuxtLink to="/contact" class="hover:text-fg">Contact</NuxtLink>
        </div>
        
        <div class="text-xs">
          &copy; {{ new Date().getFullYear() }} Lightcone News
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