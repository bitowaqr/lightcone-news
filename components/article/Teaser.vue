<template>
  <div
    class="pb-10 h-full flex flex-col"
  >
    <!-- ARTICLE -->
    <NuxtLink v-if="group?.story?.slug" :to="`/articles/${group.story.slug}`">
      <div class="flex flex-col" :class="{
        'flex-col': layoutOption === 'vertical' || !group.imageUrl,
        'lg:flex-row': layoutOption === 'horizontal' && group.imageUrl
      }">
        <div class="mb-6 w-full max-w-[100vw] min-w-[100px]">
          <img v-if="group.imageUrl" :src="group.imageUrl" class="w-full h-full object-cover" alt="" />
        </div>
        
        <div class="ps-2 lg:ps-4 w-full">

        <h2 
        class="text-2xl leading-tight font-medium" id="article-title">
          {{ group.story.title }}
        </h2>
      <div id="article-precis" class="text-fg mb-2 mt-4">
        <div class="line-clamp-4">{{ group.story.precis }}
        </div>
      </div>
      <!-- META -->
      <div id="article-meta" class="flex items-center space-x-2 py-2 mt-auto">
        <div
          class="text-xs text-fg-muted leading-none border-r border-fg-muted pr-2"
          my-1
        >
          {{ group.story.publishedDate }}
        </div>
        <div class="text-xs text-fg-muted leading-none">
            {{ group.story.sources?.length || 0 }} sources
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
          <h2 class="text-2xl leading-tight font-medium text-fg-muted" id="article-title">
            {{ group.story?.title || 'Article data missing' }}
          </h2>
           <div id="article-precis" class="text-fg-muted mb-2 mt-4">
            <div class="line-clamp-4">{{ group.story?.precis || '...' }}</div>
          </div>
           <!-- META -->
          <div id="article-meta" class="flex items-center space-x-2 py-2 mt-auto">
            <div class="text-xs text-fg-muted leading-none border-r border-fg-muted pr-2 my-1">
              {{ group.story?.publishedDate || '...' }}
            </div>
            <div class="text-xs text-fg-muted leading-none">
               {{ group.story?.sources?.length || 0 }} sources
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- SCENARIOS -->
    <div v-if="group.scenarios && group.scenarios.length > 0" class="">
    <div class="mt-8 mb-1 border-fg-muted text-xs font-medium text-fg-muted">
       Related scenarios:
    </div>

      <div class="space-y-2">
        <div v-for="scenario in group.scenarios" :key="scenario.scenarioId" class="">
          <ScenarioTeaser :scenario="scenario" />
        </div>
      </div>
      <!-- Check if slug exists before rendering the 'more scenarios' link -->
      <div v-if="group.nScenarios > group.scenarios.length && group?.story?.slug" class="mt-2">
        <NuxtLink
          :to="`/articles/${group.story.slug}`"
          class="text-fg-muted mt-1 italic block text-xs hover:underline"
        >
          + {{ group.nScenarios - group.scenarios.length }} more
          {{ group.nScenarios - group.scenarios.length > 1 ? 'Scenarios' : 'Scenario' }}
        </NuxtLink>
      </div>
    </div>
     <!-- Placeholder if no scenarios -->
    <div v-else class="text-sm text-fg-muted italic pt-2 ps-2">
        No related scenarios available yet.
    </div>
  </div>
</template>

<script setup>
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
</script>

<style scoped></style>
