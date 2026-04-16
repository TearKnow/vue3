import { createInjectionState } from '@vueuse/core'
import { computed, ref } from 'vue'

function useScopedCounter(initial = 0, mode = 'unknown') {
  const count = ref(initial)
  const label = computed(() => `${mode}: ${count.value}`)

  const inc = () => {
    count.value += 1
  }

  return {
    mode,
    count,
    label,
    inc,
  }
}

export const [provideScopedCounter, useScopedCounterStore] = createInjectionState(useScopedCounter)
