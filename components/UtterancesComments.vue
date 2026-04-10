<template>
  <div ref="containerRef" class="utterances-container" />
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

function loadScript() {
  if (!containerRef.value) return
  containerRef.value.innerHTML = ''

  const script = document.createElement('script')
  script.src = 'https://utteranc.es/client.js'
  script.setAttribute('repo', props.repo)
  script.setAttribute('issue-term', props.issueTerm)
  script.setAttribute('theme', props.theme)
  script.setAttribute('crossorigin', 'anonymous')
  script.async = true
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
</style>
