import { ref, watch } from 'vue'

const STORAGE_KEY = 'theme'

const isDark = ref(false)
let initialized = false

export function useTheme() {
  function init() {
    if (!import.meta.client || initialized) return
    initialized = true
    isDark.value = document.documentElement.classList.contains('dark')
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
  }

  if (import.meta.client) {
    watch(isDark, (val) => {
      document.documentElement.classList.toggle('dark', val)
    })
  }

  return { isDark, init, toggle }
}
