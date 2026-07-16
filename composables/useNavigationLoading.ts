import { nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from '#imports'

const OVERLAY_ID = 'page-navigation-loading-overlay'
const SPINNER_STYLE_ID = 'page-navigation-loading-spin-style'

/** Blog 详情等页会在数据就绪后再手动关闭，避免 afterEach 过早摘掉遮罩 */
function shouldDeferOverlayRemoval(path: string) {
  return path.startsWith('/blog')
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

/**
 * 站内路由切换时显示全屏 loading，让用户确认点击已生效。
 * 在 app.vue 中调用一次即可。
 */
export function useNavigationLoading() {
  if (!import.meta.client) return

  const router = useRouter()
  const removeBefore = router.beforeEach((to, from) => {
    // 跳过首屏初始化导航
    if (!from.matched.length) return true
    if (from.path === to.path) return true
    createLoadingOverlay()
    return true
  })

  const removeAfter = router.afterEach((to) => {
    if (shouldDeferOverlayRemoval(to.path)) return
    nextTick(() => {
      removeLoadingOverlay()
    })
  })

  const removeOnError = router.onError(() => {
    removeLoadingOverlay()
  })

  onBeforeUnmount(() => {
    removeBefore()
    removeAfter()
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
