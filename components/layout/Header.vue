<script setup>
import { useAuthStore } from '~/stores/auth';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useDarkMode } from '~/composables/useDarkMode';
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';

const authStore = useAuthStore();
const router = useRouter();
const { isDark, toggleDarkMode } = useDarkMode();
const mobileMenuOpen = ref(false);
const mobileMenuRef = ref(null);
const mobileButtonRef = ref(null);
const isHeaderVisible = ref(true);
const lastScrollY = ref(0);

// Computed property for admin check
const isAdmin = computed(() => authStore.isAuthenticated && authStore.user?.role === 'admin');

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const handleClickOutside = (event) => {
  if (mobileMenuOpen.value &&
      mobileMenuRef.value &&
      !mobileMenuRef.value.contains(event.target) &&
      mobileButtonRef.value?.contains && // Check if ref exists and has contains
      !mobileButtonRef.value.contains(event.target)) {
    mobileMenuOpen.value = false;
  }
};

const handleScroll = () => {
  const currentScrollY = window.scrollY;
  
  // Always show header when: at top of page, within first 100px, or mobile menu is open
  if (currentScrollY <= 100 || mobileMenuOpen.value) {
    isHeaderVisible.value = true;
  } else {
    // Below 100px and menu closed: show on scroll up, hide on scroll down
    isHeaderVisible.value = currentScrollY < lastScrollY.value;
  }
  
  lastScrollY.value = currentScrollY;
};

// Add a watcher to ensure header is visible when menu opens
watch(mobileMenuOpen, (isOpen) => {
  if (isOpen) {
    isHeaderVisible.value = true;
  }
});

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true); // Use capture phase maybe
  
  // Only add scroll listener on client-side
  if (process.client) {
    window.addEventListener('scroll', handleScroll, { passive: true });
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside, true);
  
  // Only remove if we're on client-side
  if (process.client) {
    window.removeEventListener('scroll', handleScroll);
  }
});

async function handleLogout() {
   // Logout logic seems fine, but let's ensure state is cleared immediately
    try {
        await authStore.logout();
    } catch (e) {
        console.error("Error during logout API call:", e);
    } finally {
        // Ensure redirection happens after state is cleared
        router.push('/login');
    }
}
</script>

<template>
  <header 
    :class="[
      'sticky top-0 z-50 transition-transform duration-300 bg-bg shadow-sm',
      { '-translate-y-full': !isHeaderVisible }
    ]"
  >
    <div class="bg-bg relative">
      <nav class="container mx-auto px-4 py-2 flex justify-between items-center">
        <!-- Left Section: Logo + Main Nav Links -->
        <div class="flex items-center space-x-4">
          <NuxtLink to="/" class="flex items-center gap-2 hover:opacity-80 transition-opacity duration-100">
            <img src="~/assets/logos/logo-naked.svg" alt="Logo" class="w-8 h-8 dark:invert" />
            <span class="text-lg text-fg hover:text-fg">Lightcone</span>
          </NuxtLink>
          <!-- Desktop Main Navigation Links -->
          <div class="hidden md:flex space-x-4 items-center text-base">
            <NuxtLink to="/scenarios" class="text-fg hover:text-primary transition-colors duration-100">Scenarios</NuxtLink>
            <NuxtLink to="/scenarios/request" class="text-fg hover:text-primary transition-colors duration-100">Request Forecast</NuxtLink>
            <NuxtLink to="/about" class="text-fg hover:text-primary transition-colors duration-100">About</NuxtLink>
          </div>
        </div>

        <!-- Mobile Menu Button -->
        <button
          ref="mobileButtonRef"
          @click="toggleMobileMenu"
          class="md:hidden p-2 rounded-full text-fg hover:bg-bg-muted focus:outline-none"
          aria-label="Toggle mobile menu"
        >
          <Icon
            :icon="mobileMenuOpen ? 'heroicons:x-mark-20-solid' : 'heroicons:bars-3-20-solid'"
            class="w-6 h-6"
          />
        </button>

        <!-- Right Section: Theme Toggle + Auth -->
        <div class="hidden md:flex space-x-4 items-center">
          <!-- Dark Mode Toggle Button -->
          <button @click="toggleDarkMode" class="p-2 rounded-full text-fg hover:bg-bg-muted focus:outline-none">
            <Icon :icon="isDark ? 'heroicons:sun-20-solid' : 'heroicons:moon-20-solid'" class="w-5 h-5" />
          </button>

          <ClientOnly>
            <!-- Loading State -->
            <span v-if="authStore.isLoading" class="text-fg-muted italic">Checking auth...</span>

            <!-- Authenticated State -->
            <template v-else-if="authStore.isAuthenticated">
              <!-- **** ADMIN LINK **** -->
              <NuxtLink
                v-if="isAdmin"
                to="/admin"
                class="font-mono text-xs bg-yellow-200 text-black dark:bg-yellow-700 dark:text-white px-2 py-1 rounded hover:opacity-80"
              >
                &lt;Admin/&gt;
              </NuxtLink>
              <!-- ******************* -->
              <button @click="handleLogout" :disabled="authStore.isLoading" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50">
                Logout
              </button>
            </template>

            <!-- Unauthenticated State -->
            <template v-else>
              <NuxtLink
                to="/login"
                class="text-primary border border-primary px-3 py-1 rounded text-sm hover:bg-primary hover:text-white transition-colors duration-200"
              >
                Login
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="bg-primary text-white px-3 py-1 rounded text-sm hover:opacity-90 transition-opacity duration-200"
              >
                Register
              </NuxtLink>
            </template>

            <!-- Fallback content if needed (optional) -->
            <template #fallback>
              <!-- This will be rendered on the server and initially on the client -->
              <span class="text-fg-muted italic">Loading...</span>
            </template>
          </ClientOnly>
        </div>

        <!-- Mobile Menu (Slide Down) -->
        <div
          ref="mobileMenuRef"
          v-show="mobileMenuOpen"
          class="md:hidden absolute top-full left-0 right-0 bg-bg z-50 shadow-lg border-t border-bg-muted"
        >
          <div class="container mx-auto px-4 py-4 flex flex-col space-y-2">
            <NuxtLink
              to="/"
              class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
              @click="mobileMenuOpen = false"
            >
              Newsfeed
            </NuxtLink>
             <NuxtLink
              to="/scenarios"
              class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
              @click="mobileMenuOpen = false"
            >
              Scenarios
            </NuxtLink>
            
            <NuxtLink
              to="/scenarios/request"
              class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
              @click="mobileMenuOpen = false"
            >
              Request Forecast
            </NuxtLink>

            <NuxtLink
              to="/about"
              class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
              @click="mobileMenuOpen = false"
            >
              About
            </NuxtLink>

            <NuxtLink
              to="/privacy"
              class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
              @click="mobileMenuOpen = false"
            >
              Privacy
            </NuxtLink>

            <NuxtLink
              to="/terms"
              class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
              @click="mobileMenuOpen = false"
            >
              Terms
            </NuxtLink>

            <!-- **** ADMIN LINK (Mobile) **** -->
             <NuxtLink
                v-if="isAdmin"
                to="/admin"
                class="font-mono text-sm bg-yellow-200 text-black dark:bg-yellow-700 dark:text-white px-2 py-2 rounded hover:opacity-80 text-center"
                 @click="mobileMenuOpen = false"
              >
                &lt;Admin Dashboard/&gt;
              </NuxtLink>
            <!-- ************************** -->


            <div class="flex items-center justify-between pt-2 border-t border-bg-muted">
              <div class="flex items-center space-x-2">
                <span class="text-fg">Theme:</span>
                <button @click="toggleDarkMode" class="p-2 rounded text-fg hover:bg-bg-muted focus:outline-none">
                  <Icon :icon="isDark ? 'heroicons:sun-20-solid' : 'heroicons:moon-20-solid'" class="w-5 h-5" />
                </button>
              </div>

              <ClientOnly>
                <!-- Authenticated State -->
                <button
                  v-if="authStore.isAuthenticated"
                  @click="handleLogout"
                  :disabled="authStore.isLoading"
                  class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                >
                  Logout
                </button>

                <!-- Unauthenticated State -->
                <div v-else class="flex space-x-4">
                  <NuxtLink
                    to="/login"
                    class="text-primary border border-primary px-3 py-1 rounded text-sm hover:bg-primary hover:text-white transition-colors duration-200"
                    @click="mobileMenuOpen = false"
                  >
                    Login
                  </NuxtLink>
                  <NuxtLink
                    to="/register"
                    class="bg-primary text-white px-3 py-1 rounded text-sm hover:opacity-90 transition-opacity duration-200"
                    @click="mobileMenuOpen = false"
                  >
                    Sign up
                  </NuxtLink>
                </div>
              </ClientOnly>
            </div>
          </div>
        </div>
      </nav>
    </div>
  </header>
</template>

<style scoped>
/* Add transitions for header visibility */
header {
  will-change: transform;
}
</style> 