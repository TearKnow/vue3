/**
 * 与 Utterances issue-term=pathname 一致：用 GitHub Search API 查对应 issue，返回 comments 字段。
 * 可选环境变量 GITHUB_TOKEN / NUXT_GITHUB_TOKEN 提高限流额度。
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const repo = String(query.repo ?? '').trim()
  const pathname = String(query.pathname ?? '').trim()

  if (!repo || !pathname) {
    return { count: null as number | null }
  }

  if (!/^[\w-]+\/[\w.-]+$/i.test(repo)) {
    return { count: null as number | null }
  }

  const q = `"${pathname.replace(/"/g, '\\"')}" type:issue in:title repo:${repo}`
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&order=asc`

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'NuxtBlogUtterancesCommentCount',
  }

  const token = process.env.GITHUB_TOKEN ?? process.env.NUXT_GITHUB_TOKEN
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  try {
    const res = await $fetch<{ items?: Array<{ comments?: number }> }>(url, { headers })
    const first = res.items?.[0]
    const n = first?.comments
    if (typeof n === 'number' && Number.isFinite(n) && n >= 0) {
      return { count: n }
    }
    return { count: null as number | null }
  }
  catch {
    return { count: null as number | null }
  }
})
