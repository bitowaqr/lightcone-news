import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Define the store
export const useBookmarkStore = defineStore('bookmarks', () => {
  // --- State ---
  // Store full objects fetched from API
  const bookmarkedArticles = ref([]); 
  const bookmarkedScenarios = ref([]);
  const isLoading = ref(false); // To track async operations later

  // --- Getters ---
  const isBookmarked = computed(() => {
    return (itemId, itemType) => {
      if (!itemId || !itemType) return false;
      
      // Check against the stored objects
      if (itemType === 'article') {
        return bookmarkedArticles.value.some(article => article._id === itemId);
      } else if (itemType === 'scenario') {
        return bookmarkedScenarios.value.some(scenario => scenario._id === itemId);
      }
      return false;
    };
  });

  const allBookmarks = computed(() => {
      return {
          articles: bookmarkedArticles.value,
          scenarios: bookmarkedScenarios.value
      }
  })

  // --- Actions ---

  // Fetches bookmarks from dummy API
  async function fetchBookmarks() {    
    isLoading.value = true;
    try {
      const data = await $fetch('/api/bookmarks'); // Calls the dummy GET endpoint

      // Update state with full objects
      bookmarkedArticles.value = data.articles || [];
      bookmarkedScenarios.value = data.scenarios || [];
    } catch (error) {
      console.error('[BookmarkStore] Error fetching bookmarks:', error);
      bookmarkedArticles.value = []; // Clear on error
      bookmarkedScenarios.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // Adds a bookmark via dummy API
  async function addBookmark(itemId, itemType) {
     if (!itemId || !itemType) return;

     // Prevent adding if already bookmarked
     if (isBookmarked.value(itemId, itemType)) {
         return; 
     }
 
     // Call dummy API endpoint
     try {
       const response = await $fetch('/api/bookmarks', { 
         method: 'POST', 
         body: { itemId, itemType, action: 'add' } 
       });
       if (!response.success) throw new Error('API indicated failure adding bookmark');
       
       // Optimistically add the item (basic version - just ID for icon state)
       // Add a minimal placeholder object to the local state array so that 
       // the isBookmarked getter will return true immediately.
       // The full object data will appear on the next fetch.
       if (itemType === 'article') {
           if (!bookmarkedArticles.value.some(a => a._id === itemId)) {
               // Add placeholder with just the ID
               bookmarkedArticles.value.push({ _id: itemId }); 
           }
       } else if (itemType === 'scenario') {
           if (!bookmarkedScenarios.value.some(s => s._id === itemId)) {
                // Add placeholder with just the ID
                bookmarkedScenarios.value.push({ _id: itemId });
           }
       }

     } catch (error) {
       console.error('[BookmarkStore] Error adding bookmark via API:', error);
       // Error handled, no state revert needed as we didn't optimistically update the list
       // Might want to show a user notification here
     }
  }

  // Removes a bookmark via dummy API
  async function removeBookmark(itemId, itemType) {
     if (!itemId || !itemType) return;
 
     // Find the index and item for potential revert
     let originalIndex = -1;
     let originalItem = null;
     let listRef = null;
     if (itemType === 'article') {
         listRef = bookmarkedArticles;
         originalIndex = listRef.value.findIndex(a => a._id === itemId);
     } else if (itemType === 'scenario') {
         listRef = bookmarkedScenarios;
         originalIndex = listRef.value.findIndex(s => s._id === itemId);
     }

     if (originalIndex === -1) {
        return; // Item not found locally, nothing to remove
     }
     originalItem = listRef.value[originalIndex];

     // Optimistic UI update - Remove item from the local array
     listRef.value.splice(originalIndex, 1);

     // Call dummy API endpoint
     try {
         const response = await $fetch('/api/bookmarks', { 
           method: 'POST', 
           body: { itemId, itemType, action: 'remove' } 
         });
         if (!response.success) throw new Error('API indicated failure removing bookmark');
         // No need to refetch on successful remove with optimistic update

       } catch (error) {
         console.error('[BookmarkStore] Error removing bookmark via API:', error);
         // Revert optimistic update on failure
         if (listRef && originalItem && originalIndex !== -1) {
             listRef.value.splice(originalIndex, 0, originalItem);
         }
         // Might want to show a user notification here
       }
   }
   
   // Toggles bookmark status
   async function toggleBookmark(itemId, itemType) {
      if (!itemId || !itemType) return;
      if (isBookmarked.value(itemId, itemType)) {
          await removeBookmark(itemId, itemType);
      } else {
          // Note: Adding might feel slightly delayed as it waits for fetchBookmarks
          await addBookmark(itemId, itemType);
      }
   }

  // --- Return ---
  return {
    // State
    bookmarkedArticles,
    bookmarkedScenarios,
    isLoading,
    // Getters
    isBookmarked,
    allBookmarks,
    // Actions
    fetchBookmarks,
    addBookmark,
    removeBookmark,
    toggleBookmark
  };
});
