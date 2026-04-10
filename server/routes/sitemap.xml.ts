function stripDatePrefix(name: string) {
  return name.replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

function pathToSlug(path?: string) {
  if (!path) return ''
  const last = path.split('/').filter(Boolean).pop() || ''
  return stripDatePrefix(last)
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const siteUrl = String(runtimeConfig.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')

  const docs = await queryContent(event, '/blog').find()
  const posts = (docs as Array<Record<string, unknown>>)
    .map((doc) => ({
      path: typeof doc._path === 'string' ? doc._path : '',
      date: typeof doc.date === 'string' ? doc.date : '',
      draft: Boolean(doc.draft),
    }))
    .filter((p) => !p.draft)
    .sort((a, b) => b.date.localeCompare(a.date))

  const staticUrls = [
    `<url><loc>${siteUrl}</loc></url>`,
    `<url><loc>${siteUrl}/blog</loc></url>`,
    `<url><loc>${siteUrl}/rss.xml</loc></url>`,
  ]

  const blogUrls = posts.map((post) => {
    const slug = pathToSlug(post.path)
    const loc = `${siteUrl}/blog/${slug}`
    const lastmod = post.date ? `<lastmod>${post.date}</lastmod>` : ''
    return `<url><loc>${loc}</loc>${lastmod}</url>`
  })

  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticUrls, ...blogUrls].join('')}</urlset>`
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return body
})
