const openAiPanelHandler = shallowRef<(() => void) | null>(null)
const openWikiSidebarHandler = shallowRef<(() => void) | null>(null)

export function useMobileFabActions() {
  const route = useRoute()

  const isWikiPage = computed(() => route.path === '/wiki' || route.path.startsWith('/wiki/'))

  function openAiPanel() {
    openAiPanelHandler.value?.()
  }

  function openWikiSidebar() {
    openWikiSidebarHandler.value?.()
  }

  return {
    openAiPanel,
    openWikiSidebar,
    isWikiPage,
  }
}

export function useRegisterMobileAiOpener(handler: () => void) {
  onMounted(() => {
    openAiPanelHandler.value = handler
  })

  onUnmounted(() => {
    if (openAiPanelHandler.value === handler)
      openAiPanelHandler.value = null
  })
}

export function useRegisterMobileWikiSidebarOpener(handler: () => void) {
  onMounted(() => {
    openWikiSidebarHandler.value = handler
  })

  onUnmounted(() => {
    if (openWikiSidebarHandler.value === handler)
      openWikiSidebarHandler.value = null
  })
}

export function useMobileViewport(maxWidth = 899) {
  const isMobile = ref(false)
  let mq: MediaQueryList | null = null
  let update: (() => void) | null = null

  onMounted(() => {
    mq = window.matchMedia(`(max-width: ${maxWidth}px)`)
    update = () => { isMobile.value = mq?.matches ?? false }
    update()
    mq.addEventListener('change', update)
  })

  onUnmounted(() => {
    if (mq && update)
      mq.removeEventListener('change', update)
  })

  return { isMobile }
}
