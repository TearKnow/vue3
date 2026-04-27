<template>
  <div class="utterances-container">
    <div v-show="loading" class="utterances-loading" aria-live="polite">
      <div class="loading-spinner" />
      <p class="loading-label">评论加载中…</p>
      <div class="skeleton-block">
        <div class="skeleton-avatar" />
        <div class="skeleton-body">
          <div class="skeleton-line w60" />
          <div class="skeleton-line w100" />
          <div class="skeleton-line w80" />
        </div>
      </div>
      <div class="skeleton-block">
        <div class="skeleton-avatar" />
        <div class="skeleton-body">
          <div class="skeleton-line w40" />
          <div class="skeleton-line w100" />
        </div>
      </div>
    </div>
    <div ref="containerRef" class="utterances-embed" :class="{ hidden: loading }" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = withDefaults(defineProps<{
  repo: string
  issueTerm?: 'pathname' | 'url' | 'title' | 'og:title' | string
  theme?: string
}>(), {
  issueTerm: 'pathname',
  theme: 'github-light',
})

const emit = defineEmits<{ ready: [] }>()

const containerRef = ref<HTMLDivElement>()
const loading = ref(true)
let settled = false

function markReady() {
  if (settled) return
  settled = true
  loading.value = false
  emit('ready')
}

function onMessage(e: MessageEvent) {
  if (e.origin !== 'https://utteranc.es') return
  if (e.data?.type === 'resize') {
    markReady()
    window.removeEventListener('message', onMessage)
  }
}

function loadScript() {
  if (!containerRef.value) return
  containerRef.value.innerHTML = ''
  loading.value = true
  settled = false

  window.addEventListener('message', onMessage)

  const script = document.createElement('script')
  script.src = 'https://utteranc.es/client.js'
  script.setAttribute('repo', props.repo)
  script.setAttribute('issue-term', props.issueTerm)
  script.setAttribute('theme', props.theme)
  script.setAttribute('crossorigin', 'anonymous')
  script.async = true

  script.addEventListener('error', () => markReady())

  containerRef.value.appendChild(script)
}

onMounted(loadScript)

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})

watch(() => props.theme, loadScript)
</script>

<style scoped>
.utterances-container {
  max-width: 760px;
  margin: 2rem auto;
}

.utterances-embed.hidden {
  height: 0;
  overflow: hidden;
}

.utterances-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.2rem;
  padding: 2rem 1.5rem;
  background: var(--blog-slate-50);
  border: 1px dashed var(--blog-slate-200);
  border-radius: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--blog-slate-200);
  border-top-color: var(--blog-blue-600);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-label {
  margin: 0;
  color: var(--blog-slate-500);
  font-size: 0.9rem;
}

.skeleton-block {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

.skeleton-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--blog-slate-200);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-top: 0.25rem;
}

.skeleton-line {
  height: 0.75rem;
  border-radius: 6px;
  background: var(--blog-slate-200);
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-line.w100 { width: 100%; }
.skeleton-line.w80 { width: 80%; }
.skeleton-line.w60 { width: 60%; }
.skeleton-line.w40 { width: 40%; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
