<template>
  <div v-if="isDesktop" class="timeline-container-desktop">
    <h4 class="text-xs font-medium text-fg-muted mb-2">Timeline</h4>
    <div class="timeline-wrapper mt-2">
      <div class="timeline-items">
        <div 
          v-for="(item, index) in displayedItemsDesktop" 
          :key="`desktop-${index}`"
          class="timeline-item"
          :class="{ 
            'last-item': index === displayedItemsDesktop.length - 1 && expandedDesktop
          }"
        >
          <div class="timeline-bullet"></div>
          <div class="timeline-content">
            <div class="text-xs text-fg-muted font-medium">{{ item.date }}</div>
            <div class="timeline-event text-sm">{{ item.event }}</div>
          </div>
        </div>
      </div>
      
      <!-- Expand/Collapse button for Desktop -->
      <button 
        v-if="timeline.length > 2" 
        @click="toggleExpandDesktop" 
        class="timeline-expand"
      >
        {{ expandedDesktop ? 'Show less' : 'Show more' }}
      </button> 
    </div>
  </div>

  <!-- Mobile version using details/summary -->
  <details v-else class="timeline-container group">
    <summary class="timeline-summary cursor-pointer flex items-center justify-between list-none">
      <h4 class="text-xs font-medium text-fg-muted inline-block">Timeline</h4>
      <Icon name="heroicons:chevron-down-20-solid" class="w-4 h-4 text-fg-muted transition-transform duration-200 group-open:rotate-180" />
    </summary>

    <div class="timeline-wrapper mt-2">
      <div class="timeline-items">
        <div 
          v-for="(item, index) in timeline" 
          :key="`mobile-${index}`"
          class="timeline-item"
          :class="{ 
            'last-item': index === timeline.length - 1
          }"
        >
          <div class="timeline-bullet"></div>
          <div class="timeline-content">
            <div class="text-xs text-fg-muted font-medium">{{ item.date }}</div>
            <div class="timeline-event text-sm">{{ item.event }}</div>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  timeline: {
    type: Array,
    default: () => [],
  }
});

const isDesktop = ref(false);
const initialItemsToShow = 2;

// State for desktop expand/collapse
const expandedDesktop = ref(false);

const displayedItemsDesktop = computed(() => {
  // Always return full list if timeline has 2 or fewer items
  if (props.timeline.length <= initialItemsToShow) return props.timeline;
  // Return sliced or full based on expanded state
  return expandedDesktop.value ? props.timeline : props.timeline.slice(0, initialItemsToShow);
});

const toggleExpandDesktop = () => {
  expandedDesktop.value = !expandedDesktop.value;
};

const checkScreenSize = () => {
  const desktopCheck = window.innerWidth >= 1024;
  if (isDesktop.value !== desktopCheck) {
      isDesktop.value = desktopCheck;
      // Reset desktop expansion state if switching breakpoints
      if (desktopCheck) {
          expandedDesktop.value = false; 
      }
  }
};

onMounted(() => {
  checkScreenSize();
  window.addEventListener('resize', checkScreenSize);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});

// Watch needed if props.timeline changes dynamically (optional based on usage)
// watch(() => props.timeline, () => {
//   expandedDesktop.value = false; // Reset on data change
// });

</script>

<style scoped>
.timeline-container-desktop, 
.timeline-container {
  position: relative;
}

.timeline-summary::-webkit-details-marker { /* Hide default marker */
  display: none;
}

.timeline-wrapper {
  position: relative;
  padding-left: 4px; /* Adjust for the line */
}

.timeline-items {
  position: relative;
}

.timeline-items::before {
  content: '';
  position: absolute;
  left: 4px; /* Position relative to timeline-wrapper padding */
  top: 8px;
  bottom: 8px;
  width: 0;
  border-left: 1px dashed var(--primary);
  z-index: 0; /* Ensure line is behind bullets */
}

/* Specific adjustment for desktop timeline ending */
.timeline-container-desktop .timeline-items::before {
   /* Make line stop based on last visible item */
   bottom: calc(100% - (1.3em * 1.5) - 8px); /* Adjust based on line-height/font-size if needed */
}
.timeline-container-desktop .timeline-items:has(> .timeline-item.last-item)::before {
   /* Ensure line reaches bottom if fully expanded */
    bottom: 8px;
}


.timeline-item {
  position: relative;
  padding-left: 20px; /* Adjusted for new left position */
  margin-bottom: 12px;
  transition: all 0.2s ease;
}

.timeline-item.last-item {
  margin-bottom: 2px;
}

/* Hide pseudo-element for mobile as details handles boundary */
.timeline-container .timeline-item.last-item::before { 
  display: none;
}

/* Keep pseudo-element for desktop */
.timeline-container-desktop .timeline-item.last-item::before {
  content: '';
  position: absolute;
  left: 4px; /* Match the main line position */
  top: 15px;
  bottom: 0;
  width: 1px;
  background-color: var(--article-bg); /* Use variable for theme adaptability */
  z-index: 2;
}

.timeline-bullet {
  position: absolute;
  left: 0; /* Position relative to timeline-wrapper padding */
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
  line-height: 1.3; /* Slightly increased */
  margin-bottom: 4px;
}

/* Styles for Desktop Expand Button */
.timeline-expand {
  margin-left: 4px; /* Aligns with timeline item padding */
  font-size: 0.75rem;
  color: var(--color-fg-muted, #6b7280);
  background: transparent;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  padding: 4px 0 0 0; /* Add padding top */
  transition: color 0.1s ease-in-out;
}

.timeline-expand:hover {
  color: var(--color-fg, #374151);
}

</style> 