<template>
  <div>
    <!-- Content for unauthenticated users landing on / -->
    <!-- Can be a landing page or just a loading indicator -->
     <div class="flex justify-center items-center h-screen">
       <p>Welcome! Redirecting...</p>
     </div>
  </div>
</template>

<script setup>
// No specific logic needed here.
// Unauthenticated users landing here will stay.
// Authenticated users landing here will be redirected to /newsfeed by global middleware.
</script>

<style scoped>
/* Add page-specific styles if needed */
</style>

