<template>
  <div class="markdown-editor" v-if="editor">
    <div class="toolbar border-b dark:border-gray-700 p-2 flex flex-wrap gap-2 bg-gray-50 dark:bg-gray-800 mb-2 rounded-t">
      <button
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor.isActive('bold') }"
        class="toolbar-button"
        title="Bold"
      >
        <span class="font-bold">B</span>
      </button>
      <button
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        class="toolbar-button"
        title="Italic"
      >
        <span class="italic">I</span>
      </button>
      <button
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        class="toolbar-button"
        title="Heading"
      >
        H3
      </button>
      <button
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        class="toolbar-button"
        title="Bullet List"
      >
        •
      </button>
      <button
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        class="toolbar-button"
        title="Numbered List"
      >
        1.
      </button>
      <button
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        class="toolbar-button"
        title="Blockquote"
      >
        "
      </button>
      <button
        @click="editor.chain().focus().undo().run()"
        class="toolbar-button"
        title="Undo"
      >
        ↺
      </button>
      <button
        @click="editor.chain().focus().redo().run()"
        class="toolbar-button"
        title="Redo"
      >
        ↻
      </button>
    </div>

    <div 
      class="editor-content w-full p-2 border rounded-b dark:border-gray-700 bg-white dark:bg-gray-900 text-black dark:text-white min-h-[200px]"
      :class="{ 'min-h-[400px]': large }"
    >
      <editor-content :editor="editor" />
    </div>
    
    <div v-if="showPreview" class="preview-toggle mt-2">
      <label class="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
        <input type="checkbox" v-model="previewVisible" class="mr-2">
        Show Preview
      </label>
      <div v-if="previewVisible" class="markdown-preview mt-2 prose dark:prose-invert max-w-none p-4 border rounded bg-gray-50 dark:bg-gray-800">
        <div v-html="htmlContent"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  large: {
    type: Boolean,
    default: false
  },
  showPreview: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue'])

// Editor setup with basic extensions
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
  ],
  onUpdate: ({ editor }) => {
    // When the content changes, update the v-model
    emit('update:modelValue', editor.getHTML())
  }
})

// For preview display
const previewVisible = ref(false)
const htmlContent = ref('')

watch(() => props.modelValue, (value) => {
  // Only update the editor content when needed to avoid cursor jumps
  if (editor.value && value !== editor.value.getHTML()) {
    editor.value.commands.setContent(value, false)
  }
})

// Watch editor content for preview
watch(() => editor.value?.getHTML(), (html) => {
  if (html) {
    htmlContent.value = html
  }
}, { immediate: true })

// Clean up editor instance when component is destroyed
onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<style scoped>
.markdown-editor {
  font-family: sans-serif;
}

.toolbar-button {
  @apply px-2 py-1 border dark:border-gray-600 rounded-md;
  @apply hover:bg-gray-100 dark:hover:bg-gray-700;
  @apply focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400;
}

.toolbar-button.is-active {
  @apply bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700;
}

:deep(.ProseMirror) {
  min-height: 100px;
  outline: none;
}

:deep(.ProseMirror p) {
  margin-bottom: 0.5em;
}

:deep(.ProseMirror h3) {
  font-size: 1.3em;
  font-weight: bold;
  margin: 1em 0 0.5em;
}

:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin-bottom: 0.5em;
}

:deep(.ProseMirror blockquote) {
  border-left: 3px solid #ccc;
  padding-left: 1em;
  margin-left: 0;
  font-style: italic;
  margin-bottom: 0.5em;
}
</style> 