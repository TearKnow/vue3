import { nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useNuxtApp, useRoute } from '#imports'

const OVERLAY_ID = 'page-navigation-loading-overlay'
const SPINNER_STYLE_ID = 'page-navigation-loading-spin-style'

/**
 * 内容页在路由结束后仍可能继续取数 / 渲染正文，
 * 由页面在就绪时调用 removeNavigationLoadingOverlay。
 */
function shouldDeferOverlayRemoval(path: string) {
  return path.startsWith('/blog') || path.startsWith('/wiki')
}

function createSpinnerStyle() {
  if (!import.meta.client) return
  if (document.getElementById(SPINNER_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = SPINNER_STYLE_ID
  style.textContent = `
    @keyframes page-navigation-loading-spin {
      to {
        transform: rotate(360deg);
      }
    }
  `
  document.head.appendChild(style)
}

function createLoadingOverlay() {
  if (!import.meta.client) return
  if (document.getElementById(OVERLAY_ID)) return

  createSpinnerStyle()

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.5)',
    pointerEvents: 'auto',
  })

  const panel = document.createElement('div')
  Object.assign(panel.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    borderRadius: '16px',
    background: 'rgba(255, 255, 255, 0.82)',
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.14)',
    pointerEvents: 'none',
  })

  const spinner = document.createElement('div')
  Object.assign(spinner.style, {
    width: '42px',
    height: '42px',
    border: '4px solid #cbd5e1',
    borderTopColor: '#3b6fc0',
    borderRadius: '50%',
    animation: 'page-navigation-loading-spin 1s linear infinite',
  })

  panel.appendChild(spinner)
  overlay.appendChild(panel)
  document.body.appendChild(overlay)
}

function removeLoadingOverlay() {
  if (!import.meta.client) return
  const overlay = document.getElementById(OVERLAY_ID)
  if (overlay) overlay.remove()
}

function removeOverlayAfterPaint() {
  nextTick(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        removeLoadingOverlay()
      })
    })
  })
}

/**
 * 站内路由切换时显示全屏 loading，让用户确认点击已生效。
 * 在 app.vue 中调用一次即可。
 */
export function useNavigationLoading() {
  if (!import.meta.client) return

  const router = useRouter()
  const route = useRoute()
  const nuxtApp = useNuxtApp()

  const removeBefore = router.beforeEach((to, from) => {
    // 跳过首屏初始化导航
    if (!from.matched.length) return true
    if (from.path === to.path) return true
    createLoadingOverlay()
    return true
  })

  // 用 Nuxt 页面 Suspense 结束时机，而不是 router.afterEach（后者往往早于正文渲染）
  const stopLoadingEnd = nuxtApp.hook('page:loading:end', () => {
    if (shouldDeferOverlayRemoval(route.path)) return
    removeOverlayAfterPaint()
  })

  const removeOnError = router.onError(() => {
    removeLoadingOverlay()
  })

  onBeforeUnmount(() => {
    removeBefore()
    stopLoadingEnd()
    removeOnError()
    removeLoadingOverlay()
  })
}

export function removeNavigationLoadingOverlay() {
  removeLoadingOverlay()
}

/** @deprecated 使用 useNavigationLoading */
export const useBlogNavigationLoading = useNavigationLoading

/** @deprecated 使用 removeNavigationLoadingOverlay */
export const removeBlogNavigationLoadingOverlay = removeNavigationLoadingOverlay
