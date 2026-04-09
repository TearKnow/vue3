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
          h(NuxtLinkComponent, { to: node.path }, () => node.name),
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
                  h(NuxtLinkComponent, { to: node.path }, () => `打开 ${node.name}`),
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

.route-actions {
  display: flex;
  gap: 12px;
  margin: 12px 0 16px;
}

.route-actions button {
  padding: 6px 12px;
  border: 1px solid #d9dde5;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
}

.route-actions button:hover {
  background: #f7f8fa;
}

.route-tree-list {
  margin: 0;
  padding-left: 20px;
  list-style: none;
}

.route-folder,
.route-file {
  margin: 8px 0;
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
  padding-left: 18px;
  margin-top: 8px;
}

.route-folder-link {
  margin: 8px 0;
}

.route-file {
  list-style: none;
}

.route-file a,
.route-folder-link a {
  color: #2563eb;
  text-decoration: none;
}

.route-file a:hover,
.route-folder-link a:hover {
  text-decoration: underline;
}
</style>
