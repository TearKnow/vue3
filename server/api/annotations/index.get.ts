import { getQuery } from 'h3'
import { listAnnotationsByPage, loadAnnotationsFile } from '../../utils/annotations'

export default defineEventHandler(async (event) => {
  const { pageKey } = getQuery(event)
  if (typeof pageKey !== 'string' || !pageKey.trim()) {
    throw createError({ statusCode: 400, statusMessage: '缺少 pageKey' })
  }

  const { data } = await loadAnnotationsFile()

  return {
    annotations: listAnnotationsByPage(data, pageKey.trim()),
  }
})
