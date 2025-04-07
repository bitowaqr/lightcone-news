import { useLocalStorage } from '@vueuse/core'
import { watchEffect } from 'vue'

export function useDarkMode() {
  // Create reactive state backed by localStorage
  // Default to 'light' or check initial system preference if needed
  const colorMode = useLocalStorage<'light' | 'dark'>('color-mode', 'light')

  const isDark = computed(() => colorMode.value === 'dark')

  function toggleDarkMode() {
    colorMode.value = colorMode.value === 'light' ? 'dark' : 'light'
  }

  // Watch the state and apply/remove the class to the <html> element
  watchEffect(() => {
    if (typeof document !== 'undefined') { // Ensure this runs only on client-side
      const htmlElement = document.documentElement
      if (colorMode.value === 'dark') {
        htmlElement.classList.add('dark')
      } else {
        htmlElement.classList.remove('dark')
      }
    }
  })

  // Initial check on client-side load
  if (typeof document !== 'undefined') {
    const htmlElement = document.documentElement
    if (colorMode.value === 'dark') {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
  }


  return {
    isDark,
    toggleDarkMode,
  }
}