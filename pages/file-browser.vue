<template>
  <div class="file-browser-page">
    <div class="file-browser-header">
      <div>
        <NuxtLink
          class="browser-back-home"
          to="/"
        >
          返回首页
        </NuxtLink>
        <h2>项目文件浏览器</h2>
        <p>展示 Git 工作区里未被 `.gitignore` 忽略的文件与目录。</p>
      </div>
    </div>

    <div
      ref="layoutRef"
      class="file-browser-layout"
    >
      <div
        class="file-sidebar-wrap"
        :style="{ width: `${sidebarWidth}px` }"
      >
        <aside class="file-sidebar">
          <div class="file-sidebar-header">
            <div class="file-sidebar-title">
              <span>文件树</span>
              <span class="file-count">{{ visibleFileCount }} / {{ treeTotal }} 个文件</span>
            </div>
            <div class="file-tree-actions">
              <button
                type="button"
                class="locate-file-btn"
                title="定位当前文件"
                :disabled="!selectedFile"
                @click="locateSelectedFile"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="8"
                  />
                  <line
                    x1="12"
                    y1="2"
                    x2="12"
                    y2="6"
                  />
                  <line
                    x1="12"
                    y1="18"
                    x2="12"
                    y2="22"
                  />
                  <line
                    x1="2"
                    y1="12"
                    x2="6"
                    y2="12"
                  />
                  <line
                    x1="18"
                    y1="12"
                    x2="22"
                    y2="12"
                  />
                </svg>
              </button>
              <button
                type="button"
                @click="expandAllFolders"
              >
                全部展开
              </button>
              <button
                type="button"
                @click="collapseAllFolders"
              >
                全部收起
              </button>
            </div>
          </div>

          <div class="file-search-box">
            <input
              v-model.trim="searchTerm"
              type="text"
              class="file-search-input"
              placeholder="搜索文件或目录"
            >
          </div>

          <div
            v-if="treePending"
            class="file-sidebar-empty"
          >
            正在加载文件树...
          </div>
          <div
            v-else-if="treeErrorText"
            class="file-sidebar-empty"
          >
            {{ treeErrorText }}
          </div>
          <div
            v-else-if="!displayTreeItems.length"
            class="file-sidebar-empty"
          >
            未找到匹配的文件或目录。
          </div>
          <ul
            v-else
            class="file-tree-list"
          >
            <FileTreeNode
              v-for="item in displayTreeItems"
              :key="item.path"
              :node="item"
              :selected-file="selectedFile"
              :expand-all="treeExpanded"
              :search-keyword="searchTerm"
              :locate-key="locateKey"
              @select-file="selectFile"
            />
          </ul>
        </aside>
        <div
          class="file-sidebar-resizer"
          @pointerdown="startResize"
        />
      </div>

      <main
        ref="contentPanelRef"
        class="file-content-panel"
      >
        <div class="file-content-toolbar">
          <span class="toolbar-dot toolbar-dot-red" />
          <span class="toolbar-dot toolbar-dot-yellow" />
          <span class="toolbar-dot toolbar-dot-green" />
          <span class="file-current-path">{{ selectedFile || '请选择左侧文件' }}</span>
        </div>

        <div
          v-if="selectedFile"
          class="mobile-file-nav"
        >
          <button
            type="button"
            class="mobile-file-nav-btn"
            :disabled="!prevFile"
            @click="goToPrevFile"
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><polyline points="15 18 9 12 15 6" /></svg>
            {{ prevFile ? prevFile.split('/').pop() : '无' }}
          </button>
          <span class="mobile-file-nav-pos">{{ currentFileIndex + 1 }}/{{ flatFileList.length }}</span>
          <button
            type="button"
            class="mobile-file-nav-btn"
            :disabled="!nextFile"
            @click="goToNextFile"
          >
            {{ nextFile ? nextFile.split('/').pop() : '无' }}
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            ><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        <div
          v-if="contentPending"
          class="file-empty"
        >
          正在读取文件内容...
        </div>
        <div
          v-else-if="contentErrorText"
          class="file-empty"
        >
          {{ contentErrorText }}
        </div>
        <div
          v-else-if="highlightedLines.length"
          class="file-code-shell"
        >
          <div class="file-code">
            <div
              v-for="(line, index) in highlightedLines"
              :key="index"
              class="file-line"
            >
              <span class="file-line-number">{{ index + 1 }}</span>
              <code
                class="file-line-content"
                v-html="line"
              />
            </div>
          </div>
        </div>
        <div
          v-else
          class="file-empty"
        >
          点击左侧文件即可查看内容。
        </div>
      </main>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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
} = await useFetch<FileTreeResponse>('/project-files/tree')

