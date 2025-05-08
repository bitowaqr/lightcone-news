<template>
  <div class="p-4 md:p-6 max-w-7xl mx-auto dark:text-gray-200">
    <h1 class="text-3xl font-bold mb-6 border-b pb-2 dark:border-gray-700">Admin Dashboard</h1>

    <!-- Links to Other Admin Pages -->
    <div class="mb-4 text-right space-x-4">
      <NuxtLink to="/admin/update-newsfeed" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
        Go to Update Newsfeed &raquo;
      </NuxtLink>
      <NuxtLink to="/admin/lineup-curation" class="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
        Go to Lineup Curation &raquo;
      </NuxtLink>
    </div>

    <!-- Collection Management Section -->
    <section class="mb-8 p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <h2 class="text-xl font-semibold mb-3">Manage Collections</h2>
      <div class="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-3 sm:space-y-0">
        <div class="flex-grow sm:flex-grow-0 sm:w-1/3">
          <label for="collectionSelect" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Select Collection:
          </label>
          <select
            id="collectionSelect"
            v-model="selectedCollection"
            @change="handleCollectionChange"
            class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
            :disabled="loadingCollections"
          >
            <option disabled value="">{{ loadingCollections ? 'Loading...' : 'Choose a collection' }}</option>
            <option v-for="col in collections" :key="col" :value="col">{{ col }}</option>
          </select>
          <div v-if="errorCollections" class="mt-1 text-xs text-red-500">Error: {{ errorCollections.message }}</div>
        </div>

        <!-- Basic Query Controls -->
        <div class="flex-grow">
           <label for="filterKey" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter Key (e.g., status, email):</label>
           <input id="filterKey" type="text" v-model.trim="queryOptions.filterKey" placeholder="field name" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
         </div>
         <div class="flex-grow">
           <label for="filterValue" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Filter Value:</label>
           <input id="filterValue" type="text" v-model.trim="queryOptions.filterValue" placeholder="value" @keyup.enter="fetchDocuments(1)" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
         </div>
         <!-- Sorting Controls -->
         <div class="flex-grow">
            <label for="sortField" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort By:</label>
            <select id="sortField" v-model="queryOptions.sortField" @change="fetchDocuments(1)" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                <option value="updatedAt">Updated Date</option>
                <option value="createdAt">Created Date</option>
                <option value="title">Title</option>
                <option value="priority">Priority</option>
            </select>
         </div>
         <div class="flex-grow">
             <label for="sortDirection" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direction:</label>
             <select id="sortDirection" v-model="queryOptions.sortDirection" @change="fetchDocuments(1)" class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                 <option value="desc">Descending</option>
                 <option value="asc">Ascending</option>
             </select>
         </div>
        <div class="flex-shrink-0">
           <button @click="fetchDocuments(1)" :disabled="!selectedCollection || loadingDocuments" class="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
             {{ loadingDocuments ? 'Querying...' : 'Query' }}
           </button>
        </div>
        <!-- Button to toggle Article Creator -->
        <div v-if="selectedCollection === 'Article'" class="flex-shrink-0 ml-4">
           <button @click="showCreator = !showCreator; selectedDocumentId = null;" class="w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
             {{ showCreator ? 'Cancel Create' : 'Create New Article' }}
           </button>
        </div>
      </div>
       <!-- Common Status Filters (Example) -->
       <div v-if="selectedCollection === 'Article' || selectedCollection === 'SourceDocument'" class="mt-3 pt-3 border-t dark:border-gray-700">
           <span class="text-sm font-medium mr-2">Quick Filter by Status:</span>
           <button v-for="status in commonStatuses[selectedCollection]" :key="status"
                   @click="quickFilterStatus(status)"
                   class="mr-2 mb-1 px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-600 dark:border-gray-600 disabled:opacity-50"
                   :class="{ 'bg-indigo-100 dark:bg-indigo-900 font-semibold': queryOptions.filterKey === 'status' && queryOptions.filterValue === status }"
                   :disabled="loadingDocuments">
             {{ status }}
           </button>
           <button v-if="queryOptions.filterKey === 'status'"
                   @click="clearStatusFilter"
                   class="ml-2 px-2 py-1 text-xs border rounded hover:bg-gray-100 dark:hover:bg-gray-600 dark:border-gray-600"
                   title="Clear status filter">
             &times; Clear
           </button>
       </div>
    </section>

    <!-- Document List & Editor Section -->
    <section v-if="selectedCollection" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Document List Column -->
      <div class="lg:col-span-1 p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-xl font-semibold">
            {{ selectedCollection }} Documents
            <span v-if="paginationInfo.totalDocuments > 0"> ({{ paginationInfo.totalDocuments }})</span>
          </h2>
          <!-- Delete All Listed Button -->
          <button
            v-if="selectedCollection === 'StoryIdeas' && documents.length > 0"
            @click="confirmDeleteListedDocuments"
            :disabled="deletingMultiple || loadingDocuments"
            class="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
          >
            {{ deletingMultiple ? 'Deleting...' : 'Delete All Listed' }}
          </button>
        </div>

        <div v-if="loadingDocuments" class="text-center my-4 text-gray-500 dark:text-gray-400">Loading...</div>
        <div v-else-if="errorDocuments" class="my-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
            Error fetching documents: {{ errorDocuments.message }}
        </div>
        <div v-else-if="documents.length > 0">
          <ul class="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
            <li v-for="doc in documents" :key="doc._id"
                class="p-2 border rounded dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150"
                :class="{ 'bg-indigo-50 dark:bg-indigo-900 border-indigo-300 dark:border-indigo-700': selectedDocumentId === doc._id }"
                @click="selectDocument(doc._id)">
              <div class="text-sm font-medium truncate" :title="doc.title || doc.question || doc.email || doc.url || doc.name || 'Document'">
                  {{ doc.title || doc.question || doc.email || doc.url || doc.name || 'Document' }}
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                ID: {{ doc._id }}
                <span v-if="doc.status"> | Status: <span class="font-semibold">{{ doc.status }}</span></span>
                 <span v-if="doc.platform"> | Platform: {{ doc.platform }}</span>
                 <span v-if="doc.meta?.publisher"> | Publisher: {{ doc.meta.publisher }}</span>
                 <span v-if="doc.role"> | Role: {{ doc.role }}</span>
                 <span v-if="doc.publishedDate"> | Published: {{ formatDate(doc.publishedDate) }}</span>
                 <span v-if="doc.createdAt"> | Created: {{ formatDate(doc.createdAt) }}</span>
              </div>
            </li>
          </ul>
          <!-- Basic Pagination -->
          <div v-if="paginationInfo.totalPages > 1" class="mt-4 pt-3 border-t dark:border-gray-600 flex justify-between items-center text-sm">
             <button
                :disabled="paginationInfo.currentPage <= 1 || loadingDocuments"
                @click="fetchDocuments(paginationInfo.currentPage - 1)"
                class="px-3 py-1 border rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 disabled:opacity-50">
               &laquo; Previous
             </button>
             <span>Page {{ paginationInfo.currentPage }} of {{ paginationInfo.totalPages }}</span>
             <button
                :disabled="paginationInfo.currentPage >= paginationInfo.totalPages || loadingDocuments"
                @click="fetchDocuments(paginationInfo.currentPage + 1)"
                class="px-3 py-1 border rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 disabled:opacity-50">
               Next &raquo;
             </button>
          </div>
        </div>
        <div v-else class="my-4 text-center text-gray-500 dark:text-gray-400">No documents found for the current query.</div>
      </div>

      <!-- Document Editor/Creator Column -->
      <div class="lg:col-span-2 p-4 border rounded dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm min-h-[75vh] flex flex-col">
        
        <!-- Conditionally render Creator -->
        <template v-if="showCreator && currentCreatorComponent">
          <component 
            :is="currentCreatorComponent" 
            ref="articleCreatorRef"
            :collection-name="selectedCollection"
            @create="handleCreatorSubmit"
            @cancel="showCreator = false"
          />
        </template>

        <!-- Conditionally render Editor (only if not showing creator) -->
        <template v-else>
          <h2 class="text-xl font-semibold mb-3">Document Editor</h2>
          <div v-if="loadingSelectedDocument" class="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
             Loading document...
          </div>
           <div v-else-if="errorSelectedDocument" class="my-4 p-3 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 rounded">
              Error loading document: {{ errorSelectedDocument.message }}
          </div>
          <div v-else-if="selectedDocumentId && selectedDocumentData" class="flex flex-col flex-grow">
            <!-- Top-level actions -->
            <div class="mb-3 flex justify-end">
              
              <button 
                @click="confirmDeleteDocument" 
                :disabled="deletingDocument" 
                class="inline-flex items-center px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                <span v-if="deletingDocument">Deleting...</span>
                <span v-else>Delete Document</span>
              </button>
            </div>
            
            <!-- Dynamic editor component based on selectedCollection -->
            <component 
              :is="currentEditorComponent" 
              :document="selectedDocumentData" 
              :collection-name="selectedCollection"
              :saving="savingDocument" 
              :save-error="saveError"
              @save="handleEditorSave" 
              @cancel="clearSelection"
            />
            
            <!-- Error Messages -->
            <div v-if="deleteError" class="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              Delete error: {{ deleteError }}
            </div>
          </div>
           <div v-else class="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
               <p>Select a document from the list on the left to view and edit its details, or click "Create New Article".</p>
           </div>
        </template>
      </div>
    </section>

    <!-- Placeholder for when no collection is selected -->
    <section v-else class="text-center py-10 text-gray-500 dark:text-gray-400">
        <p>Please select a collection above to start managing documents.</p>
    </section>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ArticleEditor from '../../components/admin/editors/ArticleEditor.vue';
