import { serverQueryContent } from '#content/server'
import { readWikiContentFile } from './project-files'
import { normalizeWikiSlug, stripWikiFrontmatter, wikiPathToContentFile } from './wiki-content'

const MAX_BODY_CHARS = 12_000

export async function getWikiPageBody(event: any, slug: string) {
  const normalizedSlug = normalizeWikiSlug(slug)
  const targetPath = `/wiki/${normalizedSlug}`

  const pages = await serverQueryContent(event, '/wiki').only(['_path', 'title']).find()
  const matched = (pages as { _path?: string; title?: string }[]).find(
    page => typeof page._path === 'string' && page._path.toLowerCase() === targetPath,
  )

  if (!matched)
    return null

  const wikiPath = matched._path || targetPath
  const filePath = wikiPathToContentFile(wikiPath)
  const raw = await readWikiContentFile(filePath)

  if (!raw)
    return null

  const body = stripWikiFrontmatter(raw)
  const title = typeof matched.title === 'string' ? matched.title : normalizedSlug

  return {
    slug: normalizedSlug,
    title,
    wikiPath,
    body: body.length > MAX_BODY_CHARS
      ? `${body.slice(0, MAX_BODY_CHARS)}\n\n…（内容过长，已截断）`
      : body,
  }
}
