import CommonConsentBanner from '~/components/common/ConsentBanner.vue';
import CommonWelcomeBanner from '~/components/common/WelcomeBanner.vue';

<template>
  <div class="min-h-screen flex flex-col">
    <LayoutHeader />
    <CommonWelcomeBanner />
    <main class="container mx-auto bg-bg h-full flex flex-col items-center justify-stretch grow w-full">
      <slot />
    </main>
    <LayoutFooter />
    <CommonConsentBanner />
  </div>
</template>

<script setup>
// User fetching is now primarily handled by the global auth middleware.
// Remove the fetchUser call from here to avoid redundancy.

// import { useAuthStore } from '~/stores/auth';
// const authStore = useAuthStore();
// if (authStore.isIdle) {
//   console.log('Layout: Auth store is idle, attempting fetchUser...');
//   await authStore.fetchUser();
// } else {
//   console.log(`Layout: Auth store status is ${authStore.status}, fetchUser not called.`);
// }
</script>

<style scoped>
/* Add any layout-specific styles here */
</style> 