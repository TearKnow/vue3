import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

function stripDatePrefix(name: string) {
  return name.replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

function pathToSlug(path?: string) {
  if (!path) return ''
  const last = path.split('/').filter(Boolean).pop() || ''
  return stripDatePrefix(last)
}

function parseFrontMatter(raw: string) {
  const matched = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!matched) return {}
  const lines = matched[1].split(/\r?\n/)
  return lines.reduce<Record<string, string>>((acc, line) => {
    const idx = line.indexOf(':')
    if (idx <= 0) return acc
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key) acc[key] = value
    return acc
  }, {})
}

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig(event)
  const siteUrl = String(runtimeConfig.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')

  const blogDir = join(process.cwd(), 'content', 'blog')
  const files = await readdir(blogDir)
  const posts = await Promise.all(
    files
      .filter(file => extname(file).toLowerCase() === '.md')
      .map(async (file) => {
        const filePath = join(blogDir, file)
        const raw = await readFile(filePath, 'utf-8')
        const meta = parseFrontMatter(raw)
        return {
          path: `/blog/${file.replace(/\.md$/i, '')}`,
          date: meta.date ?? '',
          draft: meta.draft === 'true',
        }
      }),
  )
  const visiblePosts = posts
    .filter(post => !post.draft)
    .sort((a, b) => b.date.localeCompare(a.date))

  const staticUrls = [
    `<url><loc>${siteUrl}</loc></url>`,
    `<url><loc>${siteUrl}/blog</loc></url>`,
    `<url><loc>${siteUrl}/rss.xml</loc></url>`,
  ]

  const blogUrls = visiblePosts.map((post) => {
    const slug = pathToSlug(post.path)
    const loc = `${siteUrl}/blog/${slug}`
    const lastmod = post.date ? `<lastmod>${post.date}</lastmod>` : ''
    return `<url><loc>${loc}</loc>${lastmod}</url>`
  })

  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticUrls, ...blogUrls].join('')}</urlset>`
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return body
})
