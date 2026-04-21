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

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
}

function parseFrontMatter(raw: string) {
  const matched = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!matched) return {}
  const lines = matched[1].split(/\r?\n/)
  const meta: Record<string, string> = {}
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
      const items: string[] = []
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
          title: meta.title || '未命名',
          description: meta.description || '',
          date: meta.date || '',
          draft: meta.draft === 'true',
          pinned: meta.pinned === 'true',
        }
      }),
  )
  const visiblePosts = posts
    .filter(p => !p.draft)
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.date.localeCompare(a.date)
    })

  const items = visiblePosts.map((post) => {
    const slug = pathToSlug(post.path)
    const url = `${siteUrl}/blog/${slug}`
    const pubDate = post.date ? new Date(post.date).toUTCString() : new Date().toUTCString()
    return `<item><title>${xmlEscape(post.title)}</title><link>${xmlEscape(url)}</link><guid>${xmlEscape(url)}</guid><pubDate>${xmlEscape(pubDate)}</pubDate><description>${xmlEscape(post.description)}</description></item>`
  }).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Blog RSS</title><link>${xmlEscape(`${siteUrl}/blog`)}</link><description>Blog feed</description>${items}</channel></rss>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})
