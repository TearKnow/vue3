/**
 * 与 Giscus 嵌入一致：请求官方 discussions API（无需 GitHub Token）。
 * @see https://giscus.app/api/discussions
 */
type GiscusDiscussionsResponse = {
  discussion?: {
    totalCommentCount?: number
    totalReplyCount?: number
  }
}

export default defineEventHandler(async (event) => {
  // Vercel/edge CDN 缓存：同 URL（含 query）命中缓存，减少对 giscus API 的重复请求。
  // 1 分钟强缓存 + 5 分钟陈旧可用（后台再验证）。
  const cacheControl = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
  setHeader(event, 'Cache-Control', cacheControl)
  setHeader(event, 'CDN-Cache-Control', cacheControl)
  setHeader(event, 'Vercel-CDN-Cache-Control', cacheControl)

  const query = getQuery(event)
  const repo = String(query.repo ?? '').trim()
  const category = String(query.category ?? 'General').trim() || 'General'
  const strictRaw = String(query.strict ?? '0').trim()
  const strict = strictRaw === '1' || strictRaw.toLowerCase() === 'true'
  const number = String(query.number ?? '0').trim() || '0'
  const term = String(query.term ?? '').trim()

  if (!repo) {
    return { count: null as number | null }
  }

  if (!/^[\w-]+\/[\w.-]+$/i.test(repo)) {
    return { count: null as number | null }
  }

  if (number === '0' && !term) {
    return { count: null as number | null }
  }

  const params = new URLSearchParams({
    repo,
    category,
    number,
    strict: strict ? 'true' : 'false',
    last: '15',
  })
  if (term)
    params.set('term', term)

  try {
    const res = await $fetch<GiscusDiscussionsResponse>(
      `https://giscus.app/api/discussions?${params.toString()}`,
      {
        headers: { Accept: 'application/json' },
      },
    )
    const d = res.discussion
    const top = d?.totalCommentCount
    const replies = d?.totalReplyCount
    if (typeof top !== 'number' || !Number.isFinite(top) || top < 0) {
      return { count: null as number | null }
    }
    const r = typeof replies === 'number' && Number.isFinite(replies) && replies >= 0 ? replies : 0
    return { count: top + r }
  }
  catch {
    return { count: null as number | null }
  }
})
