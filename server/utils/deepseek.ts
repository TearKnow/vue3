interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function getDeepSeekConfig() {
  const config = useRuntimeConfig()
  const apiKey = config.deepseekApiKey as string

  if (!apiKey) {
    throw createError({ statusCode: 500, statusMessage: '服务器未配置 DEEPSEEK_API_KEY 环境变量' })
  }

  return {
    apiKey,
    baseUrl: (config.deepseekBaseUrl as string) || 'https://api.deepseek.com',
    model: (config.deepseekModel as string) || 'deepseek-chat',
  }
}

export async function callDeepSeekChat(messages: ChatMessage[], model?: string) {
  const { apiKey, baseUrl, model: defaultModel } = getDeepSeekConfig()
  const resolvedModel = model || defaultModel

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages,
      temperature: 0.7,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw createError({
      statusCode: 502,
      statusMessage: `DeepSeek 请求失败：${errText.slice(0, 200)}`,
    })
  }

  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) {
    throw createError({ statusCode: 502, statusMessage: 'DeepSeek 返回内容为空' })
  }

  return content
}

export async function createDeepSeekChatStream(messages: ChatMessage[], model?: string) {
  const { apiKey, baseUrl, model: defaultModel } = getDeepSeekConfig()
  const resolvedModel = model || defaultModel

  return fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages,
      temperature: 0.7,
      stream: true,
    }),
  })
}

export function buildPageAiSystemPrompt(title: string, body: string, source: 'wiki' | 'blog' | 'page' = 'page') {
  const sourceLabel = source === 'wiki' ? 'Wiki' : source === 'blog' ? '博客文章' : '站点页面'
  return [
    `你是${sourceLabel}「${title}」的 AI 助教。`,
    '请严格基于下方页面内容回答用户问题；若问题超出页面范围，请说明并尽量关联页面内容。',
    '用户说「考考我」或要求出题时，请根据页面内容出 3～5 道选择题，包含题干、选项、正确答案和简要解析。',
    '使用 Markdown 格式，语言与用户一致（默认中文）。',
    '',
    '--- 页面内容 ---',
    body,
  ].join('\n')
}

/** @deprecated 使用 buildPageAiSystemPrompt */
export function buildWikiAiSystemPrompt(title: string, body: string) {
  return buildPageAiSystemPrompt(title, body, 'wiki')
}
