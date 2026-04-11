import type { BlogPostMeta } from '~/composables/useBlogPosts'

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function splitHighlightText(value: string, keyword: string) {
  if (!keyword) return [{ text: value, highlight: false }]
  const safeKeyword = escapeRegExp(keyword)
  const regex = new RegExp(safeKeyword, 'gi')
  const tokens: Array<{ text: string, highlight: boolean }> = []
  let lastIndex = 0

  for (const match of value.matchAll(regex)) {
    if (match.index == null) continue
    const start = match.index
    const end = start + match[0].length
    if (start > lastIndex) {
      tokens.push({ text: value.slice(lastIndex, start), highlight: false })
    }
    tokens.push({ text: value.slice(start, end), highlight: true })
    lastIndex = end
  }

  if (lastIndex < value.length) {
    tokens.push({ text: value.slice(lastIndex), highlight: false })
  }

  return tokens.length ? tokens : [{ text: value, highlight: false }]
}

export function getPostSnippet(post: BlogPostMeta, keyword: string) {
  if (!keyword || !post.content) return ''
  const raw = post.content
  const lower = raw.toLowerCase()
  const idx = lower.indexOf(keyword.toLowerCase())
  if (idx === -1) return ''
  const start = Math.max(0, idx - 40)
  const end = Math.min(raw.length, idx + keyword.length + 120)
  let snippet = raw.slice(start, end).trim()
  if (start > 0) snippet = `...${snippet}`
  if (end < raw.length) snippet = `${snippet}...`
  return snippet
}

export function getPostSummaryText(post: BlogPostMeta, keyword: string) {
  const description = post.description ?? ''
  if (!keyword) return description
  if (description.toLowerCase().includes(keyword.toLowerCase())) {
    return description
  }
  return getPostSnippet(post, keyword) || description
}