const content = ref('')
const contentPending = ref(false)
const contentErrorText = ref('')
const contentPanelRef = ref<HTMLElement | null>(null)
const treeExpanded = ref<boolean | undefined>(undefined)
const locateKey = ref(0)
const searchTerm = ref('')
const layoutRef = ref<HTMLElement | null>(null)
const sidebarWidthCookie = useCookie<string>('file-browser-sidebar-width', {
  default: () => '320',
})

const SIDEBAR_MIN_WIDTH = 260
const SIDEBAR_DEFAULT_WIDTH = 320
const SIDEBAR_MAX_RATIO = 0.6

function clampSidebarWidth(width: number) {
  if (typeof window === 'undefined')
    return Math.max(SIDEBAR_MIN_WIDTH, width)

  const maxWidth = Math.max(SIDEBAR_MIN_WIDTH, Math.floor(window.innerWidth * SIDEBAR_MAX_RATIO))
  return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), maxWidth)
}

function parseSidebarWidth(value: string | undefined) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? clampSidebarWidth(parsed) : SIDEBAR_DEFAULT_WIDTH
}

const sidebarWidth = ref(parseSidebarWidth(sidebarWidthCookie.value))
let resizeStartLeft = 0

function syncSidebarWidthCookie() {
  sidebarWidthCookie.value = String(Math.round(sidebarWidth.value))
}

function handlePointerMove(event: PointerEvent) {
  sidebarWidth.value = clampSidebarWidth(event.clientX - resizeStartLeft)
  syncSidebarWidthCookie()
}

function stopResize() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', stopResize)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

function startResize(event: PointerEvent) {
  resizeStartLeft = layoutRef.value?.getBoundingClientRect().left ?? 0
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', stopResize)
  event.preventDefault()
}

function handleWindowResize() {
  sidebarWidth.value = clampSidebarWidth(parseSidebarWidth(sidebarWidthCookie.value))
}

function isMobileLayout() {
  return window.innerWidth <= 900
}

function scrollToContentPanel() {
  if (!isMobileLayout() || !contentPanelRef.value)
    return
  nextTick(() => {
    contentPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

onMounted(() => {
  handleWindowResize()
  window.addEventListener('resize', handleWindowResize)
})

onBeforeUnmount(() => {
  stopResize()
  window.removeEventListener('resize', handleWindowResize)
})

const treeItems = computed(() => treeResponse.value?.items ?? [])
const treeTotal = computed(() => treeResponse.value?.total ?? 0)
const treeErrorText = computed(() => treeError.value?.message ?? '')
const selectedFile = computed(() => typeof route.query.file === 'string' ? route.query.file : '')

function filterTree(nodes: ProjectTreeNode[], keyword: string): ProjectTreeNode[] {
  const normalizedKeyword = keyword.trim().toLowerCase()

  if (!normalizedKeyword)
    return nodes

  return nodes.flatMap((node) => {
    const matchesSelf = node.name.toLowerCase().includes(normalizedKeyword)
      || node.path.toLowerCase().includes(normalizedKeyword)

    if (node.type === 'file')
      return matchesSelf ? [node] : []

    const filteredChildren = filterTree(node.children ?? [], normalizedKeyword)

    if (!matchesSelf && !filteredChildren.length)
      return []

    return [{
      ...node,
      children: filteredChildren,
    }]
  })
}

function countFiles(nodes: ProjectTreeNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === 'file')
      return count + 1
    return count + countFiles(node.children ?? [])
  }, 0)
}

const displayTreeItems = computed(() => {
  return filterTree(treeItems.value, searchTerm.value)
})

const visibleFileCount = computed(() => {
  return countFiles(displayTreeItems.value)
})

function flattenFiles(nodes: ProjectTreeNode[]): string[] {
  return nodes.flatMap((node) => {
    if (node.type === 'file')
      return [node.path]
    return flattenFiles(node.children ?? [])
  })
}

const flatFileList = computed(() => flattenFiles(displayTreeItems.value))

const currentFileIndex = computed(() => {
  if (!selectedFile.value)
    return -1
  return flatFileList.value.indexOf(selectedFile.value)
})

const prevFile = computed(() => {
  const idx = currentFileIndex.value
  return idx > 0 ? flatFileList.value[idx - 1] : null
})

const nextFile = computed(() => {
  const idx = currentFileIndex.value
  const list = flatFileList.value
  return idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null
})

function goToPrevFile() {
  if (prevFile.value)
    selectFile(prevFile.value)
}

function goToNextFile() {
  if (nextFile.value)
    selectFile(nextFile.value)
}

async function selectFile(filePath: string) {
  await router.replace({
    query: {
      ...route.query,
      file: filePath,
    },
  })
  scrollToContentPanel()
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

function expandAllFolders() {
  treeExpanded.value = true
}

function collapseAllFolders() {
  treeExpanded.value = false
}

async function locateSelectedFile() {
  if (!selectedFile.value)
    return
  locateKey.value++
  await nextTick()
  await nextTick()
  document.querySelector('.browser-file-button.is-active')
    ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
    searchKeyword: {
      type: String,
      default: '',
    },
    locateKey: {
      type: Number,
      default: 0,
    },
  },
  emits: ['selectFile'],
  setup(props, { emit }) {
    const isAncestorOfSelected = (filePath: string) =>
      !!filePath && filePath.startsWith(props.node.path + '/')

    const isOpen = ref(
      props.node.path === 'pages' || isAncestorOfSelected(props.selectedFile),
    )

    watch(
      () => props.expandAll,
      (value) => {
        if (typeof value === 'boolean')
          isOpen.value = value
      },
      { immediate: true },
    )

    watch(
      () => props.searchKeyword,
      (value) => {
        if (value.trim())
          isOpen.value = true
      },
      { immediate: true },
    )

    watch(
      () => props.selectedFile,
      (filePath) => {
        if (isAncestorOfSelected(filePath))
          isOpen.value = true
      },
    )

    watch(
      () => props.locateKey,
      () => {
        if (isAncestorOfSelected(props.selectedFile))
          isOpen.value = true
      },
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
              h(FileTreeNode, {
                key: child.path,
                node: child,
                selectedFile: props.selectedFile,
                expandAll: props.expandAll,
                searchKeyword: props.searchKeyword,
                locateKey: props.locateKey,
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

.file-browser-layout {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  min-height: 70vh;
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

.file-sidebar-wrap {
  position: relative;
  flex: 0 0 auto;
  min-width: 0;
  box-sizing: border-box;
}

.file-sidebar,
.file-content-panel {
  border: 1px solid #dbe3ee;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 8px 24px rgb(15 23 42 / 6%);
  box-sizing: border-box;
}

.file-sidebar {
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 12px;
}

.file-sidebar-resizer {
  position: absolute;
  top: 0;
  right: -9px;
  bottom: 0;
  width: 7px;
  cursor: col-resize;
  transition: background 0.15s ease;
  z-index: 2;
}

.file-sidebar-resizer::before {
  display: none;
}

.file-sidebar-resizer:hover {
  background: rgb(51 65 85 / 16%);
}

.file-sidebar-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.file-sidebar-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #475569;
  font-weight: 600;
}

.file-tree-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-right: 12px;
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

.file-tree-actions button:hover:not(:disabled) {
  background: #eef2f7;
}

.file-tree-actions button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.locate-file-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
}

.locate-file-btn svg {
  flex-shrink: 0;
}

.file-search-box {
  margin-bottom: 18px;
}

.file-search-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #dbe3ee;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  outline: none;
  box-sizing: border-box;
}

.file-search-input:focus {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgb(147 197 253 / 20%);
}

.file-count {
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.4;
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
  overflow-wrap: anywhere;
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
  max-width: 100%;
  overflow-wrap: anywhere;
}

.browser-file-button.is-active {
  color: #1d4ed8;
  font-weight: 700;
}

.file-content-panel {
  flex: 1;
  min-width: 0;
  min-height: 70vh;
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

.mobile-file-nav {
  display: none;
}

@media (max-width: 900px) {
  .file-browser-layout {
    display: block;
  }

  .file-sidebar {
    width: auto;
    margin-bottom: 16px;
  }

  .file-sidebar-wrap {
    width: 100% !important;
  }

  .file-sidebar-resizer {
    display: none;
  }

  .mobile-file-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0;
    border-bottom: 1px solid #1e293b;
    background: #111827;
  }

  .mobile-file-nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: none;
    background: none;
    color: #93c5fd;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 50%;
  }

  .mobile-file-nav-btn svg {
    flex-shrink: 0;
  }

  .mobile-file-nav-btn:active:not(:disabled) {
    background: rgb(37 99 235 / 15%);
  }

  .mobile-file-nav-btn:disabled {
    color: #334155;
    cursor: not-allowed;
  }

  .mobile-file-nav-pos {
    color: #64748b;
    font-size: 12px;
    flex-shrink: 0;
  }
}
</style>
