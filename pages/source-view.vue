<template>
  <div class="source-page">
    <div class="source-header">
      <NuxtLink class="source-back" to="/">
        返回目录
      </NuxtLink>
      <h2>源码查看</h2>
      <p class="source-file">{{ currentFile || '未指定文件' }}</p>
    </div>

    <div v-if="sourceLines.length" class="source-code-shell">
      <div class="source-code-toolbar">
        <span class="source-dot source-dot-red" />
        <span class="source-dot source-dot-yellow" />
        <span class="source-dot source-dot-green" />
        <span class="source-toolbar-title">{{ currentFile }}</span>
      </div>

      <div class="source-code">
        <div
          v-for="(line, index) in highlightedLines"
          :key="index"
          class="source-line"
        >
          <span class="source-line-number">{{ index + 1 }}</span>
          <code class="source-line-content" v-html="line" />
        </div>
      </div>
    </div>
    <div v-else class="source-empty">
      未找到对应源码。
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const route = useRoute()
const pageSources = import.meta.glob('./**/*.vue', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

function normalizePageFilePath(filePath: string) {
  return filePath
    .replace(/\\/g, '/')
    .replace(/^.*\/pages\//, '')
    .replace(/^\.\//, '')
}

const currentFile = computed(() => {
  const { file } = route.query
  return typeof file === 'string' ? file : ''
})

const sourceMap = new Map<string, string>(
  Object.entries(pageSources).map(([filePath, source]) => [normalizePageFilePath(filePath), source]),
)

const sourceCode = computed(() => {
  return sourceMap.get(currentFile.value) ?? ''
})

const sourceLines = computed(() => {
  return sourceCode.value.split('\n')
})

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function highlightLine(line: string) {
  const placeholders: string[] = []
  const stash = (value: string) => {
    const index = placeholders.push(value) - 1
    return `__TOKEN_${index}__`
  }

  let output = escapeHtml(line)

  output = output.replace(/(&lt;!--.*?--&gt;)/g, match => stash(`<span class="token-comment">${match}</span>`))
  output = output.replace(/(\/\/.*)$/g, match => stash(`<span class="token-comment">${match}</span>`))
  output = output.replace(/('[^']*'|"[^"]*"|`[^`]*`)/g, match => stash(`<span class="token-string">${match}</span>`))
  output = output.replace(/([:@#]?[\w-]+)(=)/g, '<span class="token-attr">$1</span><span class="token-punctuation">$2</span>')
  output = output.replace(/(&lt;\/?)([A-Za-z][\w-]*)(?=[\s/&gt;])/g, '$1<span class="token-tag">$2</span>')
  output = output.replace(/\b(import|from|const|let|var|function|return|if|else|for|while|await|async|type|interface|new|as|default|export|defineProps|defineEmits|defineModel|computed|ref|reactive|watch|useRoute|useRouter)\b/g, '<span class="token-keyword">$1</span>')
  output = output.replace(/\b(true|false|null|undefined)\b/g, '<span class="token-constant">$1</span>')
  output = output.replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>')

  return output.replace(/__TOKEN_(\d+)__/g, (_, index) => placeholders[Number(index)] ?? '')
}

const highlightedLines = computed(() => {
  return sourceLines.value.map(line => highlightLine(line || ' '))
})
</script>

<style scoped>
.source-page {
  padding: 24px;
  background: #f8fafc;
  min-height: 100vh;
}

.source-header {
  margin-bottom: 16px;
}

.source-back {
  display: inline-block;
  margin-bottom: 12px;
  color: #2563eb;
  text-decoration: none;
}

.source-back:hover {
  text-decoration: underline;
}

.source-file {
  color: #64748b;
}

.source-code-shell {
  overflow: hidden;
  border: 1px solid #1e293b;
  border-radius: 14px;
  background: #0f172a;
  box-shadow: 0 10px 30px rgb(15 23 42 / 18%);
}

.source-code-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #1e293b;
  background: #111827;
}

.source-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.source-dot-red {
  background: #fb7185;
}

.source-dot-yellow {
  background: #fbbf24;
}

.source-dot-green {
  background: #4ade80;
}

.source-toolbar-title {
  margin-left: 8px;
  color: #94a3b8;
  font-size: 13px;
}

.source-code {
  overflow: auto;
  padding: 12px 0;
}

.source-line {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  align-items: start;
  min-width: max-content;
}

.source-line:hover {
  background: rgb(148 163 184 / 8%);
}

.source-line-number {
  padding: 0 12px 0 0;
  color: #64748b;
  text-align: right;
  user-select: none;
  border-right: 1px solid #1e293b;
}

.source-line-content {
  display: block;
  padding: 0 16px;
  color: #e2e8f0;
  line-height: 1.7;
  white-space: pre;
}

.source-line-content :deep(.token-comment) {
  color: #6a9955;
}

.source-line-content :deep(.token-string) {
  color: #ce9178;
}

.source-line-content :deep(.token-keyword) {
  color: #c586c0;
}

.source-line-content :deep(.token-constant) {
  color: #569cd6;
}

.source-line-content :deep(.token-number) {
  color: #b5cea8;
}

.source-line-content :deep(.token-tag) {
  color: #569cd6;
}

.source-line-content :deep(.token-attr) {
  color: #9cdcfe;
}

.source-line-content :deep(.token-punctuation) {
  color: #d4d4d4;
}

.source-empty {
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  color: #475569;
}
</style>
