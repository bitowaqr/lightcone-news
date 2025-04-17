<template>
  <div>
    Component: CommonTeaserGroupStory
    <NuxtLink v-if="story && story.slug" :to="`/articles/${story.slug}`" class="block hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
      <h4 class="font-medium text-primary">{{ story.title || 'Untitled Story' }}</h4>
      <p v-if="story.precis" class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{{ story.precis }}</p>
    </NuxtLink>
    <div v-else class="p-2">
      <p class="text-sm text-red-500">Error: Story data or slug missing.</p>
    </div>
  </div>
</template>

<script setup>
defineProps({
  story: {
    type: Object,
    required: true,
    default: () => ({ title: 'Loading...', slug: null })
  }
});
</script> 