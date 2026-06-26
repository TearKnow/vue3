<template>
  <div>
    <div
      class="wiki-tree-row"
      :class="{ active: isNodeActive }"
      :style="{ paddingLeft: 16 + depth * 16 + 'px' }"
    >
      <span
        class="wiki-tree-toggle"
        :class="{ invisible: !hasChildren }"
        @click="toggle"
      >
        {{ expanded ? '▾' : '▸' }}
      </span>
      <NuxtLink
        v-if="node.isPage"
        :to="node.urlPath"
        class="wiki-tree-link"
        @click="$emit('navigate')"
      >
        {{ node.title || node.name }}
      </NuxtLink>
      <span v-else class="wiki-tree-folder" @click="toggle">
        📁 {{ node.title || node.name }}
      </span>
    </div>
    <div v-if="hasChildren && expanded" class="wiki-tree-children">
      <WikiTreeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        @navigate="$emit('navigate')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface WikiTreeNode {
  name: string
  path: string
  urlPath: string
  title: string
  children: WikiTreeNode[]
  isPage: boolean
}

const props = defineProps<{
  node: WikiTreeNode
  depth?: number
}>()

defineEmits<{
  navigate: []
}>()

const depth = props.depth ?? 0

const route = useRoute()
const expanded = ref(false)
const hasChildren = computed(() => props.node.children.length > 0)

// 如果当前路由包含在这个节点的路径下，自动展开
const isNodeActive = computed(() => {
  return route.path === props.node.urlPath
})

// 自动展开当前页面所在的父级目录
if (hasChildren.value) {
  if (route.path.startsWith(props.node.urlPath + '/')) {
    expanded.value = true
  }
}

function toggle() {
  if (hasChildren.value) {
    expanded.value = !expanded.value
  }
}
</script>

<style scoped>
.wiki-tree-row {
  display: flex;
  align-items: center;
  padding: 5px 16px;
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
  width: 16px;
  font-size: 10px;
  color: var(--blog-slate-500);
  flex-shrink: 0;
  user-select: none;
  text-align: center;
}

.wiki-tree-toggle.invisible {
  visibility: hidden;
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
  user-select: none;
}

.wiki-tree-children {
  /* children indentation handled by parent's paddingLeft */
}
</style>
