<template>
  <div class="wiki-layout">
    <!-- 移动端侧边栏切换 -->
    <button class="wiki-sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
      {{ sidebarOpen ? '✕' : '☰' }}
    </button>

    <!-- 移动端遮罩 -->
    <div v-if="sidebarOpen" class="wiki-sidebar-overlay" @click="sidebarOpen = false" />

    <!-- 侧边栏 -->
    <aside class="wiki-sidebar" :class="{ 'wiki-sidebar--open': sidebarOpen }">
      <div class="wiki-sidebar-header">
        <div class="wiki-sidebar-brand">
          <span class="wiki-sidebar-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </span>
          <div class="wiki-sidebar-brand-text">
            <NuxtLink to="/wiki" class="wiki-sidebar-title" @click="sidebarOpen = false">
              Wiki
            </NuxtLink>
            <p class="wiki-sidebar-subtitle">个人知识库</p>
          </div>
        </div>
        <button
          class="wiki-icon-btn"
          type="button"
          title="新建页面"
          aria-label="新建页面"
          @click="openNewDialog"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <!-- 目录树 -->
      <nav class="wiki-tree" aria-label="Wiki 目录">
        <p class="wiki-tree-section">目录</p>
        <!-- 根页面（首页） -->
        <NuxtLink
          to="/wiki"
          no-prefetch
          class="wiki-tree-row"
          :class="{ active: route.path === '/wiki' }"
          @click="sidebarOpen = false"
        >
          <span class="wiki-tree-toggle invisible" aria-hidden="true" />
          <span class="wiki-tree-link">首页</span>
        </NuxtLink>

        <!-- 子节点 -->
        <WikiTreeItem
          v-for="node in tree"
          :key="node.path"
          :node="node"
          @navigate="sidebarOpen = false"
        />
      </nav>
    </aside>

    <!-- 主内容区 -->
    <main class="wiki-main">
      <div class="wiki-main-inner">
        <slot />
      </div>
    </main>

    <!-- 新建页面对话框 -->
    <div
      v-if="showNewDialog"
      class="wiki-dialog-mask"
      @pointerdown.self="dialogMaskPointerDown = true"
      @pointerup.self="closeDialogFromMask"
      @pointercancel="dialogMaskPointerDown = false"
    >
      <div class="wiki-dialog">
        <h3>新建 Wiki 页面</h3>
        <div class="wiki-dialog-field">
          <label class="wiki-dialog-label">分类目录（可选，如"前端/Vue"）</label>
          <input
            v-model="newFolder"
            class="wiki-input"
            placeholder="留空则放在根目录"
          >
        </div>
        <div class="wiki-dialog-field">
          <label class="wiki-dialog-label">页面标题</label>
          <input
            v-model="newTitle"
            class="wiki-input"
            placeholder="输入页面标题"
            @keyup.enter="createPage"
          >
        </div>
        <p class="wiki-dialog-hint">
          路径预览: /wiki/<b>{{ newFolderPath }}</b><b>{{ generatedSlug }}</b>
          <span class="wiki-dialog-hint-note">（路径会自动转为小写）</span>
        </p>
        <div class="wiki-dialog-actions">
          <button class="wiki-btn wiki-btn-ghost" @click="showNewDialog = false">
            取消
          </button>
          <button class="wiki-btn wiki-btn-primary" :disabled="!newTitle.trim()" @click="createPage">
            创建并编辑
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  buildWikiTree,
  fetchWikiOrderFile,
  filterWikiPages,
} from '~/composables/useWikiTree'
import type { WikiPageMeta } from '~/composables/useWikiTree'
import { normalizeWikiSlug } from '~/utils/wiki-path'

const route = useRoute()
const sidebarOpen = ref(false)

const { data: wikiPages } = await useAsyncData('wiki-tree', () =>
  queryContent('/wiki').only(['_path', 'title', 'date', 'order']).find(),
)

const { data: wikiOrder } = await useAsyncData('wiki-order', fetchWikiOrderFile)

const tree = computed(() => {
  const pages: WikiPageMeta[] = filterWikiPages(wikiPages.value || []).map(page => ({
    _path: page._path,
    title: typeof page.title === 'string' ? page.title : undefined,
    date: typeof page.date === 'string' ? page.date : undefined,
    order: typeof page.order === 'number' ? page.order : undefined,
  }))

  return buildWikiTree(pages, wikiOrder.value || { groups: {} })
})

// ── 新建页面 ──
const showNewDialog = ref(false)
const newTitle = ref('')
const newFolder = ref('')
const dialogMaskPointerDown = ref(false)

const generatedSlug = computed(() => {
  return newTitle.value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w一-鿿-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
})

const newFolderPath = computed(() => {
  const folder = newFolder.value.trim()
  if (!folder) return ''
  const cleaned = normalizeWikiSlug(folder.replace(/\s+/g, '-'))
  return cleaned ? `${cleaned}/` : ''
})

function defaultNewFolderFromRoute(): string {
  if (!route.path.startsWith('/wiki/'))
    return ''

  const rel = route.path.slice('/wiki/'.length)
  if (!rel)
    return ''

  const parts = normalizeWikiSlug(rel).split('/').filter(Boolean)
  if (parts.length === 0)
    return ''

  if (parts.length === 1)
    return parts[0]

  return parts.slice(0, -1).join('/')
}

function openNewDialog() {
  newFolder.value = defaultNewFolderFromRoute()
  newTitle.value = ''
  dialogMaskPointerDown.value = false
  showNewDialog.value = true
}

function createPage() {
  const title = newTitle.value.trim()
  if (!title) return
  const slug = generatedSlug.value || 'untitled'
  const prefix = newFolderPath.value
  showNewDialog.value = false
  newTitle.value = ''
  newFolder.value = ''
  navigateTo(`/wiki/${prefix}${slug}?title=${encodeURIComponent(title)}`)
}

function closeDialogFromMask() {
  if (!dialogMaskPointerDown.value)
    return

  dialogMaskPointerDown.value = false
  showNewDialog.value = false
}
</script>

<style scoped>
/* ── 整体布局 ── */
.wiki-layout {
  --wiki-sidebar-width: 300px;
  --wiki-content-max-width: 960px;
  display: flex;
  align-items: stretch;
  min-height: 100vh;
  background: linear-gradient(165deg, var(--wiki-main-gradient-start) 0%, var(--wiki-main-gradient-end) 42%, var(--blog-slate-50) 100%);
}

/* ── 侧边栏切换按钮（移动端） ── */
.wiki-sidebar-toggle {
  display: none;
  position: fixed;
  bottom: 24px;
  left: 24px;
  z-index: 10001;
  width: 43px;
  height: 43px;
  border-radius: 999px;
  border: 1px solid var(--blog-slate-200);
  background: var(--blog-white);
  color: var(--blog-slate-700);
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 4px 14px var(--blog-shadow-sm);
}

@media (max-width: 768px) {
  .wiki-sidebar-toggle {
    display: grid;
    place-items: center;
  }
}

.wiki-sidebar-overlay {
  display: none;
}

@media (max-width: 768px) {
  .wiki-sidebar-overlay {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--blog-overlay-dark);
  }
}

/* ── 侧边栏 ── */
.wiki-sidebar {
  width: var(--wiki-sidebar-width);
  min-width: var(--wiki-sidebar-width);
  border-right: 1px solid var(--blog-slate-200);
  background: linear-gradient(180deg, var(--blog-white) 0%, var(--wiki-sidebar-gradient-end) 100%);
  box-shadow: 4px 0 24px var(--wiki-sidebar-shadow);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 100vh;
  position: sticky;
  top: 0;
  align-self: stretch;
  z-index: 1;
}

@media (max-width: 768px) {
  .wiki-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    z-index: 10000;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .wiki-sidebar--open {
    transform: translateX(0);
  }
}

.wiki-sidebar-header {
  padding: 16px 12px 16px 14px;
  border-bottom: 1px solid var(--blog-slate-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--blog-overlay-light);
  backdrop-filter: blur(8px);
}

.wiki-sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.wiki-sidebar-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(145deg, var(--blog-blue-50) 0%, var(--blog-white) 100%);
  border: 1px solid var(--blog-blue-100);
  color: var(--blog-blue-700);
  flex-shrink: 0;
}

.wiki-sidebar-brand-text {
  min-width: 0;
}

.wiki-sidebar-title {
  display: block;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--blog-slate-700);
  text-decoration: none;
  line-height: 1.2;
}

.wiki-sidebar-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--blog-slate-500);
  line-height: 1.3;
}

.wiki-sidebar-title:hover {
  color: var(--blog-link);
}

.wiki-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--blog-slate-400);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.wiki-icon-btn:hover {
  color: var(--blog-slate-700);
  background: var(--blog-slate-100);
  border-color: var(--blog-slate-200);
}

/* ── 目录树 ── */
.wiki-tree {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0 24px;
}

.wiki-tree-section {
  margin: 0 16px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--blog-slate-400);
}

.wiki-tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: calc(100% - 20px);
  min-height: 32px;
  margin: 2px 10px;
  padding: 4px 8px 4px 10px;
  border: 0;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  font-size: 13px;
  line-height: 1.35;
  border-radius: 8px;
  border-left: 3px solid transparent;
  text-decoration: none;
  color: inherit;
  background: transparent;
  box-sizing: border-box;
}

.wiki-tree-row:hover {
  background: var(--blog-blue-50);
}

.wiki-tree-row.active {
  background: var(--wiki-card-highlight);
  color: var(--blog-blue-800);
  font-weight: 600;
  border-left-color: var(--wiki-accent-border);
  box-shadow: 0 4px 14px var(--blog-shadow-xs);
}

.wiki-tree-toggle {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.wiki-tree-toggle.invisible {
  visibility: hidden;
  pointer-events: none;
}

.wiki-tree-link {
  flex: 1;
  align-self: stretch;
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 0;
  line-height: 20px;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.wiki-tree-row:focus {
  outline: none;
}

.wiki-tree-row.active:focus-visible,
.wiki-tree-row:focus-visible {
  box-shadow: 0 4px 14px var(--blog-shadow-xs), 0 0 0 2px var(--blog-blue-200);
}

.wiki-tree-folder {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: var(--blog-slate-700);
}

.wiki-tree-children {
  padding: 0;
  margin: 0;
  list-style: none;
}

/* ── 主内容 ── */
.wiki-main {
  position: relative;
  isolation: isolate;
  flex: 1;
  min-width: 0;
  min-height: 100vh;
  overflow-y: auto;
  background: linear-gradient(165deg, var(--wiki-main-gradient-start) 0%, var(--wiki-main-gradient-end) 42%, var(--blog-slate-50) 100%);
}

.wiki-main::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 55% 42% at 8% 0%, var(--wiki-ambient-primary) 0%, transparent 70%),
    radial-gradient(ellipse 48% 38% at 100% 100%, var(--wiki-ambient-secondary) 0%, transparent 72%);
  pointer-events: none;
  z-index: 0;
}

.wiki-main-inner {
  position: relative;
  z-index: 1;
  min-height: 100%;
}

/* ── 新建对话框 ── */
.wiki-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 10002;
  display: grid;
  place-items: center;
  background: var(--blog-overlay-dark);
}

.wiki-dialog {
  background: var(--blog-white);
  border: 1px solid var(--blog-slate-200);
  border-radius: 14px;
  padding: 24px;
  max-width: 420px;
  width: 90vw;
  box-shadow: 0 18px 40px var(--blog-shadow-md);
}

.wiki-dialog h3 {
  margin: 0 0 18px;
  color: var(--blog-slate-800);
  font-size: 1.05rem;
}

.wiki-dialog-field {
  margin-bottom: 14px;
}

.wiki-dialog-label {
  display: block;
  font-size: 13px;
  color: var(--blog-slate-600);
  margin-bottom: 4px;
}

.wiki-input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--blog-slate-300);
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  background: var(--blog-white);
  color: var(--blog-slate-800);
}

.wiki-input:focus {
  border-color: var(--blog-blue-600);
  box-shadow: 0 0 0 3px var(--blog-blue-200-rgb);
}

.wiki-dialog-hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--blog-slate-500);
  word-break: break-all;
}

.wiki-dialog-hint-note {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--blog-slate-400);
}

.wiki-dialog-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

/* ── 按钮复用 ── */
.wiki-btn {
  padding: 7px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: nowrap;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.wiki-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wiki-btn-primary {
  background: var(--blog-slate-800);
  color: var(--blog-white);
  border-color: var(--blog-slate-800);
}

.wiki-btn-primary:hover:not(:disabled) {
  background: var(--blog-slate-700);
  border-color: var(--blog-slate-700);
}

.wiki-btn-ghost {
  background: transparent;
  color: var(--blog-slate-600);
  border-color: var(--blog-slate-200);
}

.wiki-btn-ghost:hover {
  background: var(--blog-slate-50);
  color: var(--blog-slate-800);
}
</style>
