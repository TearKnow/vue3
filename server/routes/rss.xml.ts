function stripDatePrefix(name: string) {
  return name.replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

function pathToSlug(path?: string) {
  if (!path) return ''
  const last = path.split('/').filter(Boolean).pop() || ''
  return stripDatePrefix(last)
}

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const siteUrl = String(runtimeConfig.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')

  const docs = await queryContent(event, '/blog').find()
  const posts = (docs as Array<Record<string, unknown>>)
    .map((doc) => ({
      path: typeof doc._path === 'string' ? doc._path : '',
      title: typeof doc.title === 'string' ? doc.title : '未命名',
      description: typeof doc.description === 'string' ? doc.description : '',
      date: typeof doc.date === 'string' ? doc.date : '',
      draft: Boolean(doc.draft),
      pinned: Boolean(doc.pinned),
    }))
    .filter((p) => !p.draft)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.date.localeCompare(a.date)
    })

  const items = posts.map((post) => {
    const slug = pathToSlug(post.path)
    const url = `${siteUrl}/blog/${slug}`
    const pubDate = post.date ? new Date(post.date).toUTCString() : new Date().toUTCString()
    return `<item><title>${xmlEscape(post.title)}</title><link>${xmlEscape(url)}</link><guid>${xmlEscape(url)}</guid><pubDate>${xmlEscape(pubDate)}</pubDate><description>${xmlEscape(post.description)}</description></item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog RSS</title><link>${xmlEscape(`${siteUrl}/blog`)}</link><description>Blog feed</description>${items}</channel></rss>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})
