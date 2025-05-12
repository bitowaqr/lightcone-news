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
});

</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <NuxtRouteAnnouncer />
  <NuxtPwaManifest/>
</template>
