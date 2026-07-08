import { sendStream, setResponseHeaders } from 'h3'
import { assertWikiPassword } from '../../utils/wiki-github'
import { buildPageAiSystemPrompt, createDeepSeekChatStream } from '../../utils/deepseek'
import { getSitePageContext } from '../../utils/site-page-body'

interface ClientMessage {
  role: 'user' | 'assistant'
  content: string
}

const MAX_HISTORY = 24

function encodeSseEvent(data: Record<string, unknown>) {
  return `data: ${JSON.stringify(data)}\n\n`
}

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

  const model = deepThink ? 'deepseek-reasoner' : ((useRuntimeConfig().deepseekModel as string) || 'deepseek-chat')

  const upstream = await createDeepSeekChatStream(
    [
      { role: 'system', content: buildPageAiSystemPrompt(page.title, page.body, page.source, model) },
      ...history,
    ],
    model,
  )

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => upstream.statusText)
    throw createError({
      statusCode: 502,
      statusMessage: `DeepSeek 请求失败：${errText.slice(0, 200)}`,
    })
  }

  setResponseHeaders(event, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const push = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(encodeSseEvent(data)))
      }

      push({ type: 'meta', pageKey: page.pageKey, title: page.title })

      if (!upstream.body) {
        push({ type: 'error', message: 'DeepSeek 返回体为空' })
        controller.close()
        return
      }

      const reader = upstream.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done)
            break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:'))
              continue

            const payload = trimmed.slice(5).trim()
            if (!payload || payload === '[DONE]')
              continue

            try {
              const json = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>
              }
              const delta = json.choices?.[0]?.delta?.content
              if (delta)
                push({ type: 'delta', content: delta })
            }
            catch {
              // ignore malformed chunks
            }
          }
        }

        push({ type: 'done' })
      }
      catch {
        push({ type: 'error', message: '流式传输中断' })
      }
      finally {
        controller.close()
      }
    },
  })

  return sendStream(event, stream)
})
