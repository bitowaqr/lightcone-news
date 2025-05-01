<script setup>
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks';
import { onMounted, watch } from 'vue';

const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();

// Fetch user state (can run server/client)
await callOnce(async () => {
  if (authStore.status === 'idle') {
    console.log('app.vue callOnce: Fetching user...');
    await authStore.fetchUser();
    console.log('app.vue callOnce: User fetch complete. Status:', authStore.status);
  }
});

// Fetch bookmarks only on the client-side after mount
onMounted(() => {
  // Use nextTick to ensure auth state from callOnce is settled
  nextTick(async () => {
    console.log('app.vue onMounted: Checking auth state. IsAuthenticated:', authStore.isAuthenticated);
    if (authStore.isAuthenticated) {
      console.log('app.vue onMounted: User is authenticated, fetching bookmarks...');
      await bookmarkStore.fetchBookmarks();
    } else {
      console.log('app.vue onMounted: User is not authenticated, skipping bookmark fetch.');
    }
  });

  // Watch for authentication changes *after* mount to fetch bookmarks if user logs in
  watch(() => authStore.isAuthenticated, async (isAuth, wasAuth) => {
    console.log(`app.vue watcher: Auth state changed. Was: ${wasAuth}, Is: ${isAuth}`);
    if (isAuth && !wasAuth) {
      console.log('app.vue watcher: User authenticated after mount, fetching bookmarks...');
      await bookmarkStore.fetchBookmarks();
    }
     // Optional: Handle logout - clear bookmarks?
     // else if (!isAuth && wasAuth) {
     //   console.log('app.vue watcher: User logged out.');
     //   bookmarkStore.clearBookmarks(); // Assuming a clearBookmarks action exists
     // }
  });
});

</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <NuxtRouteAnnouncer />
</template>
