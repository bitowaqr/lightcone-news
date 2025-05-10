import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

const READ_ARTICLES_STORAGE_KEY = 'lightcone_read_articles';

export const useReadArticlesStore = defineStore('readArticles', {
  state: () => ({
    readArticleIds: new Set(), // Stores article IDs
    hasLoadedFromStorage: false,
  }),
  getters: {
    isRead: (state) => (articleId) => {
      return state.readArticleIds.has(articleId);
    },
  },
  actions: {
    loadFromLocalStorage() {
      const authStore = useAuthStore();
      if (!authStore.isAuthenticated || this.hasLoadedFromStorage) {
        // Only load for authenticated users and only once
        // Or if not authenticated, ensure the list is empty (or based on session if we implement that)
        if(!authStore.isAuthenticated) this.readArticleIds = new Set();
        return;
      }
      try {
        const storedData = localStorage.getItem(READ_ARTICLES_STORAGE_KEY);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          this.readArticleIds = new Set(parsedData);
        }
      } catch (error) {
        console.error('Error loading read articles from localStorage:', error);
        this.readArticleIds = new Set(); // Reset on error
      }
      this.hasLoadedFromStorage = true;
    },
    markAsRead(articleId) {
      if (!articleId) return;
      const authStore = useAuthStore();
      if (!authStore.isAuthenticated) return; // Only for logged-in users for now

      if (!this.hasLoadedFromStorage) {
        this.loadFromLocalStorage(); // Ensure we have the latest from storage before modifying
      }

      this.readArticleIds.add(articleId);
      try {
        localStorage.setItem(READ_ARTICLES_STORAGE_KEY, JSON.stringify(Array.from(this.readArticleIds)));
      } catch (error) {
        console.error('Error saving read articles to localStorage:', error);
      }
    },
    markAsUnread(articleId) {
      if (!articleId) return;
      const authStore = useAuthStore();
      if (!authStore.isAuthenticated) return;

      if (!this.hasLoadedFromStorage) {
        this.loadFromLocalStorage();
      }

      this.readArticleIds.delete(articleId);
      try {
        localStorage.setItem(READ_ARTICLES_STORAGE_KEY, JSON.stringify(Array.from(this.readArticleIds)));
      } catch (error) {
        console.error('Error saving read articles to localStorage:', error);
      }
    },
    // Optional: Clear all read articles for a user (e.g., for debugging or a user action)
    clearReadArticles() {
      const authStore = useAuthStore();
      if (!authStore.isAuthenticated) return;
      this.readArticleIds = new Set();
      try {
        localStorage.removeItem(READ_ARTICLES_STORAGE_KEY);
      } catch (error) {
        console.error('Error clearing read articles from localStorage:', error);
      }
      this.hasLoadedFromStorage = false; // Allow reloading if needed later
    }
  },
}); 