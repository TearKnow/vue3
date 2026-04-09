<template>
  <div class="file-browser-page">
    <div class="file-browser-header">
      <div>
        <NuxtLink class="browser-back-home" to="/">
          返回首页
        </NuxtLink>
        <h2>项目文件浏览器</h2>
        <p>展示 Git 工作区里未被 `.gitignore` 忽略的文件与目录。</p>
      </div>
      <button type="button" class="refresh-button" @click="refreshTree">
        刷新文件树
      </button>
    </div>

    <div class="file-browser-layout">
      <aside class="file-sidebar">
        <div class="file-sidebar-header">
          <div class="file-sidebar-title">
            <span>文件树</span>
            <span class="file-count">{{ treeTotal }} 项</span>
          </div>
          <div class="file-tree-actions">
            <button type="button" @click="expandAllFolders">
              全部展开
            </button>
            <button type="button" @click="collapseAllFolders">
              全部收起
            </button>
          </div>
        </div>

        <div v-if="treePending" class="file-sidebar-empty">
          正在加载文件树...
        </div>
        <div v-else-if="treeErrorText" class="file-sidebar-empty">
          {{ treeErrorText }}
        </div>
        <ul v-else class="file-tree-list">
          <FileTreeNode
            v-for="item in treeItems"
            :key="item.path"
            :node="item"
            :selected-file="selectedFile"
            :expand-all="treeExpanded"
            @select-file="selectFile"
          />
        </ul>
      </aside>

      <main class="file-content-panel">
        <div class="file-content-toolbar">
          <span class="toolbar-dot toolbar-dot-red" />
          <span class="toolbar-dot toolbar-dot-yellow" />
          <span class="toolbar-dot toolbar-dot-green" />
          <span class="file-current-path">{{ selectedFile || '请选择左侧文件' }}</span>
        </div>

        <div v-if="contentPending" class="file-empty">
          正在读取文件内容...
        </div>
        <div v-else-if="contentErrorText" class="file-empty">
          {{ contentErrorText }}
        </div>
        <div v-else-if="highlightedLines.length" class="file-code-shell">
          <div class="file-code">
            <div
              v-for="(line, index) in highlightedLines"
              :key="index"
              class="file-line"
            >
              <span class="file-line-number">{{ index + 1 }}</span>
              <code class="file-line-content" v-html="line" />
            </div>
          </div>
        </div>
        <div v-else class="file-empty">
          点击左侧文件即可查看内容。
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, resolveComponent, watch } from 'vue'

type ProjectTreeNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: ProjectTreeNode[]
}

type FileTreeResponse = {
  items: ProjectTreeNode[]
  total: number
}

type FileContentResponse = {
  file: string
  content: string
}

const route = useRoute()
const router = useRouter()

const {
  data: treeResponse,
  pending: treePending,
  error: treeError,
  refresh: refreshTreeData,
} = await useFetch<FileTreeResponse>('/project-files/tree')

const content = ref('')
const contentPending = ref(false)
const contentErrorText = ref('')
const treeExpanded = ref<boolean | undefined>(undefined)

const treeItems = computed(() => treeResponse.value?.items ?? [])
const treeTotal = computed(() => treeResponse.value?.total ?? 0)
const treeErrorText = computed(() => treeError.value?.message ?? '')
const selectedFile = computed(() => typeof route.query.file === 'string' ? route.query.file : '')

async function selectFile(filePath: string) {
  await router.replace({
    query: {
      ...route.query,
      file: filePath,
    },
  })
}

async function loadFileContent(filePath: string) {
  if (!filePath) {
    content.value = ''
    contentErrorText.value = ''
    return
  }

  contentPending.value = true
  contentErrorText.value = ''

  try {
    const response = await $fetch<FileContentResponse>('/project-files/content', {
      query: { file: filePath },
    })

    content.value = response.content
  }
  catch (error) {
    content.value = ''
    contentErrorText.value = error instanceof Error ? error.message : '读取文件失败'
  }
  finally {
    contentPending.value = false
  }
}

async function refreshTree() {
  await refreshTreeData()
}

function expandAllFolders() {
  treeExpanded.value = true
}

function collapseAllFolders() {
  treeExpanded.value = false
}

watch(selectedFile, async (filePath) => {
  await loadFileContent(filePath)
}, { immediate: true })

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
  output = output.replace(/\b(import|from|const|let|var|function|return|if|else|for|while|await|async|type|interface|new|as|default|export|defineProps|defineEmits|defineModel|computed|ref|reactive|watch|useRoute|useRouter|defineEventHandler)\b/g, '<span class="token-keyword">$1</span>')
  output = output.replace(/\b(true|false|null|undefined)\b/g, '<span class="token-constant">$1</span>')
  output = output.replace(/\b(\d+)\b/g, '<span class="token-number">$1</span>')

  return output.replace(/__TOKEN_(\d+)__/g, (_, index) => placeholders[Number(index)] ?? '')
}

const highlightedLines = computed(() => {
  return content.value
    ? content.value.split('\n').map(line => highlightLine(line || ' '))
    : []
})

const FileTreeNode = defineComponent({
  name: 'FileTreeNode',
  props: {
    node: {
      type: Object,
      required: true,
    },
    selectedFile: {
      type: String,
      default: '',
    },
    expandAll: {
      type: Boolean,
      default: null,
    },
  },
  emits: ['selectFile'],
  setup(props, { emit }) {
    const SelfComponent = resolveComponent('FileTreeNode')
    const isOpen = ref(props.node.path === 'pages')

    watch(
      () => props.expandAll,
      (value) => {
        if (typeof value === 'boolean')
          isOpen.value = value
      },
      { immediate: true },
    )

    return (): ReturnType<typeof h> => {
      const node = props.node as ProjectTreeNode

      if (node.type === 'file') {
        return h('li', { class: 'browser-file-item' }, [
          h('button', {
            type: 'button',
            class: [
              'browser-file-button',
              props.selectedFile === node.path ? 'is-active' : '',
            ],
            onClick: () => emit('selectFile', node.path),
          }, node.name),
        ])
      }

      return h('li', { class: 'browser-folder-item' }, [
        h('details', {
          open: isOpen.value,
          onToggle: (event: Event) => {
            isOpen.value = (event.target as HTMLDetailsElement).open
          },
        }, [
          h('summary', { class: 'browser-folder-summary' }, [
            h('span', { class: 'browser-folder-toggle' }, isOpen.value ? '-' : '+'),
            h('span', { class: 'browser-folder-name' }, node.name),
          ]),
          h(
            'ul',
            { class: 'file-tree-list file-tree-children' },
            (node.children ?? []).map(child =>
              h(SelfComponent, {
                key: child.path,
                node: child,
                selectedFile: props.selectedFile,
                expandAll: props.expandAll,
                onSelectFile: (filePath: string) => emit('selectFile', filePath),
              }),
            ),
          ),
        ]),
      ])
    }
  },
})
</script>

<style>
.file-browser-page {
  min-height: 100vh;
  padding: 24px;
  background: #f8fafc;
}

.file-browser-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.file-browser-header h2 {
  margin: 0 0 8px;
}

.browser-back-home {
  display: inline-block;
  margin-bottom: 12px;
  color: #2563eb;
  text-decoration: none;
  font-weight: 600;
}

.browser-back-home:hover {
  text-decoration: underline;
}

.file-browser-header p {
  margin: 0;
  color: #64748b;
}

.refresh-button {
  padding: 8px 14px;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  background: linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e3a8a;
  font-weight: 600;
  cursor: pointer;
}

.file-browser-layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  min-height: 70vh;
}

.file-sidebar,
.file-content-panel {
  border: 1px solid #dbe3ee;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 6%);
}

.file-sidebar {
  overflow: auto;
  padding: 12px;
}

.file-sidebar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.file-sidebar-title {
  color: #475569;
  font-weight: 600;
}

.file-tree-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.file-tree-actions button {
  padding: 4px 10px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  cursor: pointer;
  font-size: 12px;
}

.file-tree-actions button:hover {
  background: #eef2f7;
}

.file-count {
  color: #94a3b8;
  font-size: 12px;
}

.file-sidebar-empty,
.file-empty {
  padding: 16px;
  color: #64748b;
}

.file-tree-list {
  margin: 0;
  padding-left: 18px;
  list-style: none;
}

.file-browser-page > .file-tree-list {
  padding-left: 0;
}

.browser-folder-item,
.browser-file-item {
  position: relative;
  margin: 4px 0;
  padding-left: 18px;
}

.browser-folder-item::before,
.browser-file-item::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 16px;
  width: 10px;
  height: 1px;
  background: #cbd5e1;
}

.browser-folder-item::after,
.browser-file-item::after {
  content: '';
  position: absolute;
  left: 6px;
  top: -6px;
  bottom: -6px;
  width: 1px;
  background: #cbd5e1;
}

.file-tree-list > .browser-folder-item:last-child::after,
.file-tree-list > .browser-file-item:last-child::after {
  bottom: auto;
  height: 22px;
}

.browser-folder-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  list-style: none;
  padding: 4px 0;
}

.browser-folder-summary::-webkit-details-marker {
  display: none;
}

.browser-folder-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #e2e8f0;
  color: #475569;
  font-weight: 700;
  line-height: 1;
  flex: 0 0 auto;
}

.browser-folder-name {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 8px;
  background: #fef3c7;
  color: #7c5800;
  font-weight: 600;
}

.file-tree-children {
  margin-top: 4px;
}

.browser-file-button {
  border: none;
  background: transparent;
  padding: 4px 0;
  color: #2563eb;
  cursor: pointer;
  text-align: left;
}

.browser-file-button.is-active {
  color: #1d4ed8;
  font-weight: 700;
}

.file-content-panel {
  display: flex;
  flex-direction: column;
  overflow: visible;
  background: #0f172a;
}

.file-content-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #1e293b;
  background: #111827;
}

.toolbar-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.toolbar-dot-red {
  background: #fb7185;
}

.toolbar-dot-yellow {
  background: #fbbf24;
}

.toolbar-dot-green {
  background: #4ade80;
}

.file-current-path {
  margin-left: 8px;
  color: #94a3b8;
  font-size: 13px;
}

.file-code-shell {
  flex: 1;
  overflow: visible;
}

.file-code {
  min-height: 100%;
  padding: 12px 0;
}

.file-line {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
}

.file-line:hover {
  background: rgb(148 163 184 / 8%);
}

.file-line-number {
  padding: 0 12px 0 0;
  color: #64748b;
  text-align: right;
  user-select: none;
  border-right: 1px solid #1e293b;
}

.file-line-content {
  display: block;
  padding: 0 16px;
  color: #e2e8f0;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.file-line-content .token-comment {
  color: #6a9955;
}

.file-line-content .token-string {
  color: #ce9178;
}

.file-line-content .token-keyword {
  color: #c586c0;
}

.file-line-content .token-constant {
  color: #569cd6;
}

.file-line-content .token-number {
  color: #b5cea8;
}

.file-line-content .token-tag {
  color: #569cd6;
}

.file-line-content .token-attr {
  color: #9cdcfe;
}

.file-line-content .token-punctuation {
  color: #d4d4d4;
}

@media (max-width: 900px) {
  .file-browser-layout {
    grid-template-columns: 1fr;
  }
}
</style>
