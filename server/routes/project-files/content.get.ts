import { readVisibleProjectFile } from '../../utils/project-files'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const file = typeof query.file === 'string' ? query.file : ''

  if (!file) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少 file 参数',
    })
  }

  const content = await readVisibleProjectFile(file)

  if (content === null) {
    throw createError({
      statusCode: 404,
      statusMessage: '文件不存在或已被忽略',
    })
  }

  return {
    file,
    content,
  }
})
