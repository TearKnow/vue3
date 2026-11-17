import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'

/** 每帧挂载课数；列表较短时一次挂完 */
const LESSONS_PER_FRAME = 3
const INSTANT_LESSON_THRESHOLD = 20

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
      if (next < total)
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
    renderComplete,
    renderReadyForRestore,
    bumpRenderGeneration,
    cleanup: cancelPump,
    onUnmount: cleanup,
  }
}