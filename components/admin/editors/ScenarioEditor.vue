<template>
  <div class="scenario-editor">
    <h3 class="text-lg font-medium mb-4 text-gray-700 dark:text-gray-300 border-b pb-2 dark:border-gray-700">
      Editing Scenario: <code class="text-sm bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded">{{ document._id }}</code>
    </h3>

    <div class="grid grid-cols-1  gap-x-6 gap-y-4">

      <!-- Column 1: Core Info & Current State -->
      <section class="space-y-4">
        <h4 class="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200 border-b pb-1 dark:border-gray-600">Core Info</h4>
        <!-- Question -->
        <div>
          <label for="question" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Question</label>
          <textarea
            id="question"
            v-model="editableDoc.question"
            rows="2"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            :class="{ 'border-red-300 dark:border-red-700': validationErrors.question }"
          ></textarea>
          <p v-if="validationErrors.question" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.question }}</p>
        </div>

        <!-- Question New -->
        <div>
          <label for="questionNew" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Question New (Optional)</label>
          <textarea
            id="questionNew"
            v-model="editableDoc.questionNew"
            rows="2"
            placeholder="Enter the revised or alternative question here..."
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          ></textarea>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Optional field for a modified version of the main question.</p>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Description</label>
          <MarkdownEditor v-model="editableDoc.description" />
        </div>

        <!-- Text for Embedding (Read Only) -->
        <div>
          <label for="textForEmbedding" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Text for Embedding</label>
          <textarea
            id="textForEmbedding"
            v-model="editableDoc.textForEmbedding"
            rows="4"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 opacity-75 cursor-not-allowed"
            readonly
            placeholder="Text content used for generating vector embeddings..."
          ></textarea>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">This field is generated and used for AI embeddings. It's read-only.</p>
        </div>

        <!-- Platform Info -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="platform" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Platform</label>
            <input
              id="platform"
              v-model="editableDoc.platform"
              placeholder="Metaculus, Polymarket, etc."
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label for="platformScenarioId" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Platform Scenario ID</label>
            <input
              id="platformScenarioId"
              v-model="editableDoc.platformScenarioId"
              placeholder="External ID"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
        
        <!-- URLs -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="url" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Source URL</label>
            <input
              id="url"
              type="url"
              v-model="editableDoc.url"
              placeholder="https://platform.com/..."
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label for="apiUrl" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">API URL</label>
            <input
              id="apiUrl"
              type="url"
              v-model="editableDoc.apiUrl"
              placeholder="https://api.platform.com/..."
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <!-- Embed URL -->
        <div>
          <label for="embedUrl" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Embed URL/Code</label>
          <textarea
            id="embedUrl"
            v-model="editableDoc.embedUrl"
            rows="2"
            placeholder="<iframe>... or https://embed..."
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white font-mono text-xs"
          ></textarea>
          <!-- Embed Preview -->
          <div v-if="editableDoc.embedUrl" class="mt-2">
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Embed Preview</label>
            <div class="border-s-4 ps-4">
              <div v-if="editableDoc.embedUrl" class="" v-html="editableDoc.embedUrl"></div>
            </div>
          </div>
        </div>

        <!-- Open Date -->
        <div>
          <label for="openDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Open Date</label>
          <input
            id="openDate"
            type="datetime-local"
            v-model="openDateFormatted"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        <!-- Tags -->
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Tags</label>
          <!-- <InputTags v-model="editableDoc.tags" placeholder="Add tags..." /> -->
          <!-- Use a dedicated tag component if available, otherwise basic input -->
          <input 
            v-model="tagsString" 
            placeholder="Comma-separated tags (e.g., tech, ai, politics)" 
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white" 
          />
        </div>

        <!-- Current State -->
        <h4 class="text-md font-semibold pt-3 mb-2 text-gray-800 dark:text-gray-200 border-b pb-1 dark:border-gray-600">Current State</h4>

        <!-- Status -->
        <div>
          <label for="status" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Status</label>
          <select
            id="status"
            v-model="editableDoc.status"
            class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
            <option value="RESOLVING">Resolving</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>

        <!-- Scenario Type & Value -->
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="scenarioType" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Scenario Type</label>
            <select
              id="scenarioType"
              v-model="editableDoc.scenarioType"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              :class="{ 'border-red-300 dark:border-red-700': validationErrors.scenarioType }"
              @change="handleTypeChange"
            >
              <option value="BINARY">Binary (Yes/No)</option>
              <option value="CATEGORICAL">Categorical</option>
              <option value="NUMERIC">Numeric</option>
              <option value="DATE">Date</option>
            </select>
            <p v-if="validationErrors.scenarioType" class="mt-1 text-sm text-red-600 dark:text-red-400">{{ validationErrors.scenarioType }}</p>
          </div>

          <!-- Conditional Value Input -->
          <div v-if="editableDoc.scenarioType === 'BINARY'">
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Current Probability (0-1)
            </label>
            <input
              type="number"
              v-model.number="editableDoc.currentProbability"
              min="0"
              max="1"
              step="0.01"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <div class="mt-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                class="bg-blue-600 h-2.5 rounded-full"
                :style="{ width: `${Math.min(Math.max(editableDoc.currentProbability || 0, 0), 1) * 100}%` }"
              ></div>
            </div>
          </div>
          <div v-else-if="editableDoc.scenarioType === 'NUMERIC'">
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Current Value</label>
            <input
              type="number"
              v-model.number="editableDoc.currentValue"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div v-else-if="editableDoc.scenarioType === 'DATE'">
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Current Date Value</label>
            <input
              type="date"
              v-model="dateValueFormatted"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <!-- CATEGORICAL handled below -->
        </div>


        <!-- For Categorical Scenarios Options -->
        <div v-if="editableDoc.scenarioType === 'CATEGORICAL'" class="mt-2 border-t pt-3 dark:border-gray-700">
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Options & Probabilities
            </label>
            <button
              @click="addCategoricalOption"
              type="button"
              class="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
            >
              + Add Option
            </button>
          </div>

          <div
            v-for="(option, index) in editableDoc.options"
            :key="index"
            class="mb-2 grid grid-cols-7 gap-2 items-center"
          >
            <div class="col-span-4">
              <input
                v-model="option.name"
                placeholder="Option name"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div class="col-span-2">
              <input
                type="number"
                v-model.number="option.probability"
                min="0"
                max="1"
                step="0.01"
                placeholder="Prob (0-1)"
                class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white text-sm"
              />
            </div>
            <div class="col-span-1">
              <button
                @click="removeCategoricalOption(index)"
                type="button"
                class="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 text-sm w-full"
                title="Remove option"
              >✕</button>
            </div>
          </div>
          <p v-if="editableDoc.options && editableDoc.options.length > 0" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Sum of probabilities: {{ (editableDoc.options.reduce((sum, o) => sum + (o.probability || 0), 0)).toFixed(2) }}
          </p>
        </div>

      </section>

      <!-- Column 2: Resolution, Scenario Data, History -->
      <section class="space-y-4">
        <!-- Resolution Data -->
        <h4 class="text-md font-semibold mb-2 text-gray-800 dark:text-gray-200 border-b pb-1 dark:border-gray-600">Resolution Details</h4>

        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Resolution Criteria</label>
          <MarkdownEditor v-model="editableDoc.resolutionData.resolutionCriteria" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="resolutionSource" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Resolution Source</label>
            <input
              id="resolutionSource"
              v-model="editableDoc.resolutionData.resolutionSource"
              placeholder="e.g., Official Website"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label for="resolutionSourceUrl" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Resolution Source URL</label>
            <input
              id="resolutionSourceUrl"
              type="url"
              v-model="editableDoc.resolutionData.resolutionSourceUrl"
              placeholder="https://source.com/..."
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="expectedResolutionDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Expected Resolution Date</label>
            <input
              id="expectedResolutionDate"
              type="datetime-local"
              v-model="expectedResolutionDateFormatted"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label for="resolutionDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Actual Resolution Date</label>
            <input
              id="resolutionDate"
              type="datetime-local"
              v-model="resolutionDateFormatted"
              :disabled="editableDoc.status !== 'RESOLVED'"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-50"
            />
          </div>
          <div>
            <label for="resolutionCloseDate" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Market Close Date</label>
            <input
              id="resolutionCloseDate"
              type="datetime-local"
              v-model="resolutionCloseDateFormatted"
              :disabled="editableDoc.status === 'OPEN'"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-50"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              Resolution Value
            </label>
            <!-- Adjust input based on scenario type for resolution value -->
            <input v-if="editableDoc.scenarioType === 'BINARY' || editableDoc.scenarioType === 'CATEGORICAL'"
              type="text"
              v-model="editableDoc.resolutionData.resolutionValue"
              :disabled="editableDoc.status !== 'RESOLVED'"
              placeholder="e.g., Yes, No, Option Name"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-50"
            />
            <input v-else-if="editableDoc.scenarioType === 'NUMERIC'"
              type="number"
              v-model.number="editableDoc.resolutionData.resolutionValue"
              :disabled="editableDoc.status !== 'RESOLVED'"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-50"
            />
            <input v-else-if="editableDoc.scenarioType === 'DATE'"
              type="date"
              v-model="resolutionValueDateFormatted"
              :disabled="editableDoc.status !== 'RESOLVED'"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white disabled:opacity-50"
            />
            <p v-else class="text-sm text-gray-500 dark:text-gray-400 italic">(Set scenario type first)</p>
          </div>
        </div>

        <!-- Scenario Data -->
        <h4 class="text-md font-semibold pt-3 mb-2 text-gray-800 dark:text-gray-200 border-b pb-1 dark:border-gray-600">Platform Data</h4>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="volume" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Volume</label>
            <input
              id="volume"
              type="number"
              v-model.number="editableDoc.scenarioData.volume"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label for="liquidity" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Liquidity</label>
            <input
              id="liquidity"
              type="number"
              v-model.number="editableDoc.scenarioData.liquidity"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label for="commentCount" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Comment Count</label>
            <input
              id="commentCount"
              type="number"
              v-model.number="editableDoc.scenarioData.commentCount"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label for="numberOfTraders" class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Number of Traders</label>
            <input
              id="numberOfTraders"
              type="number"
              v-model.number="editableDoc.scenarioData.numberOfTraders"
              class="w-full px-3 py-2 border rounded shadow-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
          <!-- Consider a JSON viewer/editor for scenarioData.dossier or other complex fields -->
        </div>
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Rationale Summary</label>
          <MarkdownEditor v-model="editableDoc.scenarioData.rationaleSummary" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Rationale Details</label>
          <MarkdownEditor v-model="editableDoc.scenarioData.rationaleDetails" />
        </div>

        <!-- History View (Read Only) -->
        <h4 class="text-md font-semibold pt-3 mb-2 text-gray-800 dark:text-gray-200 border-b pb-1 dark:border-gray-600">History</h4>
        <div class="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 text-xs">
          <template v-if="hasHistory">
            <div v-if="editableDoc.probabilityHistory && editableDoc.probabilityHistory.length">
              <h5 class="font-semibold text-xs mb-1">Probability History:</h5>
              <ul>
                <li v-for="(item, i) in editableDoc.probabilityHistory.slice().reverse()" :key="'prob-' + i">
                  {{ formatDate(item.timestamp) }}: {{ (item.value * 100).toFixed(1) }}%
                </li>
              </ul>
            </div>
            <div v-if="editableDoc.valueHistory && editableDoc.valueHistory.length" class="mt-2">
              <h5 class="font-semibold text-xs mb-1">Value History:</h5>
              <ul>
                <li v-for="(item, i) in editableDoc.valueHistory.slice().reverse()" :key="'val-' + i">
                  {{ formatDate(item.timestamp) }}: {{ formatHistoryValue(item.value) }}
                </li>
              </ul>
            </div>
          </template>
          <p v-else class="text-gray-500 dark:text-gray-400 italic">No history recorded.</p>
        </div>
      </section>

    </div> <!-- End main grid -->

    <!-- Relationships (Keep minimal in this editor, maybe just display count or IDs) -->
    <div class="mt-6 border-t pt-4 dark:border-gray-700">
      <h4 class="text-md font-medium mb-3 text-gray-700 dark:text-gray-300">Relationships</h4>
      <div class="text-sm space-y-1">
        <p>Related Articles: <span class="font-mono text-xs">{{ editableDoc.relatedArticleIds?.join(', ') || 'None' }}</span></p>
        <p>Related Scenarios: <span class="font-mono text-xs">{{ editableDoc.relatedScenarioIds?.join(', ') || 'None' }}</span></p>
        <!-- Add buttons/modals here later for managing relationships if needed -->
      </div>
    </div>


    <!-- Action Buttons -->
    <div class="mt-6 pt-4 border-t dark:border-gray-700 flex justify-end space-x-3">
      <button
        @click="viewRawJson"
        type="button"
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        View Raw JSON
      </button>
      <button
        @click="cancelEdit"
        type="button"
        class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Cancel
      </button>
      <button
        @click="handleSave"
        type="button"
        :disabled="!isChanged || saving"
        class="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        {{ saving ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>

    <!-- Validation Errors Summary -->
    <div v-if="Object.keys(validationErrors).length > 0" class="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600 rounded">
      <p class="text-sm font-medium text-red-700 dark:text-red-300">Please correct the following errors:</p>
      <ul class="list-disc list-inside text-sm text-red-600 dark:text-red-400 mt-1">
        <li v-for="(error, key) in validationErrors" :key="key">{{ error }}</li>
      </ul>
    </div>
    <div v-if="saveError" class="mt-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
      Save error: {{ saveError }}
    </div>

    <!-- JSON Viewer Modal -->
    <JsonViewerModal
      v-model="showJsonModal"
      :json-data="editableDoc"
      :title="`Raw JSON - ${document._id}`"
    />

  </div>
