<template>
  <div ref="rootRef" class="inline-annotations-root">
    <slot />
  </div>

  <Teleport to="body">
    <div
      v-if="toolbarVisible"
      class="annotation-toolbar"
      :style="toolbarStyle"
    >
      <button type="button" class="annotation-toolbar-btn" @click="openCompose">
        添加批注
      </button>
    </div>

    <div
      v-if="composeOpen"
      class="annotation-mask"
      @pointerdown.self="composeMaskDown = true"
      @pointerup.self="closeComposeFromMask"
      @pointercancel="composeMaskDown = false"
    >
      <div class="annotation-dialog" role="dialog" aria-modal="true" aria-label="添加批注" @click.stop>
        <p class="annotation-dialog-label">
          选中内容
        </p>
        <blockquote class="annotation-dialog-quote">
          {{ pendingAnchor?.quote }}
        </blockquote>
        <textarea
          v-model="composeText"
          class="annotation-dialog-input"
          rows="4"
          placeholder="写下你的批注…"
        />
        <div class="annotation-dialog-actions">
          <button type="button" class="annotation-dialog-btn" @click="closeCompose">
            取消
          </button>
          <button
            type="button"
            class="annotation-dialog-btn annotation-dialog-btn--primary"
            :disabled="saving || !composeText.trim()"
            @click="saveAnnotation"
          >
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="hoverCard"
      class="annotation-hover-card"
      :style="hoverCardStyle"
      @mouseenter="cancelHideHoverCard"
      @mouseleave="scheduleHideHoverCard"
    >
      <p class="annotation-hover-text">
        {{ hoverCard.comment }}
      </p>
      <div class="annotation-hover-meta">
        <time :datetime="hoverCard.createdAt">{{ hoverCard.createdAt }}</time>
        <button type="button" class="annotation-hover-delete" @click="deleteAnnotation(hoverCard.id)">
          删除
        </button>
      </div>
    </div>

    <div
      v-if="mobileViewOpen && activeView"
      class="annotation-mask"
      @pointerdown.self="viewMaskDown = true"
      @pointerup.self="closeViewFromMask"
      @pointercancel="viewMaskDown = false"
    >
      <div class="annotation-dialog" role="dialog" aria-modal="true" aria-label="查看批注" @click.stop>
        <blockquote class="annotation-dialog-quote">
          {{ activeView.quote }}
        </blockquote>
        <p class="annotation-view-comment">
          {{ activeView.comment }}
        </p>
        <div class="annotation-hover-meta">
          <time :datetime="activeView.createdAt">{{ activeView.createdAt }}</time>
          <button type="button" class="annotation-hover-delete" @click="deleteAnnotation(activeView.id)">
            删除
          </button>
        </div>
        <div class="annotation-dialog-actions">
          <button type="button" class="annotation-dialog-btn annotation-dialog-btn--primary" @click="mobileViewOpen = false">
            关闭
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  captureSelectionAnchor,
  wrapAnchorHighlight,
} from '~/utils/annotation-anchor'

interface AnnotationItem {
  id: string
  pageKey: string
  quote: string
  prefix: string
  suffix: string
  comment: string
  createdAt: string
}

const props = defineProps<{
  pageKey: string
}>()

const rootRef = ref<HTMLElement | null>(null)
const annotations = ref<AnnotationItem[]>([])
const loaded = ref(false)
const loading = ref(false)
const saving = ref(false)
const toolbarVisible = ref(false)
const toolbarStyle = ref<Record<string, string>>({})
const composeOpen = ref(false)
const composeText = ref('')
const pendingAnchor = ref<{ quote: string, prefix: string, suffix: string } | null>(null)
const composeMaskDown = ref(false)
const viewMaskDown = ref(false)
const hoverCard = ref<AnnotationItem | null>(null)
const hoverCardStyle = ref<Record<string, string>>({})
const activeView = ref<AnnotationItem | null>(null)
const mobileViewOpen = ref(false)
const isCoarsePointer = ref(false)

let containerEl: HTMLElement | null = null
let observer: IntersectionObserver | null = null
let hideHoverTimer: ReturnType<typeof setTimeout> | null = null
let selectionCheckRaf = 0
let selectionCheckTimer: ReturnType<typeof setTimeout> | null = null

const annotationMap = computed(() => {
  const map = new Map<string, AnnotationItem>()
  for (const item of annotations.value)
    map.set(item.id, item)
  return map
})

function getContainer() {
  if (!rootRef.value)
    return null
  return rootRef.value.firstElementChild as HTMLElement | null
}

