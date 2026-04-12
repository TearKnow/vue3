export interface BlogPostMeta {
  _path?: string
  slug?: string
  urlPath?: string
  title?: string
  description?: string
  date?: string
  tags?: string[]
  content?: string
  pinned?: boolean
  draft?: boolean
}

export const BLOG_PAGE_SIZE = 8

export function monthKeyFromDate(date?: string) {
  if (!date || date.length < 7) return ''
  return date.slice(0, 7)
}

export function formatMonthLabel(ym: string) {
  if (!ym || ym.length < 7) return ym
  const [y, m] = ym.split('-')
  return `${y} 年 ${Number(m)} 月`
}

export function stripDatePrefix(name: string) {
  return name.replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

export function pathToSlug(path?: string) {
  if (!path) return ''
  const last = path.split('/').filter(Boolean).pop() || ''
  return stripDatePrefix(last)
}

export function slugToBlogPath(slug: string) {
  return `/blog/${slug}`
}

interface FetchBlogMetaOptions {
  includeDraft?: boolean
  includeContent?: boolean
}

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

export async function fetchBlogMetaList(options: FetchBlogMetaOptions = {}): Promise<BlogPostMeta[]> {
  const { includeDraft = false, includeContent = true } = options
  const docs = await queryContent('/blog')
    .find()

  const mapped = (docs as Record<string, unknown>[]).map((doc) => {
    const rawContent = includeContent ? extractPlainText((doc as Record<string, unknown>).body) : ''
    return {
      _path: typeof doc._path === 'string' ? doc._path : undefined,
      slug: typeof doc._path === 'string' ? pathToSlug(doc._path) : undefined,
      urlPath: typeof doc._path === 'string' ? slugToBlogPath(pathToSlug(doc._path)) : undefined,
      title: typeof doc.title === 'string' ? doc.title : undefined,
      description: typeof doc.description === 'string' ? doc.description : undefined,
      date: typeof doc.date === 'string' ? doc.date : undefined,
      tags: Array.isArray(doc.tags) ? (doc.tags.filter(t => typeof t === 'string') as string[]) : [],
      content: rawContent || undefined,
      pinned: Boolean(doc.pinned),
      draft: Boolean(doc.draft),
    }
  })

  const visible = includeDraft ? mapped : mapped.filter(post => !post.draft)
  return visible.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return (b.date || '').localeCompare(a.date || '')
  })
}
