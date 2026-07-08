export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiSession {
  pageKey: string
  title: string
  updatedAt: number
  messages: AiMessage[]
}

function storageKey(pageKey: string) {
  return `site-ai-session:${pageKey}`
}

export function loadAiSession(pageKey: string): AiSession | null {
  if (typeof localStorage === 'undefined' || !pageKey)
    return null

  try {
    const raw = localStorage.getItem(storageKey(pageKey))
    if (!raw)
      return null

    const session = JSON.parse(raw) as AiSession
    if (!session || session.pageKey !== pageKey || !Array.isArray(session.messages))
      return null

    return session
  }
  catch {
    return null
  }
}

export function saveAiSession(session: AiSession) {
  if (typeof localStorage === 'undefined' || !session.pageKey)
    return

  try {
    localStorage.setItem(storageKey(session.pageKey), JSON.stringify({
      ...session,
      updatedAt: Date.now(),
    }))
  }
  catch {
    // ignore
  }
}

export function clearAiSession(pageKey: string) {
  if (typeof localStorage === 'undefined' || !pageKey)
    return

  try {
    localStorage.removeItem(storageKey(pageKey))
  }
  catch {
    // ignore
  }
}

// 兼容旧 key
export const loadWikiAiSession = (slug: string) => loadAiSession(`wiki:${slug}`)
export const saveWikiAiSession = saveAiSession
export const clearWikiAiSession = (slug: string) => clearAiSession(`wiki:${slug}`)
