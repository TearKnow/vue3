import { assertWikiPassword } from '../../utils/wiki-github'
import { buildPageAiSystemPrompt, callDeepSeekChat } from '../../utils/deepseek'
import { getSitePageContext } from '../../utils/site-page-body'

interface ClientMessage {
  role: 'user' | 'assistant'
  content: string
}

const MAX_HISTORY = 24

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { password, pagePath, messages, deepThink } = body || {}

  if (!password || typeof password !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '缺少 password' })
  }

  if (!pagePath || typeof pagePath !== 'string') {
    throw createError({ statusCode: 400, statusMessage: '缺少 pagePath' })
  }

  if (!Array.isArray(messages)) {
    throw createError({ statusCode: 400, statusMessage: 'messages 必须为数组' })
  }

  assertWikiPassword(password)

  const page = await getSitePageContext(event, pagePath)

  const history = (messages as ClientMessage[])
    .filter(item => item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string')
    .slice(-MAX_HISTORY)
    .map(item => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter(item => item.content)

  const model = deepThink ? 'deepseek-reasoner' : undefined

  const reply = await callDeepSeekChat(
    [
      { role: 'system', content: buildPageAiSystemPrompt(page.title, page.body, page.source) },
      ...history,
    ],
    model,
  )

  return { reply, pageKey: page.pageKey, title: page.title }
})
