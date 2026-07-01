<template>
  <div>
    <div
      class="wiki-tree-row"
      :class="{
        active: isNodeActive,
        'wiki-tree-row--folder': isFolderOnly,
      }"
      :style="{ paddingLeft: 16 + depth * 14 + 'px' }"
    >
      <button
        type="button"
        class="wiki-tree-toggle"
        :class="{ invisible: !hasChildren }"
        :tabindex="hasChildren ? 0 : -1"
        :aria-label="expanded ? '收起' : '展开'"
        :aria-hidden="!hasChildren"
        @click.stop="toggle"
      >
        {{ expanded ? '▾' : '▸' }}
      </button>

      <NuxtLink
        v-if="node.isPage"
        :to="node.urlPath"
        no-prefetch
        class="wiki-tree-link"
        @click="$emit('navigate')"
      >
        {{ node.title || node.name }}
      </NuxtLink>
      <button
        v-else
        type="button"
        class="wiki-tree-folder"
        @click="toggle"
      >
        {{ node.title || node.name }}
      </button>
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
import type { WikiTreeNode } from '~/composables/useWikiTree'

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
const isFolderOnly = computed(() => hasChildren.value && !props.node.isPage)

const isNodeActive = computed(() => route.path === props.node.urlPath)

if (hasChildren.value) {
  if (route.path === props.node.urlPath || route.path.startsWith(`${props.node.urlPath}/`)) {
    expanded.value = true
  }
}

function toggle() {
  if (hasChildren.value)
    expanded.value = !expanded.value
}
</script>

<style scoped>
.wiki-tree-row {
  display: flex;
  align-items: stretch;
  min-height: 34px;
  margin: 2px 10px 2px 0;
  padding: 0 8px 0 0;
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

.wiki-tree-row--folder .wiki-tree-folder {
  color: var(--blog-slate-700);
  font-weight: 600;
}

.wiki-tree-toggle {
  width: 20px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 10px;
  color: var(--blog-slate-500);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.wiki-tree-toggle.invisible {
  visibility: hidden;
  pointer-events: none;
}

.wiki-tree-link,
.wiki-tree-folder {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  padding: 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.wiki-tree-link {
  text-decoration: none;
  color: inherit;
}

.wiki-tree-folder {
  border: 0;
  background: transparent;
  font: inherit;
  color: var(--blog-slate-600);
  cursor: pointer;
}

.wiki-tree-children {
  border-left: 1px solid var(--blog-blue-200);
  margin-left: 18px;
}
</style>
