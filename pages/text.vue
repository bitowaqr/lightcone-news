<template>
  <div>
    <h1>Text</h1>
    <p>{{ text }}</p>
    <NuxtLink class="text-blue-500" to="/">Home</NuxtLink>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const text = ref('Hello World');
</script>
