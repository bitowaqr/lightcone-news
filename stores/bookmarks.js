import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

// Define the store
export const useBookmarkStore = defineStore('bookmarks', () => {
  // --- State ---
  // Only store scenario bookmarks
  // REMOVED bookmarkedArticles ref
  const bookmarkedScenarios = ref([]);
  const isLoading = ref(false); // To track async operations later

  // --- Getters ---
  const isBookmarked = computed(() => {
    return (itemId, itemType) => {
      if (!itemId || !itemType || itemType !== 'scenario') return false;
      
      // Check only against scenarios
      return bookmarkedScenarios.value.some(scenario => scenario._id === itemId);
    };
  });

  const allBookmarks = computed(() => {
      // Only return scenarios
      return {
          scenarios: bookmarkedScenarios.value
      }
  })

  // --- Actions ---

  // Fetches bookmarks from API
  async function fetchBookmarks() {    
    if(isLoading.value) return;
    isLoading.value = true;
    try {
      const data = await $fetch('/api/bookmarks'); // Calls the GET endpoint

      // Update state with only scenarios
      // REMOVED article handling
      bookmarkedScenarios.value = data.scenarios || [];
    } catch (error) {
      console.error('[BookmarkStore] Error fetching bookmarks:', error);
      bookmarkedScenarios.value = []; // Clear on error
    } finally {
      isLoading.value = false;
    }
  }

  // Clears bookmarks
  async function clearBookmarks() {
    bookmarkedScenarios.value = [];
  }

  // Adds a scenario bookmark via API
  async function addBookmark(itemId, itemType) {
     // Only allow adding scenarios
     if (!itemId || itemType !== 'scenario') {
         console.warn('[BookmarkStore] Attempted to add bookmark for invalid item type or missing ID:', itemType, itemId);
         return;
     } 

     // Prevent adding if already bookmarked
     if (isBookmarked.value(itemId, itemType)) {
         return; 
     }
 
     // Call API endpoint
    try {
       console.log('Adding scenario bookmark...');
       const response = await $fetch('/api/bookmarks', { 
         method: 'POST', 
         body: { itemId, itemType: 'scenario', action: 'add' } // Ensure itemType is scenario
       });
       if (!response.success) throw new Error('API indicated failure adding bookmark');
       
       // --- MODIFIED: Refetch bookmarks instead of optimistic placeholder add ---
       console.log('Bookmark added via API, refetching bookmarks...');
       await fetchBookmarks();
       // --- END MODIFICATION ---

     } catch (error) {
       console.error('[BookmarkStore] Error adding bookmark via API:', error);
       // Might want to show a user notification here
     }
  }

  // Removes a scenario bookmark via API
  async function removeBookmark(itemId, itemType) {
     // Only allow removing scenarios
     if (!itemId || itemType !== 'scenario') {
        console.warn('[BookmarkStore] Attempted to remove bookmark for invalid item type or missing ID:', itemType, itemId);
        return;
     } 
 
     // Find the index and item for potential revert
     let originalIndex = -1;
     let originalItem = null;
     let listRef = bookmarkedScenarios; // Directly use scenario list
     originalIndex = listRef.value.findIndex(s => s._id === itemId);

     if (originalIndex === -1) {
        return; // Item not found locally, nothing to remove
     }
     originalItem = listRef.value[originalIndex];

     // Optimistic UI update - Remove item from the local array
     listRef.value.splice(originalIndex, 1);

     // Call API endpoint
    try {
       console.log('Removing scenario bookmark...');
         const response = await $fetch('/api/bookmarks', { 
           method: 'POST', 
           body: { itemId, itemType: 'scenario', action: 'remove' } // Ensure itemType is scenario
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
   
   // Toggles scenario bookmark status
   async function toggleBookmark(itemId, itemType) {
      // Only allow toggling scenarios
      if (!itemId || itemType !== 'scenario') {
        console.warn('[BookmarkStore] Attempted to toggle bookmark for invalid item type or missing ID:', itemType, itemId);
        return;
      }
      if (isBookmarked.value(itemId, itemType)) {
          await removeBookmark(itemId, itemType);
      } else {
          await addBookmark(itemId, itemType);
      }
   }

  // --- Return ---
  return {
    // State
    // REMOVED bookmarkedArticles
    bookmarkedScenarios,
    isLoading,
    // Getters
    isBookmarked,
    allBookmarks,
    // Actions
    fetchBookmarks,
    clearBookmarks,
    addBookmark,
    removeBookmark,
    toggleBookmark
  };
});
