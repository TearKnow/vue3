import {
  addAnnotation,
  loadAnnotationsFile,
  writeAnnotationsFile,
} from '../../utils/annotations'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { pageKey, quote, prefix, suffix, comment } = body || {}

  if (!pageKey || typeof pageKey !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '缺少 pageKey' })
  }

  if (!comment || typeof comment !== 'string' || !comment.trim()) {
    throw createError({ statusCode: 400, statusMessage: '请输入批注内容' })
  }

  const { data, sha } = await loadAnnotationsFile()
  const nextData = addAnnotation(data, {
    pageKey,
    anchor: {
      quote: String(quote || ''),
      prefix: String(prefix || ''),
      suffix: String(suffix || ''),
    },
    comment,
  })

  await writeAnnotationsFile(nextData, sha, `annotations: add ${pageKey}`)

  const created = nextData.annotations[nextData.annotations.length - 1]

  return {
    success: true,
    annotation: created,
  }
})
