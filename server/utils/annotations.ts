import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { getWikiGitHubConfig, readGithubFile, writeGithubFile } from './wiki-github'

export const ANNOTATIONS_FILE_PATH = 'data/annotations/annotations.json'

const workspaceRoot = process.cwd()
const CONTEXT_LENGTH = 32

export interface AnnotationAnchor {
  quote: string
  prefix: string
  suffix: string
}

export interface AnnotationRecord extends AnnotationAnchor {
  id: string
  pageKey: string
  comment: string
  createdAt: string
}

export interface AnnotationsFile {
  annotations: AnnotationRecord[]
}

const EMPTY_FILE: AnnotationsFile = { annotations: [] }

function normalizeAnchor(anchor: Partial<AnnotationAnchor>): AnnotationAnchor | null {
  const quote = String(anchor.quote || '')
  if (!quote.trim())
    return null

  return {
    quote,
    prefix: String(anchor.prefix || '').slice(-CONTEXT_LENGTH),
    suffix: String(anchor.suffix || '').slice(0, CONTEXT_LENGTH),
  }
}

export function parseAnnotationsFile(raw: string): AnnotationsFile {
  try {
    const parsed = JSON.parse(raw) as Partial<AnnotationsFile>
    const annotations = Array.isArray(parsed.annotations)
      ? parsed.annotations
          .map((item) => {
            const anchor = normalizeAnchor(item as AnnotationAnchor)
            const id = String((item as AnnotationRecord).id || '').trim()
            const pageKey = String((item as AnnotationRecord).pageKey || '').trim()
            const comment = String((item as AnnotationRecord).comment || '').trim()
            const createdAt = String((item as AnnotationRecord).createdAt || '').trim()
            if (!anchor || !id || !pageKey || !comment || !/^\d{4}-\d{2}-\d{2}$/.test(createdAt))
              return null
            return {
              ...anchor,
              id,
              pageKey,
              comment,
              createdAt,
            }
          })
          .filter((item): item is AnnotationRecord => item !== null)
      : []

    return { annotations }
  }
  catch {
    return { ...EMPTY_FILE }
  }
}

export function serializeAnnotationsFile(data: AnnotationsFile) {
  return `${JSON.stringify(data, null, 2)}\n`
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayDateString() {
  return formatDate(new Date())
}

export function createAnnotationId() {
  return `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

async function readLocalAnnotationsFile() {
  try {
    const content = await readFile(resolve(workspaceRoot, ANNOTATIONS_FILE_PATH), 'utf8')
    return { content, sha: '' }
  }
  catch {
    return null
  }
}

async function writeLocalAnnotationsFile(content: string) {
  const fullPath = resolve(workspaceRoot, ANNOTATIONS_FILE_PATH)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf8')
}

export async function loadAnnotationsFile() {
  const local = await readLocalAnnotationsFile()
  const remote = await readGithubFile(ANNOTATIONS_FILE_PATH)
  const content = local?.content || remote?.content || serializeAnnotationsFile(EMPTY_FILE)

  return {
    data: parseAnnotationsFile(content),
    sha: remote?.sha || '',
  }
}

export async function writeAnnotationsFile(data: AnnotationsFile, sha = '', message?: string) {
  const content = serializeAnnotationsFile(data)
  const commitMessage = message || 'annotations: update'
  const { token } = getWikiGitHubConfig()

  if (token) {
    await writeGithubFile(ANNOTATIONS_FILE_PATH, content, commitMessage, sha)
    return
  }

  await writeLocalAnnotationsFile(content)
}

export function listAnnotationsByPage(data: AnnotationsFile, pageKey: string) {
  return data.annotations.filter(item => item.pageKey === pageKey)
}

export function addAnnotation(
  data: AnnotationsFile,
  input: {
    pageKey: string
    anchor: AnnotationAnchor
    comment: string
  },
) {
  const anchor = normalizeAnchor(input.anchor)
  const comment = input.comment.trim()
  const pageKey = input.pageKey.trim()

  if (!anchor || !comment || !pageKey)
    throw createError({ statusCode: 400, statusMessage: '批注内容无效' })

  const record: AnnotationRecord = {
    id: createAnnotationId(),
    pageKey,
    ...anchor,
    comment,
    createdAt: getTodayDateString(),
  }

  return {
    ...data,
    annotations: [...data.annotations, record],
  }
}

export function removeAnnotation(data: AnnotationsFile, id: string) {
  const next = data.annotations.filter(item => item.id !== id)
  if (next.length === data.annotations.length)
    throw createError({ statusCode: 404, statusMessage: '批注不存在' })

  return {
    ...data,
    annotations: next,
  }
}
