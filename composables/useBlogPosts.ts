export interface BlogPostMeta {
  _path?: string
  title?: string
  description?: string
  date?: string
  tags?: string[]
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

export async function fetchBlogMetaList(): Promise<BlogPostMeta[]> {
  const docs = await queryContent('/blog')
    .sort({ date: -1 })
    .find()

  return (docs as Record<string, unknown>[]).map((doc) => ({
    _path: typeof doc._path === 'string' ? doc._path : undefined,
    title: typeof doc.title === 'string' ? doc.title : undefined,
    description: typeof doc.description === 'string' ? doc.description : undefined,
    date: typeof doc.date === 'string' ? doc.date : undefined,
    tags: Array.isArray(doc.tags) ? (doc.tags.filter((t) => typeof t === 'string') as string[]) : [],
  }))
}
