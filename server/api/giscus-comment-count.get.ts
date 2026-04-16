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
