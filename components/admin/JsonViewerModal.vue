<template>
  <Teleport to="body">
    <div v-if="modelValue" class="json-viewer-modal-backdrop" @click="closeOnBackdrop && $emit('update:modelValue', false)">
      <div class="json-viewer-modal-container" @click.stop>
        <div class="json-viewer-modal-header">
          <h3 class="modal-title">{{ title }}</h3>
          <button @click="$emit('update:modelValue', false)" class="close-button">×</button>
        </div>
        <div class="json-viewer-modal-body">
          <pre class="json-content">{{ formattedJson }}</pre>
        </div>
        <div class="json-viewer-modal-footer">
          <button 
            @click="copyToClipboard" 
            class="copy-button"
            :class="{ 'copied': copied }"
          >
            {{ copied ? 'Copied!' : 'Copy to Clipboard' }}
          </button>
          <button @click="$emit('update:modelValue', false)" class="close-button-text">Close</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  jsonData: {
    type: Object,
    required: true
  },
  title: {
    type: String,
    default: 'Raw JSON Data'
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true
  }
});

defineEmits(['update:modelValue']);

const copied = ref(false);

const formattedJson = computed(() => {
  try {
    return JSON.stringify(props.jsonData, null, 2);
  } catch (e) {
    return '{"error": "Unable to format JSON data"}';
  }
});

const copyToClipboard = () => {
  navigator.clipboard.writeText(formattedJson.value).then(() => {
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  });
};
</script>

<style scoped>
.json-viewer-modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.json-viewer-modal-container {
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
}

.dark .json-viewer-modal-container {
  background-color: #1f2937;
  color: #e5e7eb;
}

.json-viewer-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
}

.dark .json-viewer-modal-header {
  border-color: #374151;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  padding: 0.25rem;
  cursor: pointer;
  color: #6b7280;
}

.close-button:hover {
  color: #111827;
}

.dark .close-button:hover {
  color: #f9fafb;
}

.json-viewer-modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex-grow: 1;
}

.json-content {
  font-family: monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  margin: 0;
  padding: 0.5rem;
  background-color: #f3f4f6;
  border-radius: 0.25rem;
  overflow-x: auto;
}

.dark .json-content {
  background-color: #374151;
}

.json-viewer-modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid #e5e7eb;
  gap: 0.5rem;
}

.dark .json-viewer-modal-footer {
  border-color: #374151;
}

.copy-button {
  background-color: #4f46e5;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.copy-button:hover {
  background-color: #4338ca;
}

.copy-button.copied {
  background-color: #10b981;
}

.close-button-text {
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.dark .close-button-text {
  background-color: #374151;
  color: #e5e7eb;
  border-color: #4b5563;
}

.close-button-text:hover {
  background-color: #e5e7eb;
}

.dark .close-button-text:hover {
  background-color: #4b5563;
}
</style> 