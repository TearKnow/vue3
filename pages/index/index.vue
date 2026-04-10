<template>
  <div class="page-nav">
    <div class="page-header">
      <h2>页面导航</h2>
    </div>
    <p>新增 `pages` 下的页面后，这里会自动显示在目录树里。（此页面由AI生成）</p>

    <div class="action-panels">
      <div class="action-group">
        <h3 class="action-group-title">快捷入口</h3>
        <div class="action-group-body">
          <NuxtLink class="action-card card-blog" to="/blog">
            <span class="action-icon">✍</span>
            <span class="action-label">博客</span>
          </NuxtLink>
          <NuxtLink class="action-card card-browser" to="/file-browser" target="_blank" rel="noopener noreferrer">
            <span class="action-icon">📂</span>
            <span class="action-label">文件浏览器</span>
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="tree-toolbar">
      <span class="tree-toolbar-label">目录树</span>
      <div class="tree-toolbar-actions">
        <button type="button" class="tree-btn btn-expand" @click="expandAllFolders">
          全部展开
        </button>
        <button type="button" class="tree-btn btn-collapse" @click="collapseAllFolders">
          全部收起
        </button>
      </div>
    </div>

    <ul class="route-tree-list">
      <RouteTreeNode
        v-for="item in routeTree"
        :key="`${item.name}-${item.path || 'folder'}`"
        :node="item"
        :level="0"
        :expand-all="folderExpanded"
      />
    </ul>
  </div>
</template>

<script lang="ts" setup>
import { computed, defineComponent, h, ref, resolveComponent, watch } from 'vue'

type RouteTreeItem = {
  name: string
  path: string | null
  disabled: boolean
  children: RouteTreeItem[]
}

const route = useRoute()
const router = useRouter()
const folderExpanded = ref<boolean | undefined>(undefined)
const pageSources = import.meta.glob('../**/*.vue', {
  eager: true,
  import: 'default',
  query: '?raw',
}) as Record<string, string>

