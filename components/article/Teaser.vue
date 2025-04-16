<template>
  <div
    class="pb-10 h-full flex flex-col"
  >
    <!-- ARTICLE -->
    <NuxtLink :to="`/articles/${group.story.articleId}`">
    <!-- randomly flex or flex-col -->
      <div class="flex" :class="{'flex-col': (Math.random() > 0.5)}">
        <div v-if="group.imageUrl" class="mb-6 w-full"> 
          <img :src="group.imageUrl" class="w-full h-full object-cover" />
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
            {{ group.story.sources.length }} sources
          </div>
        </div>
      </div>
        </div>
    </NuxtLink>

    <!-- SCENARIOS -->
    <div class="mt-10 mb-2 pb-1 border-b border-dotted border-fg-muted text-sm text-fg-muted">
        How the story might continue...
    </div>

    <div v-if="group.scenarios && group.scenarios.length > 0" class="">
      <div class="space-y-2">
        <div v-for="scenario in group.scenarios" :key="scenario.scenarioId" class="">
          <NuxtLink
            :to="`/scenarios/${scenario.scenarioId}`"
            class="text-regular text-fg leading-tight flex items-center bg-accent-bg py-2.5 px-3 space-x-4 justify-between hover:opacity-80 transition-opacity duration-100"
          >
            <div class="">
              {{ scenario.name }}
            </div>
            <div v-if="scenario.chance" class="flex flex-col items-center">
              <div class="text-lg text-fg leading-tight">
                {{ scenario.chance !== undefined ? (scenario.chance * 100).toFixed(0) : 'N/A' }}%
              </div>
              <div class="text-xs text-fg-muted leading-none">chance</div>
            </div>
          </NuxtLink>
        </div>
      </div>
      <div v-if="group.nScenarios > 3" class="mt-2">
        <NuxtLink
          :to="`/articles/${group.story.articleId}`"
          class="text-fg-muted mt-1 italic block"
        >
          + {{ group.nScenarios - 3 }} more
          {{ group.nScenarios - 3 > 1 ? 'Scenarios' : 'Scenario' }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  group: {
    type: Object,
    required: true,
    default: () => ({}),
  },
});
</script>

<style scoped></style>
