<template>
  <div class="container mx-auto px-4 py-8 max-w-3xl">
    <!-- Back Button -->
    <div class="mb-4 sm:mb-6">
      <button
        @click="goBack"
        class="text-fg-muted hover:text-primary transition-colors duration-100 flex items-center gap-x-1 cursor-pointer text-sm"
      >
        <Icon name="heroicons:arrow-left-20-solid" class="w-5 h-5" />
        Back
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="text-center py-12">
      <Icon name="line-md:loading-twotone-loop" class="w-10 h-10 text-fg-muted animate-spin inline-block" />
      <p class="mt-3 text-fg-muted text-lg">Loading forecaster profile...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-16 bg-article p-8 rounded-lg shadow-sm">
      <Icon name="heroicons:exclamation-triangle-20-solid" class="w-12 h-12 text-red-500 inline-block mb-4" />
      <p class="text-red-600 text-xl mb-2">Error loading forecaster</p>
      <p class="text-fg-muted mb-6">{{ error.data?.message || error.message || 'Could not retrieve forecaster details.' }}</p>
      <button
        @click="goBack"
        class="inline-block bg-primary text-white px-5 py-2.5 rounded-md hover:opacity-90 font-medium transition-opacity"
      >
        Back
      </button>
    </div>

    <!-- Forecaster Profile Content -->
    <div v-else-if="forecaster" class="flex flex-col md:flex-row gap-6">
      <!-- Left Column: Forecaster Summary Card -->
      <div class="md:w-1/3">
        <div class="bg-article p-6 rounded-lg shadow-sm text-center">
          <!-- Avatar -->
          <div class="w-24 h-24 bg-accent-bg rounded-full mx-auto flex items-center justify-center mb-4">
            <Icon v-if="forecaster.avatar" :name="forecaster.avatar" class="w-16 h-16 text-primary" />
            <Icon v-else name="heroicons:user-circle-20-solid" class="w-16 h-16 text-fg-muted" />
          </div>
          
          <!-- Forecaster Name -->
          <h1 class="text-lg font-bold text-fg mb-1">{{ forecaster.name }}</h1>
          
          <!-- Type Badge -->
          <div class="mt-4 mb-2">
            <span 
              :class="[
                'inline-flex items-center px-2 py-1 rounded-full text-sm font-medium border',
                forecaster.type === 'AI' 
                  ? 'border-primary-300 text-primary-700 bg-primary-50' 
                  : 'border-primary-300 text-primary-700 bg-primary-50'
              ]"
            >
              <Icon :name="forecaster.type === 'AI' ? 'mage:robot' : 'mdi:account-outline'" class="w-5 h-5 mr-1" />
              {{ forecaster.type }} Forecaster
            </span>
          </div>

          <!-- Status Badge -->
           <!-- <div class="mb-3">
            <span 
              :class="[
                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
                statusClass(forecaster.status)
              ]"
            >
              {{ forecaster.status }}
            </span>
          </div> -->
          
          <p v-if="forecaster.createdAt" class="text-xs text-fg-muted mt-3">Joined {{ formattedJoinDate }}</p>
          <p v-if="forecaster.updatedAt && forecaster.createdAt !== forecaster.updatedAt" class="text-xs text-fg-muted mt-1">Last updated: {{ formattedRelativeTime(forecaster.updatedAt) }}</p>
        </div>
        <div v-if="forecaster.type === 'HUMAN' && forecaster.userId" class="bg-article p-4 rounded-lg shadow-sm text-sm mt-4">
            <p class="text-fg-muted"><strong class="font-medium text-fg">User ID:</strong> {{ forecaster.userId }}</p>
            <!-- Potential NuxtLink to a user profile page if one exists -->
            <!-- <NuxtLink :to="`/users/${forecaster.userId}`" class="text-primary hover:underline">View User Profile</NuxtLink> -->
        </div>
      </div>

      <!-- Right Column: Details & Activity -->
      <div class="md:w-2/3 space-y-6">
        <!-- Description Section -->
        <section v-if="forecaster.description" class="bg-article p-6 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold mb-3 text-fg border-b border-bg-muted pb-2 flex items-center">
             <Icon name="heroicons:information-circle-20-solid" class="w-5 h-5 mr-2 text-fg-muted" />
            About {{ forecaster.name }}
          </h2>
          <p class="text-fg-muted leading-relaxed">{{ forecaster.description }}</p>
        </section>

        <!-- AI Forecaster Specific Info -->
        <section v-if="forecaster.type === 'AI'" class="bg-article p-6 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold mb-3 text-fg border-b border-bg-muted pb-2 flex items-center">
            <Icon name="mdi:brain" class="w-5 h-5 mr-2 text-fg-muted" />
            AI Agent Details
          </h2>
          <div class="space-y-3 text-sm">
            <div v-if="forecaster.modelDetails?.family" class="flex">
              <span class="font-medium text-fg-muted w-36 flex-shrink-0">Model Family:</span>
              <span class="text-fg">{{ forecaster.modelDetails.family }}</span>
            </div>
            <div v-if="forecaster.modelDetails?.version" class="flex">
              <span class="font-medium text-fg-muted w-36 flex-shrink-0">Model Version:</span>
              <span class="text-fg">{{ forecaster.modelDetails.version }}</span>
            </div>
            <div v-if="forecaster.modelDetails?.toolNotes" class="flex">
              <span class="font-medium text-fg-muted w-36 flex-shrink-0">Tool Notes:</span>
              <span class="text-fg whitespace-pre-wrap">{{ forecaster.modelDetails.toolNotes }}</span>
            </div>
            <p v-if="!forecaster.modelDetails?.family && !forecaster.modelDetails?.version && !forecaster.modelDetails?.toolNotes" class="text-fg-muted italic font-mono text-xs">
              No model details available.
            </p>
          </div>
        </section>
        
        <!-- Forecasting Activity Section -->
        <section class="bg-article p-6 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold mb-3 text-fg border-b border-bg-muted pb-2 flex items-center">
            <Icon name="heroicons:chart-bar-square-20-solid" class="w-5 h-5 mr-2 text-fg-muted" />
            Performance Metrics
          </h2>
          <div class="space-y-3 text-sm">
            <div v-if="forecaster.numberOfForecasts !== undefined && forecaster.numberOfForecasts !== null" class="flex">
              <span class="font-medium text-fg-muted w-36 flex-shrink-0">Number of Forecasts:</span>
              <span class="text-fg font-semibold">{{ forecaster.numberOfForecasts }}</span>
            </div>
            <div v-if="forecaster.lastForecastDate" class="flex">
              <span class="font-medium text-fg-muted w-36 flex-shrink-0">Last Forecast Date:</span>
              <span class="text-fg">{{ formattedFullDate(forecaster.lastForecastDate) }} ({{ formattedRelativeTime(forecaster.lastForecastDate) }})</span>
            </div>
            <div v-if="forecaster.accuracyScore !== undefined && forecaster.accuracyScore !== null" class="flex">
              <span class="font-medium text-fg-muted w-36 flex-shrink-0">Accuracy Score:</span>
              <span class="text-fg font-semibold">{{ (forecaster.accuracyScore * 100).toFixed(1) }}%</span>
            </div>
            <div v-if="forecaster.calibrationScore !== undefined && forecaster.calibrationScore !== null" class="flex">
              <span class="font-medium text-fg-muted w-36 flex-shrink-0">Calibration Score:</span>
              <span class="text-fg font-semibold">{{ forecaster.calibrationScore.toFixed(3) }}</span>
            </div>
            
            <div v-if="(forecaster.accuracyScore === undefined || forecaster.accuracyScore === null) && 
                       (forecaster.calibrationScore === undefined || forecaster.calibrationScore === null) &&
                       (forecaster.numberOfForecasts === undefined || forecaster.numberOfForecasts === null)">
              <p class="text-fg-muted italic font-mono text-xs">
                No data available yet.
              </p>
            </div>
          </div>
        </section>

        <!-- ADDED: Forecast History Section -->
        <section class="bg-article p-6 rounded-lg shadow-sm">
          <h2 class="text-xl font-semibold mb-4 text-fg border-b border-bg-muted pb-2 flex items-center">
            <Icon name="heroicons:clock-20-solid" class="w-5 h-5 mr-2 text-fg-muted" />
            Recent Forecasts
          </h2>
          <div v-if="historyPending" class="text-center py-6">
            <Icon name="line-md:loading-twotone-loop" class="w-7 h-7 text-fg-muted animate-spin" />
          </div>
          <div v-else-if="historyError" class="text-red-500 text-sm">
            <p>Could not load forecast history: {{ historyError?.data?.message || historyError?.message || 'An unknown error occurred while fetching history.' }}</p>
          </div>
          <div v-else-if="forecastHistory && forecastHistory.length > 0">
            <ul class="space-y-4">
              <li v-for="forecast in forecastHistory" :key="`${forecast.scenarioId}-${forecast.timestamp}-${forecast.type}-${forecast.optionName || ''}`" class="pb-4 border-b border-bg-muted last:border-b-0 last:pb-0">
                <NuxtLink :to="`/scenarios/${forecast.scenarioId}`" class="hover:no-underline group">
                  <h3 class="text-base font-medium text-fg group-hover:text-primary transition-colors mb-1">{{ forecast.scenarioQuestion }}</h3>
                </NuxtLink>
                <div class="text-sm text-fg-muted mb-1">
                  <span class="font-medium text-primary">
                    <template v-if="forecast.type === 'PROBABILITY'">{{ (forecast.probability * 100).toFixed(0) }}%</template>
                    <template v-else-if="forecast.type === 'VALUE'">{{ forecast.value }}</template>
                    <template v-else-if="forecast.type === 'OPTION'">{{ forecast.optionName }}: {{ (forecast.probability * 100).toFixed(0) }}%</template>
                  </span>
                  <span class="mx-1">&middot;</span>
                  <span>{{ formattedFullDate(forecast.timestamp) }}</span>
                  <span class="mx-1">&middot;</span>
                  <span>{{ forecast.scenarioPlatform }}</span>
                </div>
                <p v-if="forecast.rationalSummary" class="text-xs text-fg-muted italic line-clamp-2">
                  &ldquo;{{ forecast.rationalSummary }}&rdquo;
                </p>
              </li>
            </ul>
          </div>
          <div v-else>
            <p class="text-fg-muted italic">No forecast history found for this forecaster.</p>
          </div>
        </section>
        <!-- END Forecast History Section -->

      </div>
    </div>
     <!-- Fallback if no forecaster data but no error -->
    <div v-else class="text-center py-12">
      <Icon name="heroicons:question-mark-circle-20-solid" class="w-12 h-12 text-fg-muted inline-block mb-4" />
      <p class="text-fg-muted text-xl">Forecaster data is not available.</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from '#app';