import ScenarioEditor from '../../components/admin/editors/ScenarioEditor.vue';
import SourceDocumentEditor from '../../components/admin/editors/SourceDocumentEditor.vue';
import GenericJsonEditor from '../../components/admin/editors/GenericJsonEditor.vue';
import StoryIdeasEditor from '../../components/admin/editors/StoryIdeasEditor.vue';
import ArticleCreator from '../../components/admin/editors/ArticleCreator.vue';
import ForecasterEditor from '../../components/admin/editors/ForecasterEditor.vue';

// Apply Admin Middleware
definePageMeta({
  middleware: 'admin'
});

// State
const collections = ref([]);
const loadingCollections = ref(false);
const errorCollections = ref(null);
const selectedCollection = ref(null);

const documents = ref([]);
const paginationInfo = ref({ currentPage: 1, totalPages: 1, totalDocuments: 0, limit: 20 });
const loadingDocuments = ref(false);
const errorDocuments = ref(null);
const queryOptions = reactive({
  filterKey: '',
  filterValue: '',
  sortField: 'updatedAt', // Default sort field
  sortDirection: 'desc' // Default sort direction
});

const selectedDocumentId = ref(null);
const loadingSelectedDocument = ref(false);
const errorSelectedDocument = ref(null);
const selectedDocumentData = ref(null);
const savingDocument = ref(false);
const saveError = ref(null);
const deletingDocument = ref(false);
const deleteError = ref(null);

