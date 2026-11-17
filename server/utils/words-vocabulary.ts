import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createError } from 'h3'
import type { WordEntry, WordsBookMeta } from '../../types/words'

const dataDir = resolve(process.cwd(), 'data/words')

export async function loadWordsMeta(): Promise<WordsBookMeta> {
  const raw = await readFile(resolve(dataDir, 'meta.json'), 'utf8')
  return JSON.parse(raw) as WordsBookMeta
}

export async function loadWordsBook(book: number): Promise<WordEntry[]> {
  if (!Number.isInteger(book) || book < 1 || book > 4)
    throw createError({ statusCode: 400, statusMessage: 'Invalid book' })
  const raw = await readFile(resolve(dataDir, `book-${book}.json`), 'utf8')
  return JSON.parse(raw) as WordEntry[]
}