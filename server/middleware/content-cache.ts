/**
 * 为 Nuxt Content 查询 API 添加 CDN 缓存头。
 * 只加 header，不拦截/改变响应内容，避免 swr routeRule 的副作用。
 */
export default defineEventHandler((event) => {
  if (event.path.startsWith('/api/_content/query/')) {
    setResponseHeader(
      event,
      'Cache-Control',
      'public, max-age=0, s-maxage=31536000, stale-while-revalidate',
    )
  }
})