// --- New State for Creation ---
const showCreator = ref(false);
const creatingDocument = ref(false);
const createError = ref(null);
const articleCreatorRef = ref(null);

// --- New State for Multiple Deletion ---
const deletingMultiple = ref(false);
const deleteMultipleError = ref(null);

// --- Route Handling ---
const route = useRoute();
const router = useRouter();

// Determine which editor component to use based on selectedCollection
const editorComponents = {
    Article: ArticleEditor,
    Scenario: ScenarioEditor,
    SourceDocument: SourceDocumentEditor,
    StoryIdeas: StoryIdeasEditor,
    User: GenericJsonEditor, // Default for User, or create UserEditor
    Forecaster: ForecasterEditor,
    // Add other collection-specific editors here
    // Default/fallback is handled in currentEditorComponent
};

// Determine which creator component to use
const creatorComponents = {
  Article: ArticleCreator,
  // Add other collection-specific creators here if needed
  // Forecaster: ForecasterCreator, // Example if we add one
};

// Determine which editor component to use based on selectedCollection
const currentEditorComponent = computed(() => {
  if (!selectedCollection.value) return null;
  return editorComponents[selectedCollection.value] || GenericJsonEditor;
});

// Determine which creator component to use
const currentCreatorComponent = computed(() => {
  if (!selectedCollection.value || !showCreator.value) return null;
  return creatorComponents[selectedCollection.value]; // Returns undefined if no specific creator, which is fine
});

