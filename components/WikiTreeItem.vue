<template>
  <div>
    <div
      class="wiki-tree-row"
      :class="{
        active: isNodeActive,
        'wiki-tree-row--folder': isFolderOnly,
      }"
    >
      <button
        type="button"
        class="wiki-tree-toggle"
        :class="{
          invisible: !hasChildren,
          'wiki-tree-toggle--expanded': expanded,
        }"
        :tabindex="hasChildren ? 0 : -1"
        :aria-label="expanded ? '收起' : '展开'"
        :aria-hidden="!hasChildren"
        @click.stop="toggle"
      >
        <svg
          class="wiki-tree-chevron"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.75"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
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

    <div
      v-if="hasChildren"
      class="wiki-tree-children-wrap"
      :class="{ 'wiki-tree-children-wrap--open': expanded }"
      :inert="!expanded || undefined"
      :aria-hidden="!expanded || undefined"
    >
      <div class="wiki-tree-children">
        <WikiTreeItem
          v-for="child in node.children"
          :key="child.path"
          :node="child"
          :depth="depth + 1"
          @navigate="$emit('navigate')"
        />
      </div>
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
  align-items: center;
  gap: 4px;
  min-height: 32px;
  margin: 2px 10px;
  padding: 4px 8px 4px 10px;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  font-size: 13px;
  line-height: 1.35;
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
  height: 20px;
  flex: 0 0 20px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--blog-slate-500);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  transition: background 0.15s ease, color 0.15s ease;
}

.wiki-tree-toggle:hover:not(.invisible) {
  background: var(--blog-slate-100);
  color: var(--blog-slate-700);
}

.wiki-tree-toggle.invisible {
  visibility: hidden;
  pointer-events: none;
}

.wiki-tree-chevron {
  display: block;
  transition: transform 0.24s ease;
  transform-origin: center;
}

.wiki-tree-toggle--expanded .wiki-tree-chevron {
  transform: rotate(90deg);
}

.wiki-tree-link,
.wiki-tree-folder {
  flex: 1;
  min-width: 0;
  display: block;
  padding: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  line-height: 20px;
}

.wiki-tree-link {
  text-decoration: none;
  color: inherit;
}

.wiki-tree-folder {
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  line-height: 20px;
  color: var(--blog-slate-600);
  cursor: pointer;
}

.wiki-tree-children-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.24s ease;
}

.wiki-tree-children-wrap--open {
  grid-template-rows: 1fr;
}

.wiki-tree-children {
  overflow: hidden;
  margin-left: 20px;
  border-left: 1px solid var(--blog-blue-200);
}

@media (prefers-reduced-motion: reduce) {
  .wiki-tree-children-wrap {
    transition: none;
  }

  .wiki-tree-chevron {
    transition: none;
  }
}
</style>
