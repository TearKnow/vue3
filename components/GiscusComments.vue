<template>
  <div class="giscus-container">
    <div
      v-if="missingFields.length"
      class="giscus-hint"
      role="alert"
    >
      Giscus 配置不完整，缺少：{{ missingFields.join(', ') }}
    </div>
    <div
      v-else-if="loadError"
      class="giscus-hint"
      role="alert"
    >
      Giscus 加载失败，请检查网络或浏览器拦截插件设置。
    </div>
    <div
      v-show="loading && !missingFields.length"
      class="giscus-loading"
      aria-live="polite"
    >
      评论加载中…
    </div>
    <div
      ref="containerRef"
      class="giscus-embed"
      :class="{ hidden: loading }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  repo: string
  repoId: string
  category: string
  categoryId: string
  mapping?: 'pathname' | 'url' | 'title' | 'og:title' | 'specific' | 'number' | string
  strict?: '0' | '1' | string
  reactionsEnabled?: '0' | '1' | string
  emitMetadata?: '0' | '1' | string
  inputPosition?: 'top' | 'bottom' | string
  lang?: string
  theme?: string
}>(), {
  mapping: 'pathname',
  strict: '0',
  reactionsEnabled: '1',
  emitMetadata: '0',
  inputPosition: 'top',
  lang: 'zh-CN',
  theme: 'light',
})

const emit = defineEmits<{ ready: [] }>()

const containerRef = ref<HTMLDivElement>()
const loading = ref(true)
const loadError = ref(false)
let settled = false

const missingFields = computed(() => {
  const fields: string[] = []
  if (!props.repo) fields.push('repo')
  if (!props.repoId) fields.push('repoId')
  if (!props.categoryId) fields.push('categoryId')
  return fields
})

const markReady = () => {
  if (settled) return
  settled = true
  loading.value = false
  emit('ready')
}

const onMessage = (event: MessageEvent) => {
  if (event.origin !== 'https://giscus.app')
    return

  if (event.data?.giscus) {
    markReady()
    window.removeEventListener('message', onMessage)
  }
}

const loadScript = () => {
  if (!containerRef.value)
    return

  containerRef.value.innerHTML = ''
  loading.value = true
  settled = false
  loadError.value = false

  if (missingFields.value.length) {
    markReady()
    return
  }

  window.addEventListener('message', onMessage)

  const script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.setAttribute('data-repo', props.repo)
  script.setAttribute('data-repo-id', props.repoId)
  script.setAttribute('data-category', props.category)
  script.setAttribute('data-category-id', props.categoryId)
  script.setAttribute('data-mapping', props.mapping)
  script.setAttribute('data-strict', props.strict)
  script.setAttribute('data-reactions-enabled', props.reactionsEnabled)
  script.setAttribute('data-emit-metadata', props.emitMetadata)
  script.setAttribute('data-input-position', props.inputPosition)
  script.setAttribute('data-lang', props.lang)
  script.setAttribute('data-theme', props.theme)
  script.setAttribute('crossorigin', 'anonymous')
  script.async = true

  script.addEventListener('load', () => markReady())
  script.addEventListener('error', () => {
    loadError.value = true
    markReady()
  })

  containerRef.value.appendChild(script)
}

onMounted(loadScript)

onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
})

watch(
  () => [
    props.repo,
    props.repoId,
    props.category,
    props.categoryId,
    props.mapping,
    props.strict,
    props.reactionsEnabled,
    props.emitMetadata,
    props.inputPosition,
    props.lang,
    props.theme,
  ],
  loadScript,
)
</script>

<style scoped>
.giscus-container {
  max-width: 760px;
  margin: 2rem auto;
}

.giscus-hint {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fef2f2;
  color: #991b1b;
  font-size: 0.92rem;
}

html.dark .giscus-hint {
  border-color: #7f1d1d;
  background: #1a0a0a;
  color: #fca5a5;
}

.giscus-embed.hidden {
  height: 0;
  overflow: hidden;
}

.giscus-loading {
  padding: 1rem 0;
  color: var(--blog-slate-500);
  font-size: 0.95rem;
}
</style>
