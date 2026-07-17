<template>
  <div>
    <div
      v-if="isFolderOnly"
      class="wiki-tree-row wiki-tree-row--folder"
      :class="{ 'wiki-tree-row--expanded': expanded }"
      role="button"
      :tabindex="0"
      :aria-expanded="expanded"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <span
        class="wiki-tree-toggle"
        :class="{ 'wiki-tree-toggle--expanded': expanded }"
        aria-hidden="true"
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
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      </span>
      <span class="wiki-tree-folder">
        {{ node.title || node.name }}
      </span>
    </div>

    <NuxtLink
      v-else-if="node.isPage"
      :to="node.urlPath"
      no-prefetch
      class="wiki-tree-row"
      :class="{ active: isNodeActive }"
      @click="$emit('navigate')"
      @pointerenter="prefetchPath(node.urlPath)"
    >
      <span class="wiki-tree-toggle invisible" aria-hidden="true" />
      <span class="wiki-tree-link">
        {{ node.title || node.name }}
      </span>
    </NuxtLink>

    <div
      v-else-if="hasChildren"
      class="wiki-tree-row wiki-tree-row--folder"
      :class="{ 'wiki-tree-row--expanded': expanded }"
      role="button"
      :tabindex="0"
      :aria-expanded="expanded"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <span
        class="wiki-tree-toggle"
        :class="{ 'wiki-tree-toggle--expanded': expanded }"
        aria-hidden="true"
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
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      </span>
      <NuxtLink
        :to="node.urlPath"
        no-prefetch
        class="wiki-tree-link"
        @click.stop="$emit('navigate')"
        @pointerenter="prefetchPath(node.urlPath)"
      >
        {{ node.title || node.name }}
      </NuxtLink>
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
import { computed, ref, watch } from 'vue'
import type { WikiTreeNode } from '~/composables/useWikiTree'
import { useWikiPrefetch } from '~/composables/useWikiPrefetch'

const props = defineProps<{
  node: WikiTreeNode
  depth?: number
}>()

defineEmits<{
  navigate: []
}>()

const { prefetchPath } = useWikiPrefetch()

const depth = props.depth ?? 0

const route = useRoute()
const expanded = ref(false)
const hasChildren = computed(() => props.node.children.length > 0)
const isFolderOnly = computed(() => hasChildren.value && !props.node.isPage)

const isNodeActive = computed(() => route.path === props.node.urlPath)

watch(() => route.path, (path) => {
  if (!hasChildren.value)
    return
  if (path === props.node.urlPath || path.startsWith(`${props.node.urlPath}/`))
    expanded.value = true
}, { immediate: true })

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

.wiki-tree-row--folder .wiki-tree-folder {
  color: var(--blog-slate-700);
  font-weight: 600;
}

.wiki-tree-row--folder:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--blog-blue-200);
}

.wiki-tree-toggle {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--blog-slate-500);
  user-select: none;
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
  align-self: stretch;
  min-width: 0;
  display: flex;
  align-items: center;
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

.wiki-tree-link:focus,
.wiki-tree-row:focus {
  outline: none;
}

.wiki-tree-row.active:focus-visible,
.wiki-tree-row:focus-visible:has(.wiki-tree-link) {
  box-shadow: 0 4px 14px var(--blog-shadow-xs), 0 0 0 2px var(--blog-blue-200);
}

.wiki-tree-folder {
  font-family: inherit;
  font-size: inherit;
  line-height: 20px;
  color: var(--blog-slate-600);
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
