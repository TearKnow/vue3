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

export const BLOG_PAGE_SIZE = 20
export const BLOG_MAX_TAGS = 2

/** 同组标签只保留先出现的那个（如 Nuxt / Vue 二选一） */
const BLOG_TAG_GROUPS: readonly (readonly string[])[] = [
  ['Nuxt', 'Vue'],
  ['npm', 'pnpm'],
]

function dedupeSimilarBlogTags(tags: string[]) {
  const result: string[] = []
  const usedGroups = new Set<number>()

  for (const tag of tags) {
    const groupIndex = BLOG_TAG_GROUPS.findIndex(group =>
      group.some(item => item.toLowerCase() === tag.toLowerCase()),
    )

    if (groupIndex === -1) {
      result.push(tag)
      continue
    }

    if (usedGroups.has(groupIndex))
      continue

    usedGroups.add(groupIndex)
    result.push(tag)
  }

  return result
}

export function normalizeBlogTags(tags: unknown): string[] {
  if (!Array.isArray(tags))
    return []

  const cleaned = tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
  return dedupeSimilarBlogTags(cleaned).slice(0, BLOG_MAX_TAGS)
}

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
  const query = queryContent('/blog')

  if (!includeContent) {
    query.only(['_path', 'title', 'description', 'date', 'tags', 'pinned', 'draft'])
  }

  const docs = await query.find()

  const mapped = (docs as Record<string, unknown>[]).map((doc) => {
    const rawContent = includeContent ? extractPlainText((doc as Record<string, unknown>).body) : ''
    return {
      _path: typeof doc._path === 'string' ? doc._path : undefined,
      slug: typeof doc._path === 'string' ? pathToSlug(doc._path) : undefined,
      urlPath: typeof doc._path === 'string' ? slugToBlogPath(pathToSlug(doc._path)) : undefined,
      title: typeof doc.title === 'string' ? doc.title : undefined,
      description: typeof doc.description === 'string' ? doc.description : undefined,
      date: typeof doc.date === 'string' ? doc.date : undefined,
      tags: normalizeBlogTags(doc.tags),
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
