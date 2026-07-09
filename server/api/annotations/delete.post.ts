import {
  loadAnnotationsFile,
  removeAnnotation,
  writeAnnotationsFile,
} from '../../utils/annotations'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { id } = body || {}

  if (!id || typeof id !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '缺少 id' })
  }

  const { data, sha } = await loadAnnotationsFile()
  const nextData = removeAnnotation(data, id)

  await writeAnnotationsFile(nextData, sha, `annotations: delete ${id}`)

  return {
    success: true,
    id,
  }
})
