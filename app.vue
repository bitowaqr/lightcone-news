<script setup>
import { useAuthStore } from '~/stores/auth';
import { useBookmarkStore } from '~/stores/bookmarks';

const authStore = useAuthStore();
const bookmarkStore = useBookmarkStore();

await callOnce(async () => {
  if (authStore.status === 'idle') {
    const userFetched = await authStore.fetchUser();
    if (userFetched && authStore.isAuthenticated) {
      await bookmarkStore.fetchBookmarks();
    }
  } else {
    if (authStore.isAuthenticated) {
      await bookmarkStore.fetchBookmarks();
    }
  }
});
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <NuxtRouteAnnouncer />
</template>