function normalizePageFilePath(filePath: string) {
  return filePath
    .replace(/\\/g, '/')
    .replace(/^.*\/pages\//, '')
    .replace(/^\.\.\//, '')
}

function normalizeRoutePath(filePath: string) {
  const relativePath = normalizePageFilePath(filePath)
    .replace(/\.vue$/, '')

  const routePath = `/${relativePath}`.replace(/\/index$/, '') || '/'
  return routePath
}

function resolveImportedFilePath(filePath: string, importPath: string) {
  const normalizedFilePath = filePath.replace(/\\/g, '/')
  const baseDir = normalizedFilePath.slice(0, normalizedFilePath.lastIndexOf('/'))
  const resolvedParts = `${baseDir}/${importPath}`.split('/')
  const normalizedParts: string[] = []

  resolvedParts.forEach((part) => {
    if (!part || part === '.')
      return
    if (part === '..') {
      normalizedParts.pop()
      return
    }
    normalizedParts.push(part)
  })

  return normalizedParts.join('/')
}

const disabledRoutePaths = computed(() => {
  const importedPaths = new Set<string>()
  const vueImportRE = /import\s+.+?\s+from\s+['"](\.{1,2}\/[^'"]+\.vue)['"]/g

  Object.entries(pageSources).forEach(([filePath, source]) => {
    const matches = source.matchAll(vueImportRE)

    for (const match of matches) {
      const importPath = match[1]
      const resolvedFilePath = resolveImportedFilePath(filePath, importPath)
      importedPaths.add(normalizeRoutePath(resolvedFilePath))
    }
  })

  return importedPaths
})

function expandAllFolders() {
  folderExpanded.value = true
}

function collapseAllFolders() {
  folderExpanded.value = false
}

function sortTree(items: RouteTreeItem[]) {
  items.sort((a, b) => {
    if (a.children.length && !b.children.length) return -1
    if (!a.children.length && b.children.length) return 1
    return a.name.localeCompare(b.name)
  })

  items.forEach(item => sortTree(item.children))
}

function buildRouteTree(paths: string[]) {
  const root: RouteTreeItem[] = []

  paths.forEach((fullPath) => {
    const segments = fullPath.split('/').filter(Boolean)
    let currentLevel = root
    let currentPath = ''

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`
      let node = currentLevel.find(item => item.name === segment)

      if (!node) {
        node = {
          name: segment,
          path: null,
          disabled: false,
          children: [],
        }
        currentLevel.push(node)
      }

      if (index === segments.length - 1) {
        node.path = fullPath
        node.disabled = disabledRoutePaths.value.has(fullPath)
      }

      currentLevel = node.children
    })
  })

  sortTree(root)
  return root
}

const routeTree = computed(() => {
  const paths = router.getRoutes()
    .filter(item => item.path !== route.path)
    .filter(item => item.path !== '/')
    .filter(item => item.path !== '/source-view')
    .filter(item => !item.path.includes(':'))
    .filter(item => !item.path.startsWith('/_'))
    .sort((a, b) => a.path.localeCompare(b.path))
    .map(item => item.path)

  return buildRouteTree(paths)
})

const RouteTreeNode = defineComponent({
  name: 'RouteTreeNode',
  props: {
    node: {
      type: Object,
      required: true,
    },
    level: {
      type: Number,
      default: 0,
    },
    expandAll: {
      type: Boolean,
      default: null,
    },
  },
  setup(props) {
    const NuxtLinkComponent = resolveComponent('NuxtLink')
    const isOpen = ref(props.level < 2)

    watch(
      () => props.expandAll,
      (value) => {
        if (typeof value === 'boolean')
          isOpen.value = value
      },
      { immediate: true },
    )

    return (): ReturnType<typeof h> => {
      const node = props.node as RouteTreeItem
      const isFolder = node.children.length > 0

      if (!isFolder) {
        return h('li', { class: 'route-file' }, [
          node.disabled
            ? h('span', {
                class: 'route-file-text route-file-text-disabled',
                title: '该文件被其他页面作为子组件引用，不提供直接跳转',
              }, node.name)
            : h(NuxtLinkComponent, {
                to: node.path,
                target: '_blank',
                rel: 'noopener noreferrer',
              }, () => node.name),
        ])
      }

      return h('li', { class: 'route-folder' }, [
        h('details', {
          open: isOpen.value,
          onToggle: (event: Event) => {
            isOpen.value = (event.target as HTMLDetailsElement).open
          },
        }, [
          h('summary', { class: 'route-folder-summary' }, [
            h('span', { class: 'route-folder-toggle' }, isOpen.value ? '-' : '+'),
            h('span', { class: 'route-folder-name' }, node.name),
          ]),
          h('div', { class: 'route-folder-content' }, [
            node.path
              ? h('div', { class: 'route-folder-link' }, [
                  h(NuxtLinkComponent, {
                    to: node.path,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  }, () => `打开 ${node.name}`),
                ])
              : null,
            h(
              'ul',
              { class: 'route-tree-list' },
              node.children.map(child =>
                h(RouteTreeNode, {
                  key: `${child.name}-${child.path || 'folder'}`,
                  node: child,
                  level: props.level + 1,
                  expandAll: props.expandAll,
                }),
              ),
            ),
          ]),
        ]),
      ])
    }
  },
})
</script>

<style>
.page-nav {
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header h2 {
  margin: 0;
}

.page-nav > .route-tree-list {
  padding-left: 0;
}

.action-panels {
  margin: 16px 0 20px;
}

.action-group {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 4px 12px rgb(15 23 42 / 5%);
  overflow: hidden;
}

.action-group-title {
  margin: 0;
  padding: 10px 16px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.action-group-body {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
}

.action-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 10px;
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  text-decoration: none;
  font-size: inherit;
  font-weight: 600;
  box-shadow: 0 2px 6px rgb(15 23 42 / 6%);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgb(15 23 42 / 10%);
}

.action-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.action-label {
  font-size: 0.85rem;
  white-space: nowrap;
}

.card-blog {
  background: linear-gradient(180deg, #d1fae5 0%, #a7f3d0 100%);
  border-color: #6ee7b7;
  color: #065f46;
}

.card-browser {
  background: linear-gradient(180deg, #ede9fe 0%, #ddd6fe 100%);
  border-color: #c7b5ff;
  color: #5b21b6;
}

.tree-btn {
  padding: 6px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.tree-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgb(15 23 42 / 10%);
}

.btn-expand {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1e40af;
}

.btn-collapse {
  background: #fef3c7;
  border-color: #f5c96a;
  color: #92400e;
}

.tree-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.tree-toolbar-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #64748b;
}

.tree-toolbar-actions {
  display: flex;
  gap: 8px;
}

.route-tree-list {
  margin: 0;
  padding-left: 18px;
  list-style: none;
}

.route-folder,
.route-file {
  position: relative;
  margin: 6px 0;
  padding-left: 22px;
}

.route-folder::before,
.route-file::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 17px;
  width: 10px;
  height: 1px;
  background: #d7dde6;
}

.route-folder::after,
.route-file::after {
  content: '';
  position: absolute;
  left: 8px;
  top: -8px;
  bottom: -8px;
  width: 1px;
  background: #d7dde6;
}

.page-nav > .route-tree-list > .route-folder,
.page-nav > .route-tree-list > .route-file {
  padding-left: 0;
}

.page-nav > .route-tree-list > .route-folder::before,
.page-nav > .route-tree-list > .route-folder::after,
.page-nav > .route-tree-list > .route-file::before,
.page-nav > .route-tree-list > .route-file::after {
  display: none;
}

.route-tree-list > .route-folder:last-child::after,
.route-tree-list > .route-file:last-child::after {
  bottom: auto;
  height: 26px;
}

.route-folder-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  list-style: none;
  padding: 4px 0;
}

.route-folder-summary::-webkit-details-marker {
  display: none;
}

.route-folder-toggle {
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

.route-folder-name {
  display: inline-block;
  padding: 5px 10px;
  border-radius: 8px;
  background: #fef3c7;
  color: #7c5800;
  font-weight: 600;
  line-height: 1.2;
  font-size: 14px;
}

.route-folder-content {
  margin-top: 6px;
  padding-left: 0;
  border-left: none;
}

.route-folder-link {
  position: relative;
  margin: 4px 0 6px 22px;
}

.route-folder-link::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 12px;
  width: 10px;
  height: 1px;
  background: #d7dde6;
}

.route-file {
  list-style: none;
}

.route-file a,
.route-folder-link a {
  display: inline-block;
  color: #2563eb;
  text-decoration: none;
  line-height: 1.6;
}

.route-file-link-disabled {
  color: #64748b;
  text-decoration: line-through;
}

.route-file-text {
  display: inline-block;
  line-height: 1.6;
}

.route-file-text-disabled {
  color: #94a3b8;
  text-decoration: line-through;
  cursor: not-allowed;
}

.route-file a:hover,
.route-folder-link a:hover {
  text-decoration: underline;
}
</style>
