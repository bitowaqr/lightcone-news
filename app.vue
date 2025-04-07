<script setup>
import { useAuthStore } from '~/stores/auth';
const authStore = useAuthStore();

// Use callOnce to ensure this only runs once per session start (server or client)
// Use await to ensure completion before rendering proceeds (important for SSR consistency)
await callOnce(async () => {
    // Fetch user only if state is unknown ('idle').
    if (authStore.status === 'idle') {
        console.log('App Load: Initializing auth state, calling fetchUser...');
        await authStore.fetchUser();
        console.log('App Load: fetchUser attempt complete. Store status:', authStore.status);
    } else {
         console.log('App Load: Auth state already known. Status:', authStore.status);
    }
});
</script>

<template>
  
    <NuxtLayout>
        <NuxtPage />
    </NuxtLayout>
    <NuxtRouteAnnouncer />
  
</template>
