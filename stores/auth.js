import { defineStore } from 'pinia';
import { useFetch, useRequestHeaders } from '#app'; // Use Nuxt's useFetch

export const useAuthStore = defineStore('auth', {
  // State: properties to store
  state: () => ({
    user: null, // Stores user object { id, email, role, ... } if authenticated
    status: 'idle', // 'idle', 'loading', 'authenticated', 'unauthenticated', 'error'
    error: null, // Stores the last error message
  }),

  // Getters: computed state based on store properties
  getters: {
    isAuthenticated: (state) => state.status === 'authenticated' && !!state.user,
    isLoading: (state) => state.status === 'loading',
    isIdle: (state) => state.status === 'idle',
    getUser: (state) => state.user,
    getAuthStatus: (state) => state.status,
    getError: (state) => state.error,
  },

  // Actions: methods to interact with the store and backend
  actions: {
    // Action called by global middleware or on app load
    async fetchUser() {
      // Avoid fetching if already authenticated or loading
      if (this.isAuthenticated || this.isLoading) {
        // console.log('fetchUser: Already authenticated or loading, skipping fetch.');
        return;
      }
      
      // console.log('fetchUser: Attempting to fetch user data...');
      this.status = 'loading';
      this.error = null;

      try {
        // useFetch automatically handles cookies
        const { data, error } = await useFetch('/api/auth/user', {
           method: 'GET',
           headers: useRequestHeaders(['cookie']), // Ensure cookie is forwarded during SSR
           key: 'auth-user-fetch' // Unique key to prevent duplicate requests
         });

         if (error.value) {
           // Handle different kinds of errors
           if (error.value.statusCode === 401) {
             // console.log('fetchUser: Unauthorized (401), setting status to unauthenticated.');
             this.status = 'unauthenticated';
             this.user = null;
           } else {
             console.error('fetchUser Error (useFetch):', error.value.data?.message || error.value);
             this.status = 'error';
             this.error = error.value.data?.message || 'Failed to fetch user data.';
             this.user = null;
           }
         } else if (data.value && data.value.user) {
           this.user = data.value.user;
           this.status = 'authenticated';
         } else {
            // Should not happen if API returns correctly
            console.warn('fetchUser: Received data but no user object.');
            this.status = 'unauthenticated';
            this.user = null;
         }

      } catch (err) {
        // Catch errors not handled by useFetch error object (less common)
        console.error('fetchUser Error (catch block):', err);
        this.status = 'error';
        this.error = 'An unexpected error occurred while fetching user data.';
        this.user = null;
      }
    },

    async login(credentials) { // Expects { email, password }
        // console.log('login Action: Attempting login...');
        this.status = 'loading';
        this.error = null;
        try {
            const { data, error } = await $fetch('/api/auth/login', { // USE $fetch instead of useFetch
                method: 'POST',
                body: credentials,
                // No key needed for $fetch
            });

            // $fetch throws an error on 4xx/5xx, so error handling needs adjustment
            // If the request is successful, 'data' will contain the response body.
            // If there's an HTTP error, it will be caught in the catch block.

            if (data && data.user) { // Check if data and data.user exist
                // console.log('Login Success:', data.value.user);
                this.user = data.user;
                this.status = 'authenticated';
                return true;
            } else {
                 console.warn('Login: Received response but no user data or unexpected structure.')
                 this.status = 'error';
                 this.error = data?.message || 'Login response was invalid.'; // Use data.message if available
                 this.user = null;
                 return false;
            }
        } catch (err) {
            // console.error('Login Error ($fetch):', err.data?.message || err.message || err);
            this.status = 'error';
            // err.data often contains the structured error response from the server
            this.error = err.data?.message || err.message || 'An unexpected login error occurred.';
            this.user = null;
            return false;
        }
    },

    async register(credentials) { // Expects { email, password }
        // console.log('register Action: Attempting registration...');
        this.status = 'loading';
        this.error = null;
        try {
            const { data, error } = await useFetch('/api/auth/register', {
                method: 'POST',
                body: credentials,
                key: 'auth-register' // Unique key
            });

            if (error.value) {
                console.error('Registration Error (useFetch):', error.value.data?.message || error.value);
                this.status = 'error'; // Or maybe 'idle'?
                this.error = error.value.data?.message || 'Registration failed.';
                return false;
            } else {
                // console.log('Registration Success:', data.value.message);
                this.status = 'idle'; // Registration doesn't log the user in
                return true;
            }
        } catch (err) {
            console.error('Registration Error (catch block):', err);
            this.status = 'error';
            this.error = 'An unexpected registration error occurred.';
            return false;
        }
    },

    async logout() {
        // console.log('logout Action: Attempting logout...');
        this.status = 'loading';
        this.error = null;
        try {
            await $fetch('/api/auth/logout', {
                method: 'POST',
            });
            // console.log('Logout successful on server.');
        } catch (err) {
            console.error('Logout Error:', err);
            // Still proceed with client-side cleanup even if server call fails
        } finally {
            // Clear user state regardless of server response
            this.user = null;
            this.status = 'unauthenticated';
            // console.log('Client state cleared after logout.');
            // Optional: Navigate after logout
            // const router = useRouter(); // Get router instance if needed
            // router.push('/login');
        }
    },
  },
}); 