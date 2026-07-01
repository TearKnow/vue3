import { getQuery } from 'h3'
import { serverQueryContent } from '#content/server'
import { readWikiContentFile } from '../../utils/project-files'
import { isValidWikiSlug, stripWikiFrontmatter, wikiPathToContentFile } from '../../utils/wiki-content'

export default defineEventHandler(async (event) => {
  const { slug } = getQuery(event)
  if (typeof slug !== 'string' || !isValidWikiSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: '无效 slug' })
  }

  const normalizedSlug = slug.replace(/\\/g, '/')
  const targetPath = `/wiki/${normalizedSlug}`.toLowerCase()

  const pages = await serverQueryContent(event, '/wiki').only(['_path']).find()
  const matched = (pages as { _path?: string }[]).find(
    page => typeof page._path === 'string' && page._path.toLowerCase() === targetPath,
  )

  const wikiPath = matched?._path || `/wiki/${normalizedSlug}`
  const filePath = wikiPathToContentFile(wikiPath)
  const raw = await readWikiContentFile(filePath)

  if (!raw) {
    throw createError({ statusCode: 404, statusMessage: '文件不存在或已被忽略' })
  }

  return {
    file: filePath,
    wikiPath,
    content: stripWikiFrontmatter(raw),
  }
})
