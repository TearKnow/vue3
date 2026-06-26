<template>
  <div class="wiki-editor">
    <!-- 密码解锁层 -->
    <div v-if="!unlocked" class="wiki-editor-lock">
      <div class="wiki-editor-lock-card">
        <h3>🔒 输入密码以编辑</h3>
        <input
          v-model="passwordInput"
          type="password"
          class="wiki-password-input"
          placeholder="请输入 Wiki 编辑密码"
          @keyup.enter="unlock"
        >
        <div class="wiki-lock-actions">
          <button class="wiki-btn wiki-btn-primary" @click="unlock">
            解锁编辑
          </button>
          <button class="wiki-btn wiki-btn-ghost" @click="$emit('cancel')">
            返回阅读
          </button>
        </div>
        <p v-if="lockError" class="wiki-error">
          {{ lockError }}
        </p>
      </div>
    </div>

    <!-- 编辑器 -->
    <div v-else class="wiki-editor-body">
      <div class="wiki-editor-toolbar">
        <input
          v-model="title"
          class="wiki-title-input"
          placeholder="页面标题"
        >
        <div class="wiki-toolbar-actions">
          <span v-if="draftSaved" class="wiki-draft-indicator">草稿已保存</span>
          <button
            class="wiki-btn wiki-btn-primary"
            :disabled="saving"
            @click="save"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
          <button class="wiki-btn wiki-btn-ghost" @click="$emit('cancel')">
            取消
          </button>
        </div>
      </div>

      <p v-if="saveError" class="wiki-error">
        {{ saveError }}
      </p>
      <p v-if="saveSuccess" class="wiki-success">
        ✅ 已保存！约 1-2 分钟后部署生效。
      </p>

      <div class="wiki-editor-panes">
        <!-- 编辑区 -->
        <div class="wiki-editor-pane wiki-editor-input-pane">
          <div class="wiki-pane-label">
            编辑
          </div>
          <textarea
            ref="textareaRef"
            v-model="content"
            class="wiki-textarea"
            placeholder="在此书写 Markdown..."
            @scroll="onEditorScroll"
          />
        </div>

        <!-- 预览区 -->
        <div class="wiki-editor-pane wiki-editor-preview-pane">
          <div class="wiki-pane-label">
            预览
          </div>
          <div
            ref="previewRef"
            class="wiki-preview-content"
            v-html="renderedHtml"
            @scroll="onPreviewScroll"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import _markdownit from 'markdown-it'

// Vite CJS/ESM interop: markdown-it 需要兼容两种导出方式
const MarkdownIt = ((_markdownit as any).default || _markdownit) as typeof _markdownit

const props = defineProps<{
  slug: string
  initialTitle: string
  initialContent: string
}>()

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

// ── 密码解锁 ──
const unlocked = ref(false)
const passwordInput = ref('')
const lockError = ref('')

function unlock() {
  if (!passwordInput.value.trim()) {
    lockError.value = '请输入密码'
    return
  }
  lockError.value = ''
  unlocked.value = true
}

// ── 编辑状态 ──
const title = ref(props.initialTitle)
const content = ref(props.initialContent)
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref(false)

// ── markdown-it 实例 ──
const md = MarkdownIt({ html: false, breaks: true, linkify: true })

const renderedHtml = computed(() => {
  try {
    return md.render(content.value || '')
  }
  catch {
    return '<p style="color:red">Markdown 渲染错误</p>'
  }
})

// ── 同步滚动 ──
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const previewRef = ref<HTMLDivElement | null>(null)
let syncingScroll = false

function onEditorScroll() {
  if (syncingScroll || !textareaRef.value || !previewRef.value) return
  syncingScroll = true
  const ratio = textareaRef.value.scrollTop / (textareaRef.value.scrollHeight - textareaRef.value.clientHeight || 1)
  previewRef.value.scrollTop = ratio * (previewRef.value.scrollHeight - previewRef.value.clientHeight)
  requestAnimationFrame(() => { syncingScroll = false })
}