// Common statuses for quick filtering
const commonStatuses = computed(() => ({
  Article: ['DRAFT', 'PENDING', 'PUBLISHED', 'ARCHIVED', 'REJECTED', 'ERROR'],
  SourceDocument: ['URL_ONLY', 'RAW_CONTENT_RETRIEVED', 'SCREENING', 'SCREENED-IN', 'SCREENED-OUT', 'PROCESSING', 'PROCESSED', 'EMBEDDED', 'DISCARDED', 'ERROR'],
  Scenario: ['OPEN', 'CLOSED', 'RESOLVING', 'RESOLVED', 'CANCELED']
}));

// Fetch Collections
const fetchCollections = async () => {
  loadingCollections.value = true;
  errorCollections.value = null;
  try {
    const data = await $fetch('/api/admin/collections');
    collections.value = data; // API returns array of model names
  } catch (err) {
    console.error("Error fetching collections:", err);
    errorCollections.value = err.data || { message: 'Failed to load collections.' };
  } finally {
    loadingCollections.value = false;
  }
};

// Fetch Documents for Selected Collection
const fetchDocuments = async (page = 1) => {
  if (!selectedCollection.value) return;
  loadingDocuments.value = true;
  errorDocuments.value = null;
  // Clear documents before fetching, especially if it's page 1 or filter changes
  if (page === 1) {
      documents.value = [];
  }
  // Don't clear editor selection here automatically unless intended
  // clearSelection();

  const filters = {};
  let wasStoryIdFilter = false; // Flag to check if storyId was the filter
  if (queryOptions.filterKey && queryOptions.filterValue !== '') { // Check for non-empty value
      const key = queryOptions.filterKey;
      let value = queryOptions.filterValue;
       // Basic type conversion attempt
       if (!isNaN(value) && value.trim() !== '') value = Number(value);
       else if (value.toLowerCase() === 'true') value = true;
       else if (value.toLowerCase() === 'false') value = false;
       filters[key] = value;
       if (key === 'storyId') {
           wasStoryIdFilter = true;
       }
  }

  // Prepare sort object
  const sort = {};
  if (queryOptions.sortField) {
      sort[queryOptions.sortField] = queryOptions.sortDirection === 'asc' ? 1 : -1;
  }

  try {
    const response = await $fetch(`/api/admin/query/${selectedCollection.value}`, {
      method: 'POST',
      body: {
        filters: filters,
        sort: sort, // Use dynamic sort object
        limit: paginationInfo.value.limit,
        page: page,
      }
    });
    documents.value = response.documents;
    paginationInfo.value = response.pagination;

    // If we filtered by storyId and got exactly one result, auto-select it.
    if (wasStoryIdFilter && response.documents.length === 1) {
        console.log("Auto-selecting document based on storyId filter:", response.documents[0]._id);
        selectDocument(response.documents[0]._id);
    }

  } catch (err) {
    console.error("Error fetching documents:", err);
    errorDocuments.value = err.data || { message: 'Failed to load documents.' };
     paginationInfo.value = { currentPage: 1, totalPages: 1, totalDocuments: 0, limit: 20 }; // Reset pagination on error
  } finally {
    loadingDocuments.value = false;
  }
};

