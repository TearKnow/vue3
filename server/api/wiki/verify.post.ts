import { assertWikiPassword } from '../../utils/wiki-github'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { password } = body || {}

  if (!password || typeof password !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '请输入密码' })
  }

  assertWikiPassword(password)

  return { success: true }
})