function onPreviewScroll() {
  if (syncingScroll || !textareaRef.value || !previewRef.value) return
  syncingScroll = true
  const ratio = previewRef.value.scrollTop / (previewRef.value.scrollHeight - previewRef.value.clientHeight || 1)
  textareaRef.value.scrollTop = ratio * (textareaRef.value.scrollHeight - textareaRef.value.clientHeight)
  requestAnimationFrame(() => { syncingScroll = false })
}

// ── 草稿保护 ──
const draftKey = computed(() => `wiki-draft:${props.slug}`)
const draftSaved = ref(false)
let draftTimer: ReturnType<typeof setTimeout> | null = null

function saveDraft() {
  try {
    localStorage.setItem(draftKey.value, JSON.stringify({
      title: title.value,
      content: content.value,
      ts: Date.now(),
    }))
    draftSaved.value = true
    setTimeout(() => { draftSaved.value = false }, 2000)
  }
  catch {
    // localStorage 不可用
  }
}

function loadDraft(): { title: string; content: string } | null {
  try {
    const raw = localStorage.getItem(draftKey.value)
    if (!raw) return null
    const draft = JSON.parse(raw)
    if (draft && draft.content !== undefined) {
      return { title: draft.title || '', content: draft.content }
    }
  }
  catch {
    // ignore
  }
  return null
}

function clearDraft() {
  try {
    localStorage.removeItem(draftKey.value)
  }
  catch {
    // ignore
  }
}

// 内容变化时自动保存草稿 (debounce 2s)
watch([title, content], () => {
  if (!unlocked.value) return
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(saveDraft, 2000)
})

// 挂载时检查草稿
onMounted(() => {
  const draft = loadDraft()
  if (draft) {
    if (draft.content !== props.initialContent || draft.title !== props.initialTitle) {
      const restore = confirm('检测到未保存的草稿，是否恢复？')
      if (restore) {
        title.value = draft.title
        content.value = draft.content
      }
      else {
        clearDraft()
      }
    }
  }
})

// ── 保存 ──
async function save() {
  if (!title.value.trim()) {
    saveError.value = '请输入标题'
    return
  }

  saving.value = true
  saveError.value = ''
  saveSuccess.value = false

  try {
    const res = await fetch('/api/wiki/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: props.slug,
        title: title.value.trim(),
        content: content.value,
        password: passwordInput.value,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ statusMessage: res.statusText }))
      if (res.status === 401) {
        unlocked.value = false
        passwordInput.value = ''
        lockError.value = '密码错误，请重新输入'
      }
      else {
        saveError.value = (err as any).statusMessage || '保存失败，请重试'
      }
      return
    }

    clearDraft()
    saveSuccess.value = true
    emit('saved')
  }
  catch (e: any) {
    saveError.value = e.message || '网络错误，请检查网络后重试'
  }
  finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* ── 解锁层 ── */
.wiki-editor-lock {
  display: flex;
  justify-content: center;
  padding: 60px 20px;
}

.wiki-editor-lock-card {
  text-align: center;
  max-width: 360px;
  width: 100%;
}

.wiki-editor-lock-card h3 {
  margin: 0 0 16px;
  font-size: 1.1rem;
  color: var(--blog-slate-800);
}

.wiki-password-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--blog-slate-300);
  border-radius: 8px;
  font-size: 15px;
  outline: none;
  box-sizing: border-box;
  background: var(--blog-white);
  color: var(--blog-slate-800);
}

.wiki-password-input:focus {
  border-color: var(--blog-blue-600);
  box-shadow: 0 0 0 3px var(--blog-blue-200-rgb);
}

.wiki-lock-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  justify-content: center;
}

/* ── 工具栏 ── */
.wiki-editor-body {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px);
}

.wiki-editor-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--blog-slate-200);
  background: var(--blog-slate-50);
  flex-wrap: wrap;
}

