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
          📚 Wiki
        </NuxtLink>
        <button class="wiki-btn wiki-btn-primary wiki-new-btn" @click="showNewDialog = true">
          ＋ 新建
        </button>
      </div>

      <!-- 目录树 -->
      <nav class="wiki-tree">
        <!-- 根页面（首页） -->
        <div
          class="wiki-tree-row"
          :class="{ active: route.path === '/wiki' }"
        >
          <NuxtLink to="/wiki" class="wiki-tree-link" @click="sidebarOpen = false">
            🏠 首页
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
          <button class="wiki-btn wiki-btn-primary" :disabled="!newTitle.trim()" @click="createPage">
            创建并编辑
          </button>
          <button class="wiki-btn wiki-btn-ghost" @click="showNewDialog = false">
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const route = useRoute()
const sidebarOpen = ref(false)

// ── 构建目录树 ──
interface WikiTreeNode {
  name: string
  path: string
  urlPath: string
  title: string
  children: WikiTreeNode[]
  isPage: boolean
}

function buildTree(pages: { _path: string, title?: string }[]): WikiTreeNode[] {
  const map = new Map<string, WikiTreeNode>()

  // 为所有路径及其前缀创建节点
  for (const page of pages) {
    const segments = page._path.split('/').filter(Boolean) // ['wiki', 'a', 'b']
    let acc = ''
    for (const seg of segments) {
      acc += '/' + seg
      if (!map.has(acc)) {
        map.set(acc, {
          name: seg,
          path: acc,
          urlPath: acc,
          title: seg,
          children: [],
          isPage: false,
        })
      }
    }
  }

  // 标记有实际页面的节点
  const pageMap = new Map(pages.map(p => [p._path, p]))
  for (const [path, node] of map) {
    const page = pageMap.get(path)
    if (page) {
      node.isPage = true
      if (page.title) node.title = page.title
    }
  }

  // 建立父子关系
  for (const [path, node] of map) {
    const parentPath = path.substring(0, path.lastIndexOf('/'))
    const parent = map.get(parentPath)
    if (parent) {
      parent.children.push(node)
    }
  }

  // 排序：文件夹在前，按名称排序
  const sort = (nodes: WikiTreeNode[]) => {
    nodes.sort((a, b) => {
      const aDir = a.children.length > 0
      const bDir = b.children.length > 0
      if (aDir !== bDir) return aDir ? -1 : 1
      return a.name.localeCompare(b.name, 'zh-CN')
    })
    nodes.forEach(n => sort(n.children))
  }

  const root = map.get('/wiki')
  if (!root) return []
  sort(root.children)
  return root.children
}

const { data: wikiPages } = await useAsyncData('wiki-tree', () =>
  queryContent('/wiki').only(['_path', 'title']).find(),
)

const tree = computed(() => buildTree(wikiPages.value || []))

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
  border: 0;
  background: rgba(15, 23, 42, 0.7);
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  box-shadow: 0 4px 10px var(--blog-shadow-md);
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
    background: rgba(0, 0, 0, 0.35);
  }
}

/* ── 侧边栏 ── */
.wiki-sidebar {
  width: 260px;
  min-width: 260px;
  border-right: 1px solid var(--blog-slate-200);
  background: var(--blog-slate-50);
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
  padding: 16px;
  border-bottom: 1px solid var(--blog-slate-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.wiki-sidebar-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--blog-slate-900);
  text-decoration: none;
}

.wiki-sidebar-title:hover {
  color: var(--blog-blue-600);
}

.wiki-new-btn {
  font-size: 12px;
  padding: 5px 12px;
}

/* ── 目录树 ── */
.wiki-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0 24px;
}

.wiki-tree-row {
  display: flex;
  align-items: center;
  padding: 6px 16px;
  cursor: pointer;
  transition: background 0.1s;
  font-size: 14px;
}

.wiki-tree-row:hover {
  background: var(--blog-slate-100);
}

.wiki-tree-row.active {
  background: var(--blog-blue-100);
  color: var(--blog-blue-700);
  font-weight: 600;
}

.wiki-tree-toggle {
  width: 18px;
  font-size: 11px;
  color: var(--blog-slate-500);
  flex-shrink: 0;
  user-select: none;
}

.wiki-tree-link {
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
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
}

/* ── 新建对话框 ── */
.wiki-dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 10002;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.35);
}

.wiki-dialog {
  background: var(--blog-white);
  border-radius: 12px;
  padding: 24px;
  max-width: 420px;
  width: 90vw;
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
</style>