// Fetch Single Document for Editing
const selectDocument = async (id) => {
  if (!selectedCollection.value || !id) return;
  selectedDocumentId.value = id;
  loadingSelectedDocument.value = true;
  errorSelectedDocument.value = null;
  selectedDocumentData.value = null; // Clear previous
  saveError.value = null;
  deleteError.value = null;

  try {
    const documentData = await $fetch(`/api/admin/document/${selectedCollection.value}/${id}`);
    selectedDocumentData.value = documentData;
  } catch (err) {
    console.error("Error fetching document for edit:", err);
    errorSelectedDocument.value = err.data || { message: 'Failed to load document.' };
    selectedDocumentId.value = null; // Clear ID if load failed
  } finally {
    loadingSelectedDocument.value = false;
  }
};

// Handle Save from Editor Components
const handleEditorSave = async (updatedDocument) => {
  if (!selectedCollection.value || !selectedDocumentId.value || !updatedDocument) return;
  savingDocument.value = true;
  saveError.value = null;
  
  try {
    const updatedDoc = await $fetch(`/api/admin/document/${selectedCollection.value}/${selectedDocumentId.value}`, {
      method: 'PUT',
      body: updatedDocument
    });
    selectedDocumentData.value = updatedDoc;
    
    // Refresh the main list to reflect potential changes (like status or title)
    await fetchDocuments(paginationInfo.value.currentPage);
  } catch (err) {
    console.error("Error saving document:", err);
    saveError.value = err.data?.message || 'Failed to save document.';
  } finally {
    savingDocument.value = false;
  }
};

// --- New Method: Handle Create from Creator ---
const handleCreatorSubmit = async (articleData) => {
  if (!selectedCollection.value || selectedCollection.value !== 'Article') return;

  // Set submitting state in child component
  articleCreatorRef.value?.setIsSubmitting(true);
  articleCreatorRef.value?.setCreationError(null);

  try {
    const newDoc = await $fetch(`/api/admin/document/${selectedCollection.value}`, {
      method: 'POST',
      body: articleData
    });
    alert('Article created successfully!');
    showCreator.value = false; // Hide creator form
    await fetchDocuments(1); // Refresh list on page 1
  } catch (err) {
    console.error("Error creating document:", err);
    const errorMessage = err.data?.message || 'Failed to create article.';
    // Set error message in child component
    articleCreatorRef.value?.setCreationError(errorMessage);
  } finally {
    // Reset submitting state in child component
    articleCreatorRef.value?.setIsSubmitting(false);
  }
};

// Delete Document
const confirmDeleteDocument = () => {
  if (!selectedCollection.value || !selectedDocumentId.value) return;
  if (window.confirm(`Are you sure you want to delete this ${selectedCollection.value} document (ID: ${selectedDocumentId.value})? This cannot be undone.`)) {
    deleteDocument();
  }
};

const deleteDocument = async () => {
  if (!selectedCollection.value || !selectedDocumentId.value) return;
  deletingDocument.value = true;
  deleteError.value = null;
  try {
    await $fetch(`/api/admin/document/${selectedCollection.value}/${selectedDocumentId.value}`, {
      method: 'DELETE'
    });
    alert('Document deleted successfully!');
    clearSelection();
    await fetchDocuments(1); // Use await, go back to page 1
  } catch (err) {
    console.error("Error deleting document:", err);
    deleteError.value = err.data?.message || 'Failed to delete document.';
  } finally {
    deletingDocument.value = false;
  }
};

// Handle collection change
const handleCollectionChange = () => {
  documents.value = [];
  paginationInfo.value = { currentPage: 1, totalPages: 1, totalDocuments: 0, limit: 20 };
  errorDocuments.value = null;
  queryOptions.filterKey = ''; // Reset filters on collection change
  queryOptions.filterValue = '';
  clearSelection();
  showCreator.value = false; // Hide creator on collection change
  if (selectedCollection.value) {
    fetchDocuments();
  }
};

// Clear editor selection
const clearSelection = () => {
  selectedDocumentId.value = null;
  selectedDocumentData.value = null;
  errorSelectedDocument.value = null;
  saveError.value = null;
  deleteError.value = null;
  showCreator.value = false; // Also hide creator when clearing selection
};

// --- New Methods for Enhanced UX ---
const quickFilterStatus = (status) => {
    queryOptions.filterKey = 'status';
    queryOptions.filterValue = status;
    fetchDocuments(1); // Fetch page 1 with new status filter
};

