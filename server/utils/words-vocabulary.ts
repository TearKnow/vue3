import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createError } from 'h3'
import { useStorage } from 'nitropack/runtime'
import type { WordEntry, WordsBookMeta } from '../../types/words'

const storageKeys = {
  meta: 'words/meta.json',
  book: (n: number) => `words/book-${n}.json`,
} as const

async function readWordsDataFile(relativePath: string): Promise<string> {
  const storage = useStorage('assets:server')
  const item = await storage.getItem(relativePath)
  if (item != null) {
    if (typeof item === 'string') return item
    if (item instanceof Uint8Array) return new TextDecoder().decode(item)
    if (typeof item === 'object') return JSON.stringify(item)
    return String(item)
  }

  // dev 兜底：server/assets 在开发态也可直接读盘
  try {
    return await readFile(resolve(process.cwd(), 'server/assets', relativePath), 'utf8')
  }
  catch {
    throw createError({
      statusCode: 500,
      statusMessage: `Words vocabulary file not found: ${relativePath}`,
    })
  }
}

export async function loadWordsMeta(): Promise<WordsBookMeta> {
  const raw = await readWordsDataFile(storageKeys.meta)
  return JSON.parse(raw) as WordsBookMeta
}

export async function loadWordsBook(book: number): Promise<WordEntry[]> {
  if (!Number.isInteger(book) || book < 1 || book > 4)
    throw createError({ statusCode: 400, statusMessage: 'Invalid book' })
  const raw = await readWordsDataFile(storageKeys.book(book))
  return JSON.parse(raw) as WordEntry[]
}