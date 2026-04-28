import { getQuery } from 'h3'
import { serverQueryContent } from '#content/server'

function extractPlainText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(extractPlainText).join(' ')
  if (typeof value === 'object') {
    return Object.entries(value).reduce((text, [key, nested]) => {
      if (key === 'type' || key === 'position') return text
      return `${text} ${extractPlainText(nested)}`
    }, '').trim()
  }
  return ''
}

export default defineEventHandler(async (event) => {
  const { q } = getQuery(event)
  const keyword = typeof q === 'string' ? q.trim().toLowerCase() : ''

  if (!keyword) {
    return {
      matchedPaths: [] as string[],
      snippets: {} as Record<string, string>,
    }
  }

  const docs = await serverQueryContent(event, '/blog').find()
  const matchedPaths: string[] = []
  const snippets: Record<string, string> = {}

  const getSnippet = (raw: string, kw: string) => {
    const lower = raw.toLowerCase()
    const idx = lower.indexOf(kw)
    if (idx === -1) return ''
    const start = Math.max(0, idx - 40)
    const end = Math.min(raw.length, idx + kw.length + 120)
    let snippet = raw.slice(start, end).trim()
    if (start > 0) snippet = `...${snippet}`
    if (end < raw.length) snippet = `${snippet}...`
    return snippet
  }

  for (const doc of docs as Record<string, unknown>[]) {
    const rawPath = typeof doc._path === 'string' ? doc._path : ''
    if (!rawPath) continue
    if (doc.draft === true) continue

    const title = typeof doc.title === 'string' ? doc.title : ''
    const description = typeof doc.description === 'string' ? doc.description : ''
    const tags = Array.isArray(doc.tags) ? doc.tags.filter(tag => typeof tag === 'string').join(' ') : ''
    const content = extractPlainText((doc as Record<string, unknown>).body)
    const haystack = `${title} ${description} ${tags} ${content}`.toLowerCase()

    if (haystack.includes(keyword)) {
      matchedPaths.push(rawPath)
      const snippet = getSnippet(content, keyword)
      if (snippet) {
        snippets[rawPath] = snippet
      }
    }
  }

  return {
    matchedPaths,
    snippets,
  }
})
