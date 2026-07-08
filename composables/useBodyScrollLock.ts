export function useBodyScrollLock(isLocked: Ref<boolean>) {
  const lockedScrollTop = ref(0)

  function lock() {
    if (!import.meta.client)
      return

    const html = document.documentElement
    const body = document.body
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth

    lockedScrollTop.value = window.scrollY || window.pageYOffset || 0
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${lockedScrollTop.value}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.touchAction = 'none'

    if (scrollBarWidth > 0)
      body.style.paddingRight = `${scrollBarWidth}px`
  }

  function unlock() {
    if (!import.meta.client)
      return

    const html = document.documentElement
    const body = document.body

    html.style.overflow = ''
    body.style.overflow = ''
    body.style.position = ''
    body.style.top = ''
    body.style.left = ''
    body.style.right = ''
    body.style.paddingRight = ''
    body.style.touchAction = ''
    window.scrollTo(0, lockedScrollTop.value)
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
