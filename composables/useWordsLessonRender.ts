import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

/** 每帧挂载词表的课数（课节标题先全部挂载，避免滚动条随高度增长而缩短） */
const LESSONS_PER_FRAME = 3
const INSTANT_LESSON_THRESHOLD = 20

/** 与 .words-grid 列宽配套的保守预估，用于未挂词表前占位高度 */
const WORD_CARD_ROW_PX = 118
const WORD_GRID_GAP_PX = 10
/** 偏保守（按单列估高），避免占位不足时滚动条再次变短 */
const WORD_GRID_COLS_ESTIMATE = 1

export function estimateWordsGridMinHeight(wordCount: number): string | undefined {
  if (wordCount <= 0) return undefined
  const rows = Math.ceil(wordCount / WORD_GRID_COLS_ESTIMATE)
  const h = rows * WORD_CARD_ROW_PX + Math.max(0, rows - 1) * WORD_GRID_GAP_PX
  return `${h}px`
}

export function useWordsLessonRender(
  lessonOrder: ComputedRef<number[]>,
  restorePending: Ref<boolean>,
  targetLesson: Ref<string>,
) {
  const renderedCount = ref(0)
  let generation = 0
  let rafId = 0

  function cancelPump() {
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
  }

  function bumpRenderGeneration() {
    generation++
    cancelPump()
    renderedCount.value = 0
    return generation
  }

  function minCountForRestore(order: number[]) {
    if (!order.length) return 0
    if (targetLesson.value === 'all') return Math.min(LESSONS_PER_FRAME, order.length)
    const l = Number(targetLesson.value)
    const idx = order.indexOf(l)
    if (idx < 0) return Math.min(LESSONS_PER_FRAME, order.length)
    return Math.min(order.length, idx + 1)
  }

  function runPump(gen: number) {
    cancelPump()
    const step = () => {
      if (gen !== generation) return
      const order = lessonOrder.value
      const total = order.length
      if (!total) {
        renderedCount.value = 0
        return
      }
      const chunk = total <= INSTANT_LESSON_THRESHOLD ? total : LESSONS_PER_FRAME
      renderedCount.value = Math.min(total, renderedCount.value + chunk)
      if (renderedCount.value < total)
        rafId = requestAnimationFrame(step)
    }
    rafId = requestAnimationFrame(step)
  }

  watch(
    lessonOrder,
    (order) => {
      const gen = bumpRenderGeneration()
      if (order.length) runPump(gen)
    },
    { flush: 'post' },
  )

  const visibleLessonOrder = computed(() => lessonOrder.value.slice(0, renderedCount.value))

  const renderComplete = computed(
    () => renderedCount.value >= lessonOrder.value.length,
  )

  function isLessonWordsVisible(lno: number) {
    const order = lessonOrder.value
    const idx = order.indexOf(lno)
    return idx >= 0 && idx < renderedCount.value
  }

  function lessonWordsGridStyle(wordCount: number, lno: number) {
    if (renderComplete.value || isLessonWordsVisible(lno) || wordCount <= 0)
      return undefined
    const minHeight = estimateWordsGridMinHeight(wordCount)
    return minHeight ? { minHeight } : undefined
  }

  const renderReadyForRestore = computed(() => {
    const order = lessonOrder.value
    if (!order.length) return true
    return renderedCount.value >= minCountForRestore(order)
  })

  function cleanup() {
    bumpRenderGeneration()
  }

  return {
    visibleLessonOrder,
    isLessonWordsVisible,
    lessonWordsGridStyle,
    renderComplete,
    renderReadyForRestore,
    bumpRenderGeneration,
    cleanup: cancelPump,
    onUnmount: cleanup,
  }
}
