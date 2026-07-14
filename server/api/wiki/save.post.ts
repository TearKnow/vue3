// POST /api/wiki/save — 保存 wiki 页面到 GitHub
import {
  assertWikiPassword,
  parseWikiFrontmatter,
  readGithubFile,
  writeGithubFile,
  readWikiOrderFileFromGithub,
  writeWikiOrderFileToGithub,
} from '../../utils/wiki-github'
import { isValidWikiSlug, normalizeWikiPath, normalizeWikiSlug } from '../../utils/wiki-content'
import { getTodayDateString } from '../../../utils/beijing-time'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { slug, title, content, password } = body || {}

  if (!slug || !title || !password) {
    throw createError({ statusCode: 400, statusMessage: 'slug, title, password 为必填字段' })
  }

  if (!isValidWikiSlug(slug)) {
    throw createError({ statusCode: 400, statusMessage: '无效 slug' })
  }

  assertWikiPassword(password)

  const normalizedSlug = normalizeWikiSlug(slug)
  const today = getTodayDateString()
  const filePath = `content/wiki/${normalizedSlug}.md`
  const pagePath = normalizeWikiPath(`/wiki/${normalizedSlug}`)
  const parentPath = pagePath.substring(0, pagePath.lastIndexOf('/')) || '/wiki'

  const existing = await readGithubFile(filePath)
  const existingMeta = existing?.content ? parseWikiFrontmatter(existing.content) : {}
  // date 用于页面「更新于」展示，每次保存刷新为当天
  const date = today
  const orderLine = typeof existingMeta.order === 'number' ? `order: ${existingMeta.order}` : ''

  const frontmatter = [
    '---',
    `title: ${title}`,
    `date: ${date}`,
    orderLine,
    '---',
  ].filter(Boolean).join('\n')

  const fileContent = `${frontmatter}\n\n${(content || '').trim()}`

  await writeGithubFile(
    filePath,
    fileContent,
    `wiki: ${existing?.sha ? 'update' : 'create'} ${normalizedSlug}`,
    existing?.sha || '',
  )

  if (!existing?.sha) {
    const currentOrder = await readWikiOrderFileFromGithub()
    const siblings = [...(currentOrder.groups[parentPath] || [])]
    if (!siblings.includes(pagePath))
      siblings.push(pagePath)

    await writeWikiOrderFileToGithub({
      ...currentOrder.groups,
      [parentPath]: siblings,
    }, currentOrder.sha)
  }

  return {
    success: true,
    slug: normalizedSlug,
    action: existing?.sha ? 'updated' : 'created',
  }
})