function stripMarks(container: HTMLElement) {
  container.querySelectorAll('mark.inline-annotation-mark').forEach((mark) => {
    const parent = mark.parentNode
    if (!parent)
      return
    while (mark.firstChild)
      parent.insertBefore(mark.firstChild, mark)
    parent.removeChild(mark)
    if (parent.normalize)
      parent.normalize()
  })
}

function applyHighlights() {
  const container = getContainer()
  if (!container)
    return

  stripMarks(container)

  for (const item of annotations.value)
    wrapAnchorHighlight(container, item, item.id)
}

async function fetchAnnotations() {
  if (!props.pageKey || loading.value || loaded.value)
    return

  loading.value = true
  try {
    const data = await $fetch<{ annotations: AnnotationItem[] }>('/api/annotations', {
      query: { pageKey: props.pageKey },
    })
    annotations.value = data.annotations
    loaded.value = true
    await nextTick()
    applyHighlights()
  }
  catch {
    // 静默失败，不影响阅读
  }
  finally {
    loading.value = false
  }
}

function hideToolbar() {
  toolbarVisible.value = false
}

function cancelSelectionCheck() {
  if (selectionCheckRaf) {
    window.cancelAnimationFrame(selectionCheckRaf)
    selectionCheckRaf = 0
  }
  if (selectionCheckTimer) {
    clearTimeout(selectionCheckTimer)
    selectionCheckTimer = null
  }
}

function updateToolbarFromSelection() {
  const container = getContainer()
  if (!container) {
    hideToolbar()
    return
  }

  const anchor = captureSelectionAnchor(container)
  if (!anchor) {
    if (!composeOpen.value)
      hideToolbar()
    return
  }

  pendingAnchor.value = anchor
  const selection = window.getSelection()
  const range = selection?.rangeCount ? selection.getRangeAt(0) : null
  if (!range) {
    hideToolbar()
    return
  }

  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    hideToolbar()
    return
  }

  const toolbarHeight = 40
  const gap = 8
  const preferredTop = isCoarsePointer.value
    ? rect.top - toolbarHeight - gap
    : rect.bottom + gap

  toolbarStyle.value = {
    position: 'fixed',
    top: `${Math.max(12, Math.min(preferredTop, window.innerHeight - toolbarHeight - 12))}px`,
    left: `${Math.max(12, Math.min(rect.left, window.innerWidth - 120))}px`,
  }
  toolbarVisible.value = true
}

function scheduleSelectionCheck() {
  if (selectionCheckRaf) {
    window.cancelAnimationFrame(selectionCheckRaf)
    selectionCheckRaf = 0
  }

  selectionCheckRaf = window.requestAnimationFrame(() => {
    selectionCheckRaf = window.requestAnimationFrame(() => {
      selectionCheckRaf = 0
      updateToolbarFromSelection()
    })
  })

  if (!isCoarsePointer.value)
    return

  if (selectionCheckTimer)
    clearTimeout(selectionCheckTimer)

  // iOS 选区更新可能略晚于 touchend
  selectionCheckTimer = setTimeout(() => {
    selectionCheckTimer = null
    updateToolbarFromSelection()
  }, 250)
}

function openCompose() {
  if (!pendingAnchor.value)
    return
  composeText.value = ''
  composeOpen.value = true
  hideToolbar()
  window.getSelection()?.removeAllRanges()
}

function closeCompose() {
  composeOpen.value = false
  composeText.value = ''
  pendingAnchor.value = null
}

function closeComposeFromMask() {
  if (composeMaskDown.value) {
    closeCompose()
  }
  composeMaskDown.value = false
}

function closeViewFromMask() {
  if (viewMaskDown.value) {
    mobileViewOpen.value = false
    activeView.value = null
  }
  viewMaskDown.value = false
}

async function saveAnnotation() {
  if (!pendingAnchor.value || !composeText.value.trim())
    return

  saving.value = true
  try {
    const res = await $fetch<{ annotation: AnnotationItem }>('/api/annotations/save', {
      method: 'POST',
      body: {
        pageKey: props.pageKey,
        ...pendingAnchor.value,
        comment: composeText.value.trim(),
      },
    })
    annotations.value = [...annotations.value, res.annotation]
    closeCompose()
    await nextTick()
    applyHighlights()
  }
  catch (error) {
    window.alert(error instanceof Error ? error.message : '保存失败')
  }
  finally {
    saving.value = false
  }
}

async function deleteAnnotation(id: string) {
  if (!window.confirm('确定删除这条批注吗？'))
    return

  try {
    await $fetch('/api/annotations/delete', {
      method: 'POST',
      body: { id },
    })
    annotations.value = annotations.value.filter(item => item.id !== id)
    hoverCard.value = null
    mobileViewOpen.value = false
    activeView.value = null
    await nextTick()
    applyHighlights()
  }
  catch (error) {
    window.alert(error instanceof Error ? error.message : '删除失败')
  }
}

function showHoverCard(target: HTMLElement, item: AnnotationItem) {
  if (isCoarsePointer.value)
    return

  cancelHideHoverCard()
  const rect = target.getBoundingClientRect()
  hoverCard.value = item
  hoverCardStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${Math.max(12, Math.min(rect.left, window.innerWidth - 280))}px`,
  }
}

function hideHoverCard() {
  cancelHideHoverCard()
  hoverCard.value = null
}

function handleScrollCloseHoverCard() {
  if (hoverCard.value)
    hideHoverCard()
  if (isCoarsePointer.value && toolbarVisible.value)
    hideToolbar()
}

function scheduleHideHoverCard() {
  cancelHideHoverCard()
  hideHoverTimer = setTimeout(() => {
    hoverCard.value = null
    hideHoverTimer = null
  }, 200)
}

function cancelHideHoverCard() {
  if (hideHoverTimer) {
    clearTimeout(hideHoverTimer)
    hideHoverTimer = null
  }
}

function handleContainerClick(event: MouseEvent) {
  const target = (event.target as HTMLElement | null)?.closest('mark.inline-annotation-mark') as HTMLElement | null
  if (!target)
    return

  const id = target.dataset.annotationId
  if (!id)
    return

  const item = annotationMap.value.get(id)
  if (!item)
    return

  if (isCoarsePointer.value) {
    activeView.value = item
    mobileViewOpen.value = true
    return
  }

  showHoverCard(target, item)
}

function handleContainerMouseOver(event: MouseEvent) {
  if (isCoarsePointer.value)
    return

  const target = (event.target as HTMLElement | null)?.closest('mark.inline-annotation-mark') as HTMLElement | null
  if (!target)
    return

  const id = target.dataset.annotationId
  const item = id ? annotationMap.value.get(id) : null
  if (item)
    showHoverCard(target, item)
}

function handleContainerMouseOut(event: MouseEvent) {
  if (isCoarsePointer.value)
    return

  const fromMark = (event.target as HTMLElement | null)?.closest('mark.inline-annotation-mark')
  if (!fromMark)
    return

  const related = event.relatedTarget as HTMLElement | null
  if (related?.closest('mark.inline-annotation-mark') || related?.closest('.annotation-hover-card'))
    return

  scheduleHideHoverCard()
}

function handleDocumentMouseUp() {
  scheduleSelectionCheck()
}

function handleSelectionChange() {
  if (!isCoarsePointer.value)
    return
  scheduleSelectionCheck()
}

function handleTouchEnd(event: TouchEvent) {
  if (!isCoarsePointer.value)
    return

  const target = event.target as HTMLElement | null
  if (target?.closest('.annotation-toolbar') || target?.closest('.annotation-dialog'))
    return

  scheduleSelectionCheck()
}

function handleDocumentMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('.annotation-toolbar') || target?.closest('.annotation-dialog'))
    return
  if (!target?.closest('.inline-annotations-root')) {
    if (isCoarsePointer.value)
      scheduleSelectionCheck()
    else
      hideToolbar()
  }
}

function setupObserver() {
  const container = getContainer()
  if (!container || observer)
    return

  containerEl = container
  observer = new IntersectionObserver((entries) => {
    if (entries.some(entry => entry.isIntersecting))
      fetchAnnotations()
  }, { rootMargin: '120px' })

  observer.observe(container)
  containerEl.addEventListener('click', handleContainerClick)
  containerEl.addEventListener('mouseover', handleContainerMouseOver)
  containerEl.addEventListener('mouseout', handleContainerMouseOut)
}

function trySetupObserver(attempt = 0) {
  setupObserver()
  if (!observer && attempt < 20)
    window.requestAnimationFrame(() => trySetupObserver(attempt + 1))
}

onMounted(() => {
  isCoarsePointer.value = window.matchMedia('(hover: none), (pointer: coarse)').matches
  document.addEventListener('mousedown', handleDocumentMouseDown)
  document.addEventListener('mouseup', handleDocumentMouseUp)
  document.addEventListener('selectionchange', handleSelectionChange)
  document.addEventListener('touchend', handleTouchEnd, { passive: true })
  window.addEventListener('scroll', handleScrollCloseHoverCard, { capture: true, passive: true })
  nextTick(() => trySetupObserver())
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentMouseDown)
  document.removeEventListener('mouseup', handleDocumentMouseUp)
  document.removeEventListener('selectionchange', handleSelectionChange)
  document.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('scroll', handleScrollCloseHoverCard, { capture: true })
  cancelSelectionCheck()
  if (containerEl) {
    containerEl.removeEventListener('click', handleContainerClick)
    containerEl.removeEventListener('mouseover', handleContainerMouseOver)
    containerEl.removeEventListener('mouseout', handleContainerMouseOut)
  }
  cancelHideHoverCard()
  observer?.disconnect()
})

watch(() => props.pageKey, () => {
  loaded.value = false
  annotations.value = []
  fetchAnnotations()
})
</script>

<style>
.inline-annotations-root {
  user-select: text;
}

mark.inline-annotation-mark {
  position: relative;
  z-index: 1;
  display: inline;
  background: var(--blog-annotation-bg);
  color: inherit;
  cursor: pointer;
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

/* 覆盖 blog / wiki 的 inline code 背景，批注色优先 */
mark.inline-annotation-mark :is(code) {
  background: transparent !important;
  padding: 0 !important;
  border-radius: 0;
  font-size: inherit;
}

.inline-annotations-root :is(p, li, td, th) code:has(> mark.inline-annotation-mark) {
  background: var(--blog-annotation-bg) !important;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.inline-annotations-root :is(p, li, td, th) code > mark.inline-annotation-mark {
  background: transparent !important;
  padding: 0 !important;
}

.annotation-toolbar {
  position: fixed;
  z-index: 1200;
}

.annotation-toolbar-btn {
  padding: 8px 14px;
  border: 1px solid var(--blog-blue-200);
  border-radius: 8px;
  background: var(--blog-white);
  color: var(--blog-blue-700);
  font-size: 0.82rem;
  font-weight: 600;
  box-shadow: 0 8px 20px var(--blog-shadow-sm);
  cursor: pointer;
  touch-action: manipulation;
}

.annotation-mask {
  position: fixed;
  inset: 0;
  z-index: 1300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--blog-overlay-dark);
}

.annotation-dialog {
  width: min(100%, 420px);
  padding: 18px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 14px;
  background: var(--blog-white);
  box-shadow: 0 16px 40px var(--blog-shadow-md);
}

.annotation-dialog-label {
  margin: 0 0 8px;
  font-size: 0.78rem;
  color: var(--blog-slate-500);
}

.annotation-dialog-quote {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-left: 3px solid var(--blog-annotation-bg);
  border-radius: 0 8px 8px 0;
  background: var(--blog-slate-50);
  color: var(--blog-slate-700);
  font-size: 0.9rem;
}

.annotation-dialog-input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 10px;
  background: var(--blog-white);
  color: var(--blog-slate-800);
  font: inherit;
  resize: vertical;
}

.annotation-dialog-input:focus {
  outline: 2px solid var(--blog-blue-200);
  outline-offset: 1px;
}

.annotation-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.annotation-dialog-btn {
  padding: 8px 14px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 10px;
  background: var(--blog-white);
  color: var(--blog-slate-700);
  font-size: 0.88rem;
  cursor: pointer;
}

.annotation-dialog-btn--primary {
  border-color: var(--blog-blue-200);
  background: var(--blog-blue-50);
  color: var(--blog-blue-700);
  font-weight: 600;
}

.annotation-hover-card {
  position: fixed;
  z-index: 1250;
  width: min(280px, calc(100vw - 24px));
  padding: 12px 14px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 12px;
  background: var(--blog-white);
  box-shadow: 0 12px 28px var(--blog-shadow-sm);
}

.annotation-hover-card::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  height: 8px;
}

.annotation-hover-text {
  margin: 0;
  color: var(--blog-slate-800);
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
}

.annotation-hover-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  font-size: 0.78rem;
  color: var(--blog-slate-500);
}

.annotation-hover-delete {
  padding: 0;
  border: 0;
  background: none;
  color: var(--blog-danger-700);
  cursor: pointer;
}

.annotation-view-comment {
  margin: 0 0 12px;
  color: var(--blog-slate-800);
  line-height: 1.7;
  white-space: pre-wrap;
}
</style>