.wiki-title-input {
  flex: 1;
  min-width: 160px;
  padding: 8px 12px;
  border: 1px solid var(--blog-slate-300);
  border-radius: 6px;
  font-size: 15px;
  font-weight: 600;
  outline: none;
  background: var(--blog-white);
  color: var(--blog-slate-800);
  box-sizing: border-box;
}

.wiki-title-input:focus {
  border-color: var(--blog-blue-600);
}

.wiki-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wiki-draft-indicator {
  font-size: 12px;
  color: var(--blog-slate-500);
}

/* ── 按钮 ── */
.wiki-btn {
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
  transition: opacity 0.15s;
}

.wiki-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wiki-btn-primary {
  background: var(--blog-blue-600);
  color: #fff;
  border-color: var(--blog-blue-600);
}

.wiki-btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.wiki-btn-ghost {
  background: transparent;
  color: var(--blog-slate-700);
  border-color: var(--blog-slate-300);
}

.wiki-btn-ghost:hover {
  background: var(--blog-slate-100);
}

/* ── 消息 ── */
.wiki-error {
  margin: 8px 16px 0;
  color: var(--blog-danger-700);
  font-size: 14px;
}

.wiki-success {
  margin: 8px 16px 0;
  color: #059669;
  font-size: 14px;
}

/* ── 编辑面板 ── */
.wiki-editor-panes {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.wiki-editor-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.wiki-editor-input-pane {
  border-right: 1px solid var(--blog-slate-200);
}

.wiki-pane-label {
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--blog-slate-500);
  background: var(--blog-slate-100);
  border-bottom: 1px solid var(--blog-slate-200);
}

.wiki-textarea {
  flex: 1;
  padding: 16px;
  border: 0;
  outline: none;
  resize: none;
  font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
  background: var(--blog-white);
  color: var(--blog-slate-800);
  box-sizing: border-box;
}

.wiki-preview-content {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
  line-height: 1.8;
  color: var(--blog-slate-800);
  box-sizing: border-box;
}

/* ── 预览内容样式 ── */
.wiki-preview-content :deep(h1) { font-size: 1.6rem; margin: 0 0 16px; }
.wiki-preview-content :deep(h2) { font-size: 1.3rem; margin: 24px 0 12px; }
.wiki-preview-content :deep(h3) { font-size: 1.1rem; margin: 20px 0 8px; }
.wiki-preview-content :deep(p) { margin: 0 0 12px; }
.wiki-preview-content :deep(ul), .wiki-preview-content :deep(ol) { margin: 0 0 12px; padding-left: 24px; }
.wiki-preview-content :deep(li) { margin-bottom: 4px; }
.wiki-preview-content :deep(code) {
  background: var(--blog-slate-100);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
}
.wiki-preview-content :deep(pre) {
  background: var(--blog-code-bg);
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0 0 16px;
}
.wiki-preview-content :deep(pre code) {
  background: none;
  padding: 0;
  color: inherit;
}
.wiki-preview-content :deep(blockquote) {
  border-left: 3px solid var(--blog-blue-400);
  margin: 0 0 12px;
  padding: 4px 16px;
  color: var(--blog-slate-600);
}
.wiki-preview-content :deep(a) {
  color: var(--blog-link);
}
.wiki-preview-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 16px;
}
.wiki-preview-content :deep(th), .wiki-preview-content :deep(td) {
  border: 1px solid var(--blog-slate-200);
  padding: 8px 12px;
  text-align: left;
}
.wiki-preview-content :deep(th) {
  background: var(--blog-slate-50);
  font-weight: 600;
}

/* ── 响应式：移动端上下分屏 ── */
@media (max-width: 768px) {
  .wiki-editor-panes {
    flex-direction: column;
  }

  .wiki-editor-input-pane {
    border-right: none;
    border-bottom: 1px solid var(--blog-slate-200);
    flex: none;
    height: 50%;
  }
}
</style>
