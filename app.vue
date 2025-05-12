<script setup>
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks';
import { onMounted, onUnmounted, watch, ref, nextTick } from 'vue';
import { useNuxtApp } from '#app';
import InstallPromptBanner from '~/components/common/InstallPromptBanner.vue';

const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();
const { $pwa } = useNuxtApp();

// --- State for screen size detection ---
const isDesktop = ref(false); 

// Fetch user state (can run server/client)
await callOnce(async () => {
  if (authStore.status === 'idle') {
    await authStore.fetchUser();
  }
});

// --- PWA Install Prompt Logic State ---
const showInstallBanner = ref(false);
const installPromptDismissedKey = 'lightcone_install_prompt_dismissed_ts';
let installPromptTimer = null;
const installPromptDelay = 7000; // Delay in ms (e.g., 7 seconds)
const dismissalDuration = 1000 * 60 * 60 * 24 * 3; // 3 days in ms

// --- Screen Size Checker ---
const checkScreenSize = () => {
  // Use a common breakpoint (e.g., 1024px for lg)
  isDesktop.value = window.innerWidth >= 1024;
};

// --- Updated PWA Install Prompt Logic in onMounted ---
onMounted(() => {
  // Initial screen size check
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);

  // Use nextTick to ensure auth state from callOnce is settled
  nextTick(async () => {
    if (authStore.isAuthenticated) {
      await bookmarkStore.fetchBookmarks();
    }
  });

  // Watch for authentication changes *after* mount to fetch bookmarks if user logs in
  watch(() => authStore.isAuthenticated, async (isAuth, wasAuth) => {
    if (isAuth && !wasAuth) {
      await bookmarkStore.fetchBookmarks();
    } else if (!isAuth && wasAuth) {
       bookmarkStore.clearBookmarks(); // Assuming a clearBookmarks action exists
     }
  });

  // PWA Install Prompt Handling (Mobile Only)
  nextTick(() => {
    // Only proceed if PWA is available AND it's not desktop
    if ($pwa && !isDesktop.value) { 
      watch(() => $pwa.showInstallPrompt,
        (newValue) => {
          clearTimeout(installPromptTimer);
          if (newValue) {
            const dismissedTimestamp = localStorage.getItem(installPromptDismissedKey);
            const now = Date.now();
            if (!dismissedTimestamp || (now - parseInt(dismissedTimestamp)) > dismissalDuration) {
              installPromptTimer = setTimeout(() => {
                showInstallBanner.value = true; // Show BANNER
              }, installPromptDelay);
            } 
          } else {
            showInstallBanner.value = false; // Hide BANNER
          }
        },
        { immediate: true } 
      );
    } else if (!$pwa) {
      console.warn('$pwa is not available.');
    } else {
      // console.log('Desktop detected, skipping PWA install prompt logic.');
    }
  });
});

// --- Banner Event Handlers (Renamed state variable) ---
const handleInstallPrompt = () => {
  if ($pwa) {
    $pwa.install();
  }
  showInstallBanner.value = false; // Hide BANNER
  localStorage.setItem(installPromptDismissedKey, Date.now().toString());
};

const handleDismissPrompt = () => {
  showInstallBanner.value = false; // Hide BANNER
  localStorage.setItem(installPromptDismissedKey, Date.now().toString());
};

// Clean up timer and resize listener on unmount
onUnmounted(() => {
  clearTimeout(installPromptTimer);
  window.removeEventListener('resize', checkScreenSize);
});

</script>

<template>
  <NuxtLayout>
    <NuxtPage />
    
    <!-- New Install Prompt Banner (Conditional on Mobile) -->
    <InstallPromptBanner 
      :show="showInstallBanner" 
      @install="handleInstallPrompt" 
      @dismiss="handleDismissPrompt" 
    />

  </NuxtLayout>
  <NuxtRouteAnnouncer />
  <NuxtPwaManifest/>
</template>