const clearStatusFilter = () => {
    if (queryOptions.filterKey === 'status') {
        queryOptions.filterKey = '';
        queryOptions.filterValue = '';
        fetchDocuments(1); // Fetch page 1 without status filter
    }
};

// --- Helper Functions ---
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString(); // Or toLocaleDateString etc.
  } catch (e) {
    return dateString;
  }
}

// --- New Method: Delete Listed Documents ---
const confirmDeleteListedDocuments = () => {
  if (selectedCollection.value !== 'StoryIdeas' || documents.value.length === 0 || deletingMultiple.value) return;

  const count = documents.value.length;
  if (window.confirm(`Are you sure you want to delete the ${count} listed ${selectedCollection.value} documents? This cannot be undone.`)) {
    deleteListedDocuments();
  }
};

const deleteListedDocuments = async () => {
  if (selectedCollection.value !== 'StoryIdeas' || documents.value.length === 0) return;

  deletingMultiple.value = true;
  deleteMultipleError.value = null;

  const idsToDelete = documents.value.map(doc => doc._id);

  try {
    const response = await $fetch(`/api/admin/documents/delete-multiple`, {
      method: 'POST',
      body: {
        collectionName: selectedCollection.value,
        documentIds: idsToDelete
      }
    });
    alert(`${response.deletedCount} documents deleted successfully!`);
    clearSelection(); // Clear any selected document in editor
    await fetchDocuments(1); // Refresh list, go back to page 1
  } catch (err) {
    console.error("Error deleting multiple documents:", err);
    deleteMultipleError.value = err.data?.message || 'Failed to delete documents.';
    alert(`Error: ${deleteMultipleError.value}`); // Show error to user
  } finally {
    deletingMultiple.value = false;
  }
};

// Function to apply filters from route query
const applyRouteFilters = () => {
  console.log("Checking route query:", route.query);
  if (route.query.storyId) {
    console.log("Found storyId in query:", route.query.storyId);
    selectedCollection.value = 'Article'; // Switch to Article collection
    queryOptions.filterKey = 'storyId';
    queryOptions.filterValue = route.query.storyId;
    fetchDocuments(1); // Fetch immediately
  } else if (route.query.collection) { // Optional: allow direct collection selection via query
     if (collections.value.includes(route.query.collection)) {
         selectedCollection.value = route.query.collection;
         queryOptions.filterKey = route.query.filterKey || '';
         queryOptions.filterValue = route.query.filterValue || '';
         fetchDocuments(1);
     } else {
        console.warn(`Collection '${route.query.collection}' from query not found.`);
     }
  }
};

// Initial Load
onMounted(() => {
  fetchCollections();

  // Watch the route query for changes (e.g., back/forward navigation)
  watch(() => route.query, (newQuery, oldQuery) => {
     console.log('Route query changed:', newQuery);
     // Avoid re-applying if only the query param *we set* is removed
     if (newQuery.storyId !== oldQuery.storyId || 
         newQuery.collection !== oldQuery.collection || 
         newQuery.filterKey !== oldQuery.filterKey || 
         newQuery.filterValue !== oldQuery.filterValue) {
        // Re-apply filters if relevant query params change
        // Need collections loaded before applying route filters that select a collection
        if(collections.value.length > 0) {
            applyRouteFilters();
        } // else: applyRouteFilters will be called in fetchCollections's .then()
     }
  }, { deep: true }); // deep watch might be needed if query values are objects

  // Initial check of route query after collections are loaded
  watch(collections, (newCollections) => {
      if (newCollections.length > 0) {
          // Only apply if no collection is currently selected OR
          // if the route specifies a different collection than the one selected.
          // This prevents overwriting user selection if they navigate away and back without query params.
          if (!selectedCollection.value || (route.query.collection && route.query.collection !== selectedCollection.value) || route.query.storyId) {
              applyRouteFilters();
          }
      }
  });
});

</script>

<style scoped>
/* Add styles for better layout if needed */
.max-h-\[60vh\] { /* Example for scrollable list */
  max-height: 60vh;
}
</style> 