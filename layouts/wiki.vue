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
        <NuxtLink to="/wiki" class="wiki-sidebar-title" @click="sidebarOpen = false">
          Wiki
        </NuxtLink>
        <button
          class="wiki-icon-btn"
          type="button"
          title="新建页面"
          aria-label="新建页面"
          @click="showNewDialog = true"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <!-- 目录树 -->
      <nav class="wiki-tree">
        <!-- 根页面（首页） -->
        <div
          class="wiki-tree-row"
          :class="{ active: route.path === '/wiki' }"
        >
          <span class="wiki-tree-toggle invisible" aria-hidden="true" />
          <NuxtLink
            to="/wiki"
            no-prefetch
            class="wiki-tree-link"
            @click="sidebarOpen = false"
          >
            首页
          </NuxtLink>
        </div>

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
      <slot />
    </main>

    <!-- 新建页面对话框 -->
    <div v-if="showNewDialog" class="wiki-dialog-mask" @click.self="showNewDialog = false">
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
} from '~/composables/useWikiTree'

const route = useRoute()
const sidebarOpen = ref(false)

const { data: wikiPages } = await useAsyncData('wiki-tree', () =>
  queryContent('/wiki').only(['_path', 'title', 'date', 'order']).find(),
)

const { data: wikiOrder } = await useAsyncData('wiki-order', fetchWikiOrderFile)

const tree = computed(() => buildWikiTree(wikiPages.value || [], wikiOrder.value || { groups: {} }))

// ── 新建页面 ──
const showNewDialog = ref(false)
const newTitle = ref('')
const newFolder = ref('')

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
  const cleaned = folder.replace(/^\/+|\/+$/g, '').replace(/\s+/g, '-')
  return cleaned ? cleaned + '/' : ''
})

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
</script>

<style scoped>
/* ── 整体布局 ── */
.wiki-layout {
  --wiki-sidebar-width: 300px;
  --wiki-content-max-width: 960px;
  display: flex;
  min-height: calc(100vh - 60px);
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
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  height: calc(100vh - 60px);
  position: sticky;
  top: 60px;
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
  padding: 18px 12px 18px 16px;
  border-bottom: 1px solid var(--blog-slate-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: var(--blog-overlay-light);
  backdrop-filter: blur(8px);
}

.wiki-sidebar-title {
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--blog-slate-700);
  text-decoration: none;
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
  padding: 6px 0 24px;
}

.wiki-tree-row {
  display: flex;
  align-items: stretch;
  min-height: 34px;
  margin: 2px 10px;
  padding: 0 8px 0 6px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  font-size: 13px;
  border-radius: 8px;
  border-left: 3px solid transparent;
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
  flex-shrink: 0;
  font-size: 11px;
  color: var(--blog-slate-500);
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wiki-tree-toggle.invisible {
  visibility: hidden;
  pointer-events: none;
}

.wiki-tree-link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 6px 0;
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  background: linear-gradient(165deg, var(--wiki-main-gradient-start) 0%, var(--wiki-main-gradient-end) 42%, var(--blog-slate-50) 100%);
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
