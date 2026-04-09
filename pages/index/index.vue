<template>
  <div class="page-nav">
    <h2>页面导航</h2>
    <p>新增 `pages` 下的页面后，这里会自动显示在目录树里。</p>

    <div class="route-actions">
      <button type="button" @click="expandAllFolders">
        全部展开
      </button>
      <button type="button" @click="collapseAllFolders">
        全部收起
      </button>
    </div>
    <hr>

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
  children: RouteTreeItem[]
}

const route = useRoute()
const router = useRouter()
const folderExpanded = ref<boolean | undefined>(undefined)

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
          children: [],
        }
        currentLevel.push(node)
      }

      if (index === segments.length - 1) {
        node.path = fullPath
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
    const SelfComponent = resolveComponent('RouteTreeNode')
    const isOpen = ref(props.level === 0)

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
          h(NuxtLinkComponent, {
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
                h(SelfComponent, {
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

.page-nav > .route-tree-list {
  padding-left: 0;
}

.route-actions {
  display: flex;
  gap: 12px;
  margin: 12px 0 16px;
}

.route-actions button {
  padding: 8px 14px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  color: #334155;
  font-weight: 600;
  box-shadow: 0 2px 6px rgb(15 23 42 / 8%);
  transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
}

.route-actions button:first-child {
  background: linear-gradient(180deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #93c5fd;
}

.route-actions button:last-child {
  background: linear-gradient(180deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f5c96a;
}

.route-actions button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgb(15 23 42 / 12%);
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
  cursor: pointer;
  user-select: none;
  list-style: none;
  padding: 4px 0;
}

.route-folder-summary::-webkit-details-marker {
  display: none;
}

.route-folder-name {
  display: inline-block;
  min-width: 96px;
  padding: 6px 12px;
  border-radius: 10px;
  background: #ffe08a;
  border: 1px solid #e7be52;
  box-shadow: 0 2px 6px rgb(0 0 0 / 10%);
  color: #6a4e00;
  font-weight: 600;
  line-height: 1.2;
  font-size: 14px;
}

.route-folder-name::after {
  content: ' [展开]';
  font-size: 12px;
  color: #8b6a12;
}

.route-folder details[open] > .route-folder-summary .route-folder-name::after {
  content: ' [收起]';
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

.route-file a:hover,
.route-folder-link a:hover {
  text-decoration: underline;
}
</style>
