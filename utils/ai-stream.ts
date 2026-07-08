export interface AiStreamMeta {
  pageKey?: string
  title?: string
}

export async function readAiChatStream(
  stream: ReadableStream<Uint8Array>,
  handlers: {
    onMeta?: (meta: AiStreamMeta) => void
    onDelta?: (content: string) => void
    onDone?: () => void
    onError?: (message: string) => void
  },
) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleEvent = (raw: string) => {
    const payload = raw.trim()
    if (!payload)
      return

    let data: {
      type?: string
      content?: string
      message?: string
      pageKey?: string
      title?: string
    }
    try {
      data = JSON.parse(payload)
    }
    catch {
      return
    }

    if (data.type === 'meta')
      handlers.onMeta?.({ pageKey: data.pageKey, title: data.title })
    else if (data.type === 'delta' && data.content)
      handlers.onDelta?.(data.content)
    else if (data.type === 'done')
      handlers.onDone?.()
    else if (data.type === 'error')
      handlers.onError?.(data.message || '流式传输失败')
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break

    buffer += decoder.decode(value, { stream: true })

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const chunk = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)

      for (const line of chunk.split('\n')) {
        if (line.startsWith('data:'))
          handleEvent(line.slice(5))
      }

      boundary = buffer.indexOf('\n\n')
    }
  }
}