</template>

<script setup>
import { ref, reactive, watch, computed, watchEffect } from 'vue';
import MarkdownEditor from '../MarkdownEditor.vue';
import JsonViewerModal from '../JsonViewerModal.vue'; // Import the modal
// import InputTags from '../../common/InputTags.vue'; // Assuming you have this
import { formatDateForInput, parseDateFromInput, formatDate } from '~/utils/dateUtils';
import _ from 'lodash'; // For deep comparison and cloning

const props = defineProps({
  document: {
    type: Object,
    required: true,
  },
  collectionName: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['save', 'cancel']);

const editableDoc = ref(null);
const initialDoc = ref(null); // Store initial state for change detection
const validationErrors = reactive({});
const saving = ref(false);
const saveError = ref(null);

// State for JSON Viewer Modal
const showJsonModal = ref(false);

const clearValidation = () => {
  for (const key in validationErrors) {
    delete validationErrors[key];
  }
   saveError.value = null;
};

// Deep clone and initialize the editable document
watchEffect(() => {
  // Ensure nested objects exist with defaults before cloning
  const docWithDefaults = _.merge(
    { // Default structure
      question: '',
      description: '',
      textForEmbedding: '', // Add default for textForEmbedding
      platform: '',
      platformScenarioId: '',
      tags: [],
      openDate: null,
      scenarioType: 'BINARY',
      status: 'OPEN',
      currentProbability: null,
      currentValue: null,
      options: [],
      url: '',
      apiUrl: '',
      embedUrl: '',
      probabilityHistory: [],
      valueHistory: [],
      scenarioData: {
        comments: [],
        commentCount: null,
        volume: null,
        liquidity: null,
        numberOfTraders: null,
        rationaleSummary: "",
        rationaleDetails: "",
        dossier: {},
      },
      resolutionData: {
        resolutionCriteria: '',
        resolutionSource: '',
        resolutionSourceUrl: '',
        expectedResolutionDate: null,
        resolutionDate: null,
        resolutionCloseDate: null,
        resolutionValue: null,
      },
      relatedArticleIds: [],
      relatedScenarioIds: [],
      // scrapedDate: null, // Handled by server/DB
      // aiVectorEmbedding: null, // Handled by server/DB
    },
    props.document // Merge with incoming document
  );

  // Ensure options is always an array for CATEGORICAL
  if (docWithDefaults.scenarioType === 'CATEGORICAL' && !Array.isArray(docWithDefaults.options)) {
     docWithDefaults.options = [];
  } else if (docWithDefaults.scenarioType !== 'CATEGORICAL') {
     docWithDefaults.options = null; // Clear options for non-categorical
  }

  // Ensure history arrays exist
  if (!Array.isArray(docWithDefaults.probabilityHistory)) docWithDefaults.probabilityHistory = [];
  if (!Array.isArray(docWithDefaults.valueHistory)) docWithDefaults.valueHistory = [];


  editableDoc.value = _.cloneDeep(docWithDefaults);
  initialDoc.value = _.cloneDeep(docWithDefaults);
  clearValidation(); // Clear errors on document change
});


const isChanged = computed(() => {
  if (!editableDoc.value || !initialDoc.value) return false;
  // Use lodash deep comparison
  return !_.isEqual(editableDoc.value, initialDoc.value);
});

// --- Date Formatting Computed Properties ---
const openDateFormatted = computed({
  get: () => formatDateForInput(editableDoc.value?.openDate),
  set: (value) => { if (editableDoc.value) editableDoc.value.openDate = parseDateFromInput(value); }
});

const expectedResolutionDateFormatted = computed({
  get: () => formatDateForInput(editableDoc.value?.resolutionData?.expectedResolutionDate),
  set: (value) => { if (editableDoc.value?.resolutionData) editableDoc.value.resolutionData.expectedResolutionDate = parseDateFromInput(value); }
});

const resolutionDateFormatted = computed({
  get: () => formatDateForInput(editableDoc.value?.resolutionData?.resolutionDate),
  set: (value) => { if (editableDoc.value?.resolutionData) editableDoc.value.resolutionData.resolutionDate = parseDateFromInput(value); }
});

const resolutionCloseDateFormatted = computed({
  get: () => formatDateForInput(editableDoc.value?.resolutionData?.resolutionCloseDate),
  set: (value) => { if (editableDoc.value?.resolutionData) editableDoc.value.resolutionData.resolutionCloseDate = parseDateFromInput(value); }
});

const dateValueFormatted = computed({
  get: () => {
     // For DATE type, currentValue should be ISO string like 'YYYY-MM-DD'
     if (editableDoc.value?.scenarioType === 'DATE' && editableDoc.value?.currentValue) {
         try {
             // Assuming currentValue is stored like 'YYYY-MM-DD' or a Date object convertible to it
             return new Date(editableDoc.value.currentValue).toISOString().split('T')[0];
         } catch (e) { return ''; }
     }
     return '';
  },
  set: (value) => {
     if (editableDoc.value?.scenarioType === 'DATE') {
         editableDoc.value.currentValue = value; // Store as 'YYYY-MM-DD'
     }
  }
});

const resolutionValueDateFormatted = computed({
   get: () => {
     if (editableDoc.value?.scenarioType === 'DATE' && editableDoc.value?.resolutionData?.resolutionValue) {
         try {
             return new Date(editableDoc.value.resolutionData.resolutionValue).toISOString().split('T')[0];
         } catch (e) { return ''; }
     }
     return '';
  },
  set: (value) => {
     if (editableDoc.value?.scenarioType === 'DATE' && editableDoc.value?.resolutionData) {
         editableDoc.value.resolutionData.resolutionValue = value;
     }
  }
});

// --- Validation ---
const validate = () => {
  clearValidation();
  let isValid = true;
  if (!editableDoc.value.question?.trim()) {
    validationErrors.question = 'Question is required.';
    isValid = false;
  }
  if (!editableDoc.value.scenarioType) {
    validationErrors.scenarioType = 'Scenario Type is required.';
    isValid = false;
  }
   // Add more specific validations as needed (e.g., probability ranges, date formats)
   if (editableDoc.value.scenarioType === 'BINARY' && (editableDoc.value.currentProbability < 0 || editableDoc.value.currentProbability > 1)) {
      validationErrors.currentProbability = 'Probability must be between 0 and 1.';
      isValid = false;
   }
   if (editableDoc.value.scenarioType === 'CATEGORICAL') {
       if (!editableDoc.value.options || editableDoc.value.options.length === 0) {
          validationErrors.options = 'At least one option is required for Categorical type.';
          isValid = false;
       } else {
           const probSum = editableDoc.value.options.reduce((sum, o) => sum + (o.probability || 0), 0);
           // Allow for slight floating point inaccuracies
           if (Math.abs(probSum - 1) > 0.01 && probSum > 0) { // Only warn if sum > 0
             // validationErrors.optionsProbabilitySum = `Sum of probabilities (${probSum.toFixed(2)}) should ideally be 1.`;
             // Decide if this is a blocking error or just a warning
           }
           editableDoc.value.options.forEach((opt, index) => {
              if (!opt.name?.trim()) {
                 validationErrors[`option_${index}_name`] = `Option ${index + 1} name is required.`;
                 isValid = false;
              }
              if (opt.probability < 0 || opt.probability > 1) {
                 validationErrors[`option_${index}_prob`] = `Option ${index + 1} probability must be between 0 and 1.`;
                 isValid = false;
              }
           });
       }
   }
   if (editableDoc.value.status === 'RESOLVED' && editableDoc.value.resolutionData?.resolutionValue == null) { // Use == to check for null or undefined
      validationErrors.resolutionValue = 'Resolution Value is required when status is RESOLVED.';
      isValid = false;
   }
    if (editableDoc.value.status === 'RESOLVED' && !editableDoc.value.resolutionData?.resolutionDate) {
      validationErrors.resolutionDate = 'Resolution Date is required when status is RESOLVED.';
      isValid = false;
   }


  return isValid;
};



// --- Event Handlers ---
const handleSave = async () => {
  clearValidation();
  if (!validate()) {
    return;
  }
  saving.value = true;
  try {
    // Clean up data before sending? e.g., remove null/empty strings if needed by backend
    const payload = _.cloneDeep(editableDoc.value);

    // Ensure options is null for non-categorical types before saving
    if (payload.scenarioType !== 'CATEGORICAL') {
       payload.options = null;
    }
    // Ensure specific value fields are null if type doesn't match
    if (payload.scenarioType !== 'BINARY') payload.currentProbability = null;
    if (payload.scenarioType !== 'NUMERIC' && payload.scenarioType !== 'DATE') payload.currentValue = null;

     // Trim strings?
     if (payload.question) payload.question = payload.question.trim();
     // ... other fields

    emit('save', payload);
    // Wait for parent to confirm success? Or assume success for now.
    // If parent handles saving state, maybe remove saving.value = false here
  } catch (error) {
     console.error("Error preparing save:", error);
     saveError.value = "An unexpected error occurred preparing the data.";
  } finally {
    // Parent component should set saving state false on completion/error
    // saving.value = false;
  }
};

const cancelEdit = () => {
  emit('cancel');
};

const addCategoricalOption = () => {
  if (!editableDoc.value.options) {
     editableDoc.value.options = [];
  }
  editableDoc.value.options.push({ name: '', probability: null });
};

const removeCategoricalOption = (index) => {
  if (editableDoc.value.options) {
     editableDoc.value.options.splice(index, 1);
  }
};

// Reset specific values when type changes
const handleTypeChange = () => {
   if (!editableDoc.value) return;
    // Reset fields that are not relevant for the new type
   if (editableDoc.value.scenarioType !== 'BINARY') {
       editableDoc.value.currentProbability = null;
   }
   if (editableDoc.value.scenarioType !== 'NUMERIC' && editableDoc.value.scenarioType !== 'DATE') {
       editableDoc.value.currentValue = null;
   }
   if (editableDoc.value.scenarioType !== 'CATEGORICAL') {
       editableDoc.value.options = null;
   } else if (!editableDoc.value.options) {
       editableDoc.value.options = []; // Ensure options array exists for categorical
   }
   // Consider resetting resolutionValue if types are incompatible
   // Example: If switching from NUMERIC to BINARY, reset resolutionData.resolutionValue
   // This might need more complex logic based on previous type
   // editableDoc.value.resolutionData.resolutionValue = null;
};

// --- History Display ---
const hasHistory = computed(() => {
    return (editableDoc.value?.probabilityHistory?.length > 0 || editableDoc.value?.valueHistory?.length > 0);
});

const formatHistoryValue = (value) => {
   if (typeof value === 'number') return value.toFixed(3); // Adjust precision as needed
   if (typeof value === 'string') {
       // Attempt to format if it looks like a date
       const date = new Date(value);
       if (!isNaN(date)) return formatDate(date); // Use existing formatDate utility
       return value; // Otherwise return string as is
   }
   return JSON.stringify(value); // Fallback for other types
}

// --- Tags Handling (Using basic input) ---
const tagsString = computed({
  get: () => editableDoc.value?.tags?.join(', ') || '',
  set: (value) => {
    if (editableDoc.value) {
      // Split by comma, trim whitespace, remove empty tags
      editableDoc.value.tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
    }
  }
});

// Function to show the modal
const viewRawJson = () => {
  showJsonModal.value = true;
};

</script>

<style scoped>
/* Add component-specific styles if needed */
.disabled:opacity-50 {
   cursor: not-allowed;
}
</style> 