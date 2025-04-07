<template>
  <div v-if="timeline && timeline.length > 0" class="timeline-container mt-8">
    <h4 class="text-xs font-medium text-fg-muted mb-2">Timeline:</h4>
    
    <div class="timeline-wrapper">
      <div class="timeline-items">
        <div 
          v-for="(item, index) in displayedItems" 
          :key="index"
          class="timeline-item"
          :class="{ 
            'last-item': (index === displayedItems.length - 1) && expanded,
            'last-item-collapsed': (index === displayedItems.length - 1) && !expanded
          }"
        >
          <div class="timeline-bullet"></div>
          <div class="timeline-content">
            <div class="text-sm text-fg-muted font-medium">{{ item.date }}</div>
            <div class="timeline-event">{{ item.event }}</div>
          </div>
        </div>
      </div>
      
      <button 
        v-if="timeline.length > 2" 
        @click="toggleExpand" 
        class="timeline-expand"
      >
        {{ expanded ? 'Show less' : 'Show more' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  timeline: {
    type: Array,
    default: () => [],
  }
});

const expanded = ref(false);

const displayedItems = computed(() => {
  return expanded.value ? props.timeline : props.timeline.slice(0, 2);
});

const toggleExpand = () => {
  expanded.value = !expanded.value;
};
</script>

<style scoped>
.timeline-container {
  position: relative;
}

.timeline-wrapper {
  position: relative;
}

.timeline-items {
  position: relative;
}

.timeline-items::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 8px;
  bottom: 8px;
  width: 0;
  border-left: 1px dashed var(--primary);
}

.timeline-item {
  position: relative;
  padding-left: 24px;
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.timeline-item.last-item-collapsed, .timeline-item.last-item {
  margin-bottom: 2px;
}

.timeline-item.last-item::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 15px;
  bottom: 0;
  width: 1px;
  background-color: var(--article-bg);
  z-index: 2;
}

.timeline-item.last-item-collapsed::before {
  content: '';
  position: absolute;
  left: 4px;
  top: 15px;
  bottom: 0;
  width: 1px;
  background: linear-gradient(to bottom, var(--primary),  var(--article-bg), var(--article-bg));
  z-index: 2;
}


.timeline-bullet {
  position: absolute;
  left: 0;
  top: 6px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: var(--primary);
  z-index: 1;
}

.timeline-content {
  padding-bottom: 4px;
}

.timeline-event {
  line-height: 1.5;
  margin-bottom: 2px;
}

/* .timeline-date {
  font-size: 0.75rem;
  color: var(--color-fg-muted, #6b7280);
} */

.timeline-expand {
  margin-left: 4px;
  font-size: 0.75rem;
  color: var(--color-fg-muted, #6b7280);
  background: transparent;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  transition: color 0.1s ease-in-out;
}

.timeline-expand:hover {
  color: var(--color-fg, #374151);
}
</style> 