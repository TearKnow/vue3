<template>
  <div class="utterances-container">
    <div v-if="loading" class="utterances-loading" aria-live="polite">
      <div class="skeleton-line" />
      <div class="skeleton-line short" />
      <div class="skeleton-line" />
    </div>
    <div ref="containerRef" class="utterances-embed" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  repo: string
  issueTerm?: 'pathname' | 'url' | 'title' | 'og:title' | string
  theme?: string
}>(), {
  issueTerm: 'pathname',
  theme: 'github-light',
})

const containerRef = ref<HTMLDivElement>()
const loading = ref(true)

function loadScript() {
  if (!containerRef.value) return
  containerRef.value.innerHTML = ''
  loading.value = true

  const script = document.createElement('script')
  script.src = 'https://utteranc.es/client.js'
  script.setAttribute('repo', props.repo)
  script.setAttribute('issue-term', props.issueTerm)
  script.setAttribute('theme', props.theme)
  script.setAttribute('crossorigin', 'anonymous')
  script.async = true

  script.addEventListener('load', () => {
    loading.value = false
  })
  script.addEventListener('error', () => {
    loading.value = false
  })

  containerRef.value.appendChild(script)
}

onMounted(loadScript)

watch(() => props.theme, loadScript)
</script>

<style scoped>
.utterances-container {
  max-width: 760px;
  margin: 2rem auto;
}

.utterances-loading {
  display: grid;
  gap: 0.75rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 0.75rem;
}

.skeleton-line {
  width: 100%;
  height: 0.9rem;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.08) 25%, rgba(0, 0, 0, 0.14) 50%, rgba(0, 0, 0, 0.08) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite ease-in-out;
}

.skeleton-line.short {
  width: 45%;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
