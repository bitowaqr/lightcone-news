<template>
  <div class="container mx-auto px-4 py-8 max-w-3xl">
    <h1 class="text-3xl font-bold mb-6 text-primary-700 dark:text-primary-300">My Profile</h1>
    <!-- Loading State -->
    <div v-if="authStore.isLoading" class="text-center py-12">
      <Icon name="line-md:loading-twotone-loop" class="w-10 h-10 text-fg-muted animate-spin inline-block" />
      <p class="mt-3 text-fg-muted text-lg">Loading profile...</p>
    </div>

    <!-- Not Logged In State -->
    <div v-else-if="!authStore.isAuthenticated || !authStore.user" class="text-center py-16 bg-article p-8 rounded-lg shadow-sm">
      <Icon name="heroicons:lock-closed-20-solid" class="w-12 h-12 text-fg-muted inline-block mb-4" />
      <p class="text-fg-muted text-xl mb-6">You must be logged in to view your profile.</p>
      <NuxtLink to="/login" class="inline-block bg-primary text-white px-5 py-2.5 rounded-md hover:opacity-90 font-medium transition-opacity">
        Go to Login
      </NuxtLink>
    </div>

    <!-- Profile Content -->
    <div v-else class="flex flex-col md:flex-row gap-6">
      <!-- Left Column: User Summary Card -->
      <div class="md:w-1/3">
        <div class="bg-article p-6 rounded-lg shadow-sm text-center">
          <!-- Avatar Placeholder -->
          <div class="w-24 h-24 bg-accent-bg rounded-full mx-auto flex items-center justify-center mb-4">
            <Icon icon="heroicons:user-20-solid" class="w-12 h-12 text-fg-muted  rounded-full" />
          </div>
          
          <!-- User Name/Email -->
          <h2 class="text-lg font-semibold text-fg mb-1">{{ authStore.user.email.split('@')[0] }}</h2>
          <p class="text-sm text-fg-muted mb-3">{{ authStore.user.email }}</p>
          
          <!-- Role Badge -->
          <div class="mb-3">
            <span 
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                authStore.user.role === 'admin' 
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' 
                  : 'bg-accent-bg text-fg-muted'
              ]"
            >
              {{ authStore.user.role }}
            </span>
          </div>
          
          <!-- Member Since -->
          <p class="text-xs text-fg-muted mt-3">Joined {{ formattedJoinDate }}</p>
        </div>
      </div>

      <!-- Right Column: Settings/Actions -->
      <div class="md:w-2/3 space-y-6">
        <!-- Account Settings -->
        <section class="bg-article p-6 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-fg border-b border-bg-muted pb-2 flex items-center">
            Account Settings
          </h2>
          
          <div class="space-y-4">
            <!-- Edit Profile Button -->
            <button 
              @click="handleEditProfile" 
              class="w-full text-left flex items-center justify-between bg-bg-subtle hover:bg-bg-muted p-4 rounded-md text-fg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div class="flex items-center">
                <Icon icon="heroicons:user" class="w-5 h-5 mr-3 text-fg-muted" />
                <span>Edit Profile</span>
              </div>
              <span class="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded">Coming Soon</span>
            </button>
            
            <!-- Change Password Button -->
            <button 
              @click="handleChangePassword" 
              class="w-full text-left flex items-center justify-between bg-bg-subtle hover:bg-bg-muted p-4 rounded-md text-fg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div class="flex items-center">
                <Icon icon="heroicons:key" class="w-5 h-5 mr-3 text-fg-muted" />
                <span>Change Password</span>
              </div>
              <span class="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded">Coming Soon</span>
            </button>

            <!-- Email Preferences Button (Another placeholder example) -->
            <button 
              @click="() => alert('Email preferences feature is coming soon!')" 
              class="w-full text-left flex items-center justify-between bg-bg-subtle hover:bg-bg-muted p-4 rounded-md text-fg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <div class="flex items-center">
                <Icon icon="heroicons:envelope" class="w-5 h-5 mr-3 text-fg-muted" />
                <span>Email Preferences</span>
              </div>
              <span class="text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 px-2 py-0.5 rounded">Coming Soon</span>
            </button>
          </div>
        </section>

        <!-- Account Actions -->
        <section class="bg-article p-6 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-fg border-b border-bg-muted pb-2 flex items-center">
            Account Actions
          </h2>
          
          <div class="space-y-4">
            <!-- Logout Button -->
            <button
              @click="handleLogout"
              :disabled="isLoggingOut"
              class="w-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-md text-base font-medium disabled:opacity-60 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-bg-dark"
            >
              <Icon icon="heroicons:arrow-right-on-rectangle" class="w-5 h-5 mr-2" />
              {{ isLoggingOut ? 'Logging out...' : 'Logout' }}
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useRouter } from '#app';
import { Icon } from '@iconify/vue'; // Make sure Icon is imported
import { formatRelativeTime } from '~/utils/formatRelativeTime'; // Import the utility

const authStore = useAuthStore();
const router = useRouter();
const isLoggingOut = ref(false);

// Format user join date
const formattedJoinDate = computed(() => {
  if (authStore.user && authStore.user.joinDate) {
    return new Date(authStore.user.joinDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return 'Not available'; 
});

// ADDED: Format last login date
const formattedLastLogin = computed(() => {
  if (authStore.user && authStore.user.lastLogin) {
    return formatRelativeTime(authStore.user.lastLogin);
  }
  return ''; // Or 'Not available' if you prefer for consistency
});

const handleEditProfile = () => {
  // Placeholder for future functionality
  alert('Edit Profile feature is coming soon!');
};

const handleChangePassword = () => {
  // Placeholder for future functionality
  alert('Change Password feature is coming soon!');
};

async function handleLogout() {
  isLoggingOut.value = true;
  try {
    await authStore.logout();
    router.push('/login');
  } catch (e) {
    console.error("Error during logout from profile page:", e);
    // Optionally show an error message to the user
  } finally {
    isLoggingOut.value = false;
  }
}

// Ensure user data is available, or redirect if not authenticated
onMounted(() => {
  if (!authStore.isAuthenticated && !authStore.isLoading) {
    router.push('/login?redirect=/profile');
  }
});
</script>

<style scoped>
</style>
