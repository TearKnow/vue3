import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { H3Event } from 'h3'
import { serverQueryContent } from '#content/server'
import { getWikiPageBody } from './wiki-page-body'
import { normalizeWikiSlug, stripWikiFrontmatter } from './wiki-content'

const workspaceRoot = process.cwd()
const MAX_BODY_CHARS = 12_000

export interface SitePageContext {
  pageKey: string
  pagePath: string
  title: string
  body: string
  source: 'wiki' | 'blog' | 'page'
}

interface BlogContentDoc {
  title?: string
  description?: string
  _path?: string
  body?: unknown
}

function truncateBody(body: string) {
  if (body.length <= MAX_BODY_CHARS)
    return body
  return `${body.slice(0, MAX_BODY_CHARS)}\n\n…（内容过长，已截断）`
}

function isSafeMarkdownPath(filePath: string, prefix: 'content/blog/' | 'content/wiki/') {
  if (!filePath.startsWith(prefix) || !filePath.endsWith('.md'))
    return false

  const rel = filePath.slice(prefix.length)
  return rel.length > 0 && !rel.split('/').some(seg => seg === '..' || seg.startsWith('_'))
}

async function readLocalMarkdown(filePath: string) {
  const normalized = filePath.replaceAll('\\', '/')
  if (!isSafeMarkdownPath(normalized, 'content/blog/') && !isSafeMarkdownPath(normalized, 'content/wiki/'))
    return null

  try {
    return await readFile(resolve(workspaceRoot, normalized), 'utf8')
  }
  catch {
    return null
  }
}

function blogPathToContentFile(path: string) {
  const rel = path.replace(/^\/blog\/?/, '').replace(/\/+$/, '')
  if (!rel || rel.includes('..'))
    return null
  return `content/blog/${rel}.md`
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function pathToBlogSlug(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .pop()
    ?.replace(/^\d{4}-\d{2}-\d{2}-/, '') || ''
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

function normalizeRoutePath(path: string) {
  const base = path.split('?')[0].split('#')[0].replace(/\/+$/, '')
  return base || '/'
}

async function getBlogPageContext(event: H3Event, path: string): Promise<SitePageContext | null> {
  const slug = path.replace(/^\/blog\/?/, '')
  const postPathPattern = new RegExp(`^/blog/(?:\\d{4}-\\d{2}-\\d{2}-)?${escapeRegExp(slug)}$`)
  const doc = await serverQueryContent(event, '/blog')
    .where({ _path: postPathPattern })
    .only(['title', 'description', '_path', 'body'])
    .findOne() as BlogContentDoc | null

  if (!doc?._path)
    return null

  const filePath = blogPathToContentFile(doc._path)
  const raw = filePath ? await readLocalMarkdown(filePath) : null
  const stripped = raw ? stripWikiFrontmatter(raw) : ''
  const contentBody = extractPlainText(doc.body)
  const body = stripped || contentBody || [doc.description, '（未能读取正文原文，仅提供摘要信息）'].filter(Boolean).join('\n\n')
  const resolvedSlug = pathToBlogSlug(doc._path) || slug

  return {
    pageKey: `blog:${resolvedSlug}`,
    pagePath: path,
    title: typeof doc.title === 'string' ? doc.title : resolvedSlug,
    body: truncateBody(body),
    source: 'blog',
  }
}

export async function getSitePageContext(event: H3Event, routePath: string): Promise<SitePageContext> {
  const path = normalizeRoutePath(routePath)

  if (path.startsWith('/wiki/') && path !== '/wiki') {
    const slug = normalizeWikiSlug(path.slice('/wiki/'.length))
    const wiki = await getWikiPageBody(event, slug)
    if (wiki) {
      return {
        pageKey: `wiki:${wiki.slug}`,
        pagePath: path,
        title: wiki.title,
        body: wiki.body,
        source: 'wiki',
      }
    }
  }

  if (path.startsWith('/blog/') && path !== '/blog' && !path.startsWith('/blog/tag/') && !path.startsWith('/blog/archive/')) {
    const blog = await getBlogPageContext(event, path)
    if (blog)
      return blog
  }

  return {
    pageKey: `route:${path}`,
    pagePath: path,
    title: path === '/' ? '首页' : path,
    body: `当前页面路径：${path}\n该页面没有可读取的正文内容。请结合用户问题作答；若需要页面正文才能回答，请说明当前环境无法获取正文。`,
    source: 'page',
  }
}
