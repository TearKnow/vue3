import { normalizeWikiSlug } from '~/utils/wiki-path'
import { queryContent } from '#imports'

let prefetchTimer: ReturnType<typeof setTimeout> | null = null
let pendingPrefetch: string | null = null

/**
 * Hover 预加载 wiki 页面——100ms 防抖 + 单请求并发控制，
 * 将 queryContent 结果写入 nuxtApp.payload.data，使目标页 useAsyncData 瞬间命中缓存。
 */
export function useWikiPrefetch() {
  const nuxtApp = useNuxtApp()

  function schedulePrefetch(slug: string) {
    if (pendingPrefetch === slug) return

    const key = `wiki-${slug}`
    if (nuxtApp.payload.data[key] || nuxtApp.static.data[key]) return

    if (prefetchTimer) clearTimeout(prefetchTimer)

    prefetchTimer = setTimeout(async () => {
      pendingPrefetch = slug
      try {
        const result = await queryContent(`/wiki/${slug}`).findOne()
        if (result) {
          nuxtApp.payload.data[key] = result
        }
      }
      catch {
        // 预取失败静默忽略，页面自己的 queryContent 会正常重试
      }
      finally {
        if (pendingPrefetch === slug)
          pendingPrefetch = null
      }
    }, 100)
  }

  /** 从 wiki 页面路径（如 /wiki/algorithm/start）提取 slug 并预取 */
  function prefetchPath(path: string) {
    const slug = normalizeWikiSlug(path.replace(/^\/wiki\/?/, ''))
    if (slug) schedulePrefetch(slug)
  }

  return { schedulePrefetch, prefetchPath }
}
