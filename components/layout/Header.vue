<script setup>
import { useAuthStore } from '~/stores/auth';
import { useRouter } from 'vue-router';
import { Icon } from '@iconify/vue';
import { useDarkMode } from '~/composables/useDarkMode';
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/vue';

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

// Helper for dropdown navigation
function handleDropdownNav(close, path) {
  close();
  setTimeout(() => {
    router.push(path);
  }, 0);
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
          <NuxtLink 
            to="/" 
            class="flex items-center"
          >
          <div class="p-1 rounded-full hover:bg-bg-muted transition-colors duration-150">
            <img src="~/assets/logos/logo-naked.svg" alt="Logo" class="w-8 h-8 dark:invert" />
          </div>
            <span class="ml-2 pt-0.5 text-fg text-lg font-medium font-serif block md:hidden whitespace-nowrap">Lightcone News</span>
          </NuxtLink>
          <!-- Desktop Main Navigation Links -->
          <div class="hidden md:flex space-x-4 items-center text-base">
            <NuxtLink to="/" class="text-fg hover:text-primary transition-colors duration-100">News</NuxtLink>
            <NuxtLink to="/scenarios" class="text-fg hover:text-primary transition-colors duration-100">Scenarios</NuxtLink>
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
              <!-- User Dropdown Menu -->
              <Menu as="div" class="relative inline-block text-left">
                <div>
                  <MenuButton 
                    class="flex items-center justify-center w-8 h-8 rounded-full bg-bg-muted hover:bg-bg-subtle text-fg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-dark focus:ring-primary"
                  >
                    <Icon icon="heroicons:user-circle-20-solid" class="w-5 h-5" />
                  </MenuButton>
                </div>

                <transition
                  enter-active-class="transition duration-100 ease-out"
                  enter-from-class="transform scale-95 opacity-0"
                  enter-to-class="transform scale-100 opacity-100"
                  leave-active-class="transition duration-75 ease-in"
                  leave-from-class="transform scale-100 opacity-100"
                  leave-to-class="transform scale-95 opacity-0"
                >
                  <MenuItems class="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-bg-muted rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div class="px-1 py-1">
                      <MenuItem v-slot="{ active, close }">
                        <button
                          type="button"
                          @click="() => handleDropdownNav(close, '/profile')"
                          :class="[
                            active ? 'bg-primary text-white' : 'text-fg',
                            'group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors',
                          ]"
                        >
                          <Icon icon="heroicons:user-circle-20-solid" :active="active" class="mr-2 h-5 w-5" aria-hidden="true" />
                          Profile
                        </button>
                      </MenuItem>
                      <MenuItem v-if="isAdmin" v-slot="{ active, close }">
                        <button
                          type="button"
                          @click="() => handleDropdownNav(close, '/admin')"
                          :class="[
                            active ? 'bg-primary text-white' : 'text-fg',
                            'group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors',
                          ]"
                        >
                          <Icon icon="heroicons:shield-check-20-solid" :active="active" class="mr-2 h-5 w-5" aria-hidden="true" />
                          Admin
                        </button>
                      </MenuItem>
                    </div>
                    <div class="px-1 py-1">
                      <MenuItem v-slot="{ active, close }">
                        <button
                          @click="() => { handleLogout(); close(); }"
                          :disabled="authStore.isLoading"
                          :class="[
                            active ? 'bg-red-500 text-white' : 'text-red-500 dark:text-red-400',
                            'group flex w-full items-center rounded-md px-2 py-2 text-sm transition-colors disabled:opacity-50',
                          ]"
                        >
                          <Icon icon="heroicons:arrow-left-on-rectangle-20-solid" :active="active" class="mr-2 h-5 w-5" aria-hidden="true" />
                          Logout
                        </button>
                      </MenuItem>
                    </div>
                  </MenuItems>
                </transition>
              </Menu>
              <!-- END: User Dropdown Menu -->
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
          <div class="container mx-auto px-4 py-4 flex flex-col space-y-1">
            <NuxtLink
              to="/"
              class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
              @click="mobileMenuOpen = false"
            >
              News
            </NuxtLink>
             <NuxtLink
              to="/scenarios"
              class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
              @click="mobileMenuOpen = false"
            >
              Scenarios
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

            <!-- **** ADDED: PROFILE LINK (Mobile) **** -->
            <NuxtLink
              v-if="authStore.isAuthenticated"
              to="/profile"
              class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
              @click="mobileMenuOpen = false"
            >
              Profile
            </NuxtLink>
            <!-- *********************************** -->

            <!-- **** ADMIN LINK (Mobile) **** -->
             <NuxtLink
                v-if="isAdmin"
                to="/admin"
                class="text-fg hover:text-primary px-2 py-2 rounded hover:bg-bg-muted"
                 @click="mobileMenuOpen = false"
              >
                Admin
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
                  class="flex items-center px-3 py-1.5 rounded-md text-sm disabled:opacity-50 text-fg bg-bg hover:bg-bg-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200"
                >
                  <Icon icon="heroicons:arrow-right-on-rectangle-20-solid" class="w-4 h-4 mr-1" />
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
      <!-- Sector Selection Row -->
      <div v-if="false" class="w-full bg-bg shadow-sm border-b border-bg-light">
        <div class="container mx-auto px-4 py-0.5 flex-nowrap flex overflow-x-auto space-x-1 items-center text-xs select-none whitespace-nowrap">
          <NuxtLink
            to="/"
            class="px-2 py-0.5 rounded-full transition-colors duration-150 text-primary/80 font-medium cursor-pointer hover:text-primary hover:bg-primary/10"
            >Global</NuxtLink>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >USA</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >UK</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >Germany</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >France</span>
          <span class="mx-1 text-fg-muted opacity-40 select-none">|</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >Pharma</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >HEOR</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >Solar</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >Supply Chain</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >Climate</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >Fintech</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >Energy</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >AgriTech</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >Cybersecurity</span>
          <span
            class="px-2 py-0.5 rounded-full text-fg-muted opacity-40 cursor-not-allowed hover:bg-primary/20 transition-colors duration-150"
            title="Subscriber feature"
            >Insurance</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Add transitions for header visibility */
header {
  will-change: transform;
}
</style> 