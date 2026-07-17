import { queryContent } from '#imports'

let prefetchTimer: ReturnType<typeof setTimeout> | null = null
let pendingPrefetch: string | null = null

/**
 * Hover 预加载 wiki 页面内容——100ms 防抖 + 单请求并发控制，
 * 将 queryContent 结果写入 nuxtApp.payload.data，使目标页的 useAsyncData 立即命中缓存。
 */
export function useWikiPrefetch() {
  const nuxtApp = useNuxtApp()

  function schedulePrefetch(slug: string) {
    // 同一个 slug 正在加载中，跳过
    if (pendingPrefetch === slug) return

    // 已缓存，跳过
    const key = `wiki-${slug}`
    if (nuxtApp.payload.data[key] || nuxtApp.static.data[key]) return

    // 100ms 防抖：快速划过不触发，只对真正停留的链接预取
    if (prefetchTimer) clearTimeout(prefetchTimer)

    prefetchTimer = setTimeout(async () => {
      pendingPrefetch = slug
      try {
        const result = await queryContent(`/wiki/${slug}`).findOne()
        if (result) {
          // 直接写入 Nuxt 的 SSR payload 缓存，useAsyncData 同 key 命中的话会跳过 fetch
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

  return { schedulePrefetch }
}
