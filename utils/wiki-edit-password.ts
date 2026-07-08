const STORAGE_KEY = 'wiki-edit-password'
const TTL_MS = 24 * 60 * 60 * 1000

interface StoredWikiEditPassword {
  password: string
  expiresAt: number
}

export function getStoredWikiEditPassword(): string | null {
  if (typeof localStorage === 'undefined')
    return null

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw)
      return null

    const stored = JSON.parse(raw) as StoredWikiEditPassword
    if (!stored?.password || typeof stored.expiresAt !== 'number')
      return null

    if (Date.now() >= stored.expiresAt) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    return stored.password
  }
  catch {
    return null
  }
}

export function setStoredWikiEditPassword(password: string) {
  if (typeof localStorage === 'undefined')
    return

  try {
    const payload: StoredWikiEditPassword = {
      password,
      expiresAt: Date.now() + TTL_MS,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }
  catch {
    // ignore
  }
}

export function clearStoredWikiEditPassword() {
  if (typeof localStorage === 'undefined')
    return

  try {
    localStorage.removeItem(STORAGE_KEY)
  }
  catch {
    // ignore
  }
}