import { formatRelativeTime } from '~/utils/formatRelativeTime'; // Import the utility

const route = useRoute();
const router = useRouter();
const forecasterId = route.params.id;

const { data: forecaster, pending, error } = await useFetch(`/api/forecasters/${forecasterId}`, {
  key: `forecaster-${forecasterId}` // Unique key for this fetch
});

// Fetch forecast history
const { data: forecastHistory, pending: historyPending, error: historyError } = await useFetch(`/api/forecasters/${forecasterId}/history`, {
  key: `forecaster-history-${forecasterId}`,
  // lazy: true // Temporarily commented out for diagnostics
});

const goBack = () => {
  router.back();
};

const formattedJoinDate = computed(() => {
  if (forecaster.value && forecaster.value.createdAt) {
    return new Date(forecaster.value.createdAt).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return 'N/A'; 
});

// ADDED: For full date formatting
const formattedFullDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ADDED: For relative time formatting
const formattedRelativeTime = (dateString) => {
  if (!dateString) return '';
  return formatRelativeTime(dateString);
};

const statusClass = (status) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'border-green-500 bg-green-500/10 text-green-700 dark:text-green-400';
    case 'INACTIVE':
      return 'border-gray-500 bg-gray-500/10 text-gray-700 dark:text-gray-400';
    case 'DISABLED':
      return 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-400';
    default:
      return 'border-gray-400 bg-gray-400/10 text-gray-600 dark:text-gray-300';
  }
};

// SEO and Meta Tags
useHead({
  title: () => forecaster.value ? `${forecaster.value.name} - Forecaster Profile` : 'Forecaster Profile',
  meta: [
    { name: 'description', content: () => forecaster.value ? `Profile page for forecaster ${forecaster.value.name}. ${forecaster.value.description || ''}` : 'View forecaster profile.' }
  ]
});
</script>

<style scoped>
/* Add any page-specific styles if needed */
</style>
