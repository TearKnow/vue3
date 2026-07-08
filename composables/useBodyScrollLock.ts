interface BodyScrollLockOptions {
  /** 允许继续滚动的区域（如弹框内消息列表） */
  allowScrollSelectors?: string[]
}

export function useBodyScrollLock(isLocked: Ref<boolean>, options: BodyScrollLockOptions = {}) {
  const allowScrollSelectors = options.allowScrollSelectors ?? []

  function isInsideAllowedScrollable(target: EventTarget | null) {
    if (!(target instanceof Element))
      return false

    return allowScrollSelectors.some(selector => target.closest(selector))
  }

  function onWheel(event: WheelEvent) {
    if (isInsideAllowedScrollable(event.target))
      return

    event.preventDefault()
  }

  function onTouchMove(event: TouchEvent) {
    if (isInsideAllowedScrollable(event.target))
      return

    event.preventDefault()
  }

  const scrollKeys = new Set([' ', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End'])

  function onKeyDown(event: KeyboardEvent) {
    if (!scrollKeys.has(event.key))
      return

    if (isInsideAllowedScrollable(event.target))
      return

    event.preventDefault()
  }

  function lock() {
    if (!import.meta.client)
      return

    document.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('keydown', onKeyDown)
  }

  function unlock() {
    if (!import.meta.client)
      return

    document.removeEventListener('wheel', onWheel)
    document.removeEventListener('touchmove', onTouchMove)
    document.removeEventListener('keydown', onKeyDown)
  }

  watch(isLocked, (locked) => {
    if (locked)
      lock()
    else
      unlock()
  })

  onBeforeUnmount(() => {
    if (isLocked.value)
      unlock()
  })
}
