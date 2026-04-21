import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

function stripDatePrefix(name) {
  return name.replace(/^\d{4}-\d{2}-\d{2}-/, '')
}

function pathToSlug(path = '') {
  const last = path.split('/').filter(Boolean).pop() || ''
  return stripDatePrefix(last)
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

function parseFrontMatter(raw) {
  const matched = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!matched) return {}
  const lines = matched[1].split(/\r?\n/)
  const meta = {}
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const idx = line.indexOf(':')
    if (idx <= 0) {
      i += 1
      continue
    }
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (!key) {
      i += 1
      continue
    }

    if (!value && i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
      const items = []
      i += 1
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2).trim().replace(/^["']|["']$/g, ''))
        i += 1
      }
      meta[key] = JSON.stringify(items)
      continue
    }

    meta[key] = value.replace(/^["']|["']$/g, '')
    i += 1
  }
  return meta
}

async function loadPosts() {
  const blogDir = join(process.cwd(), 'content', 'blog')
  const files = await readdir(blogDir)
  const posts = await Promise.all(
    files
      .filter(file => extname(file).toLowerCase() === '.md')
      .map(async (file) => {
        const raw = await readFile(join(blogDir, file), 'utf-8')
        const meta = parseFrontMatter(raw)
        return {
          path: `/blog/${file.replace(/\.md$/i, '')}`,
          title: meta.title || '未命名',
          description: meta.description || '',
          date: meta.date || '',
          draft: meta.draft === 'true',
          pinned: meta.pinned === 'true',
        }
      }),
  )

  return posts
    .filter(post => !post.draft)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return (b.date || '').localeCompare(a.date || '')
    })
}

function buildRssXml(siteUrl, posts) {
  const items = posts.map((post) => {
    const slug = pathToSlug(post.path)
    const url = `${siteUrl}/blog/${slug}`
    const pubDate = post.date ? new Date(post.date).toUTCString() : new Date().toUTCString()
    return `<item><title>${xmlEscape(post.title)}</title><link>${xmlEscape(url)}</link><guid>${xmlEscape(url)}</guid><pubDate>${xmlEscape(pubDate)}</pubDate><description>${xmlEscape(post.description)}</description></item>`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog RSS</title><link>${xmlEscape(`${siteUrl}/blog`)}</link><description>Blog feed</description>${items}</channel></rss>`
}

function buildSitemapXml(siteUrl, posts) {
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

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...staticUrls, ...blogUrls].join('')}</urlset>`
}

async function main() {
  const siteUrl = String(process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const posts = await loadPosts()
  const publicDir = join(process.cwd(), 'public')
  await mkdir(publicDir, { recursive: true })

  await writeFile(join(publicDir, 'rss.xml'), buildRssXml(siteUrl, posts), 'utf-8')
  await writeFile(join(publicDir, 'sitemap.xml'), buildSitemapXml(siteUrl, posts), 'utf-8')

  console.log(`Generated rss.xml and sitemap.xml for ${siteUrl}`)
}

await main()
