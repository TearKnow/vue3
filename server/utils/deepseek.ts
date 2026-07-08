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

export function buildPageAiSystemPrompt(
  title: string,
  body: string,
  source: 'wiki' | 'blog' | 'page' = 'page',
  modelName = 'deepseek-chat',
) {
  const sourceLabel = source === 'wiki' ? 'Wiki' : source === 'blog' ? '博客文章' : '站点页面'
  const hasPageBody = body.trim().length > 0
    && !body.includes('该页面没有可读取的正文内容')

  return [
    `你是本站接入的 AI 助教，底层使用 DeepSeek API（当前模型：${modelName}）。你不是 Claude、ChatGPT 或其他产品本身，而是本站点通过 API 调用的智能助手。`,
    hasPageBody
      ? `用户当前正在浏览${sourceLabel}「${title}」。下方附有该页正文，供你参考；用户问与本文相关的问题时优先结合正文回答，但不要求所有问题都必须来自本文。`
      : `用户当前在站点页面「${title}」（路径参考）。该页可能没有可引用的正文，请像通用助手一样自由作答。`,
    '用户可以问任何学习、编程或生活类问题；与当前页面无关时，直接用你的知识回答即可，无需强行关联本文。',
    '用户询问你的身份、模型、能力时，请直接如实回答。',
    '用户说「考考我」或要求出题时：若当前页有正文则优先基于正文出题，否则可基于对话主题或用户指定方向出题。',
    '回答应准确、清晰；不确定时请说明。使用 Markdown 格式，语言与用户一致（默认中文）。',
    ...(hasPageBody
      ? ['', '--- 当前页面内容（参考） ---', body]
      : []),
  ].join('\n')
}

/** @deprecated 使用 buildPageAiSystemPrompt */
export function buildWikiAiSystemPrompt(title: string, body: string) {
  return buildPageAiSystemPrompt(title, body, 'wiki')
}
