<template>
  <div
    class="h-full flex flex-col pt-2 pb-6 lg:px-4 lg:pb-8"
  >
    <!-- ARTICLE -->
    <NuxtLink v-if="group?.story?.slug" :to="`/articles/${group.story.slug}`">
      <div class="flex flex-col" :class="{
        'flex-col': layoutOption === 'vertical' || !group.imageUrl,
        'lg:flex-row': layoutOption === 'horizontal' && group.imageUrl
      }">
        <div class="w-full max-w-[100vw] min-w-[100px]">
          <img v-if="group.imageUrl" :src="group.imageUrl" class="w-full h-full object-cover -mt-4 mb-2" alt="" />
        </div>
        
        <div class="w-full px-2 md:px-4">
          <!-- META - Moved Up -->
          <div id="article-meta" class="flex items-center justify-between space-x-2 py-1">
            <div class="flex items-center space-x-2">
              <div
                class="text-xs text-fg-muted leading-none border-r border-fg-muted pr-2"
                my-1
              >
                {{ group.story.publishedDate }}
              </div>
               <!-- Use NEW TeaserSources component -->
              <TeaserSources v-if="group.story?.sources?.length > 0" :sources="group.story.sources" />
              <div v-else class="text-xs text-fg-muted leading-none">
                0 sources
              </div>
            </div>
          </div>

          <h2 
          class="text-xl md:text-2xl leading-tight font-medium" id="article-title">
            {{ group.story.title }}
          </h2>
          <div id="article-precis" class="text-fg mb-2 mt-2 md:mt-4">
            <div class="line-clamp-4">{{ group.story.precis }}
            </div>
          </div>
        </div>
      </div>
    </NuxtLink>

    <!-- Fallback if slug is missing -->
    <div v-else class="opacity-50 cursor-not-allowed">
       <div class="flex" :class="{'flex-col': layoutOption === 'vertical'}">
        <div class="mb-6 w-full">
          <img v-if="group.imageUrl" :src="group.imageUrl" class="w-full h-full object-cover" alt="" />
        </div>
        <div class="ps-2 lg:ps-4 w-full">
          <!-- META - Moved Up (Fallback) -->
          <div id="article-meta" class="flex items-center space-x-2 py-2 mb-2">
            <div class="text-xs text-fg-muted leading-none border-r border-fg-muted pr-2 my-1">
              {{ group.story?.publishedDate || '...' }}
            </div>
            <div class="text-xs text-fg-muted leading-none">
               {{ group.story?.sources?.length || 0 }} sources
            </div>
          </div>

          <h2 class="text-2xl leading-tight font-medium text-fg-muted" id="article-title">
            {{ group.story?.title || 'Article data missing' }}
          </h2>
           <div id="article-precis" class="text-fg-muted mb-2 mt-4">
            <div class="line-clamp-4">{{ group.story?.precis || '...' }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- SCENARIOS -->
    <div v-if="group.scenarios && group.scenarios.length > 0" class="">
    <!-- Changed Label -->
    <div class="mt-4 mb-1 border-b border-bg-muted text-xs font-semibold text-fg-muted px-2">
       How the story might continue:
    </div>

      <!-- Responsive Grid Layout -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-1">
        <!-- Iterate over ALL scenarios, conditionally hide on mobile -->
        <div 
          v-for="(scenario, index) in group.scenarios" 
          :key="scenario.scenarioId" 
          :class="{ 
            'hidden': !showAllScenarios && index >= initialScenarioCount, // Hide extra on mobile
            'md:block': true, // Still needed to override hidden on md+
            'bg-accent-bg py-1': true // Apply background on ALL sizes
          }"
        >
          <ScenarioTeaser :scenario="scenario" />
        </div>
      </div>
      <!-- Expand/Collapse Button -->
      <div v-if="group.nScenarios > initialScenarioCount" class="mt-2 ps-2 lg:ps-4 md:hidden">
        <button
          @click="toggleShowAllScenarios"
          class="text-fg-muted mt-1 italic block text-xs hover:underline"
        >
          <span v-if="!showAllScenarios">
            show {{ group.nScenarios - initialScenarioCount }} more
            {{ group.nScenarios - initialScenarioCount > 1 ? 'Scenarios' : 'Scenario' }}
          </span>
          <span v-else>
            Show fewer Scenarios
          </span>
        </button>
      </div>
    </div>
     <!-- Placeholder if no scenarios -->
    <div v-else class="text-sm text-fg-muted italic pt-2 ps-2 px-2 lg:px-4">
        No scenarios available yet.
    </div>
  </div>
</template>

<script setup>
// Import necessary functions and components
import { ref, computed } from 'vue';
// Import NEW TeaserSources component
import TeaserSources from '~/components/article/TeaserSources.vue'; 
import ScenarioTeaser from '~/components/scenario/Teaser.vue'; // Ensure ScenarioTeaser is imported if not globally registered

const props = defineProps({
  group: {
    type: Object,
    required: true,
    // Provide a more robust default including nested structures
    default: () => ({ 
        story: { 
            slug: null, 
            title: 'Loading...', 
            precis: '', 
            publishedDate: '', 
            sources: [] 
        }, 
        imageUrl: null, 
        scenarios: [], 
        nScenarios: 0 
    }),
  },
  layoutOption: {
    type: String,
    default: 'horizontal',
  },
});

// State for scenario expansion
const showAllScenarios = ref(false);
const initialScenarioCount = 3; // Number of scenarios to show initially (Changed from 2 to 3)

// Method to toggle scenario visibility
const toggleShowAllScenarios = () => {
  showAllScenarios.value = !showAllScenarios.value;
};

</script>

<style scoped>
/* Remove any specific background here if present */
</style>
