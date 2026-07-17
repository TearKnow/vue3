export const WIKI_VISIT_COUNTS_STORAGE_KEY = 'wiki-visit-counts'
export const WIKI_VISIT_SYNC_BATCH_STORAGE_KEY = 'wiki-visit-sync-batch'
const MAX_APPLIED_SYNC_IDS = 500

export type WikiVisitCounts = Record<string, number>

export interface WikiVisitPage {
  _path: string
  date?: string
}

export interface WikiVisitsFile {
  counts: WikiVisitCounts
  appliedSyncIds: string[]
  updatedAt: string
}

export interface WikiVisitSyncBatch {
  id: string
  counts: WikiVisitCounts
}

export interface WikiVisitsResponse {
  counts: WikiVisitCounts
  updatedAt: string
}

function isWikiArticlePath(path: string): boolean {
  return /^\/wiki\/[^?#]+$/.test(path)
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0
}

function assertBatchId(id: string): void {
  if (id.length < 8 || id.length > 80)
    throw new Error('Wiki visit sync batch id length must be 8-80')
}

function sanitizeWikiCounts(raw: unknown, positiveOnly = false): WikiVisitCounts {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return {}

  const counts: WikiVisitCounts = {}
  for (const [path, value] of Object.entries(raw)) {
    if (!isWikiArticlePath(path))
      continue

    if (positiveOnly ? isPositiveSafeInteger(value) : isNonNegativeSafeInteger(value))
      counts[path] = Number(value)
  }
  return counts
}

function assertWikiVisitSyncIncrements(raw: unknown): WikiVisitCounts {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Invalid wiki visit sync increments')

  const entries = Object.entries(raw)
  if (entries.length === 0)
    throw new Error('Invalid wiki visit sync increments')

  const counts: WikiVisitCounts = {}
  for (const [path, value] of entries) {
    if (!isWikiArticlePath(path) || !isPositiveSafeInteger(value))
      throw new Error('Invalid wiki visit sync increments')
    counts[path] = value
  }
  return counts
}

export function parseWikiVisitCounts(raw: string | null): WikiVisitCounts {
  if (!raw)
    return {}

  try {
    const parsed = JSON.parse(raw) as unknown
    return sanitizeWikiCounts(parsed)
  }
  catch {
    return {}
  }
}

export function incrementWikiVisitCount(
  counts: WikiVisitCounts,
  path: string,
): WikiVisitCounts {
  if (!isWikiArticlePath(path))
    return { ...counts }

  const current = Number.isSafeInteger(counts[path]) && counts[path] >= 0
    ? counts[path]
    : 0

  return {
    ...counts,
    [path]: Math.min(current + 1, Number.MAX_SAFE_INTEGER),
  }
}

export function selectFrequentWikiPages<T extends WikiVisitPage>(
  pages: T[],
  counts: WikiVisitCounts,
  limit = 2,
): T[] {
  const safeLimit = Math.max(0, Math.floor(limit))
  return pages
    .filter(page => (counts[page._path] || 0) > 0)
    .sort((a, b) => {
      const countDifference = (counts[b._path] || 0) - (counts[a._path] || 0)
      if (countDifference !== 0)
        return countDifference

      const dateDifference = (b.date || '').localeCompare(a.date || '')
      if (dateDifference !== 0)
        return dateDifference

      return a._path.localeCompare(b._path)
    })
    .slice(0, safeLimit)
}

export function readWikiVisitCounts(): WikiVisitCounts {
  if (typeof localStorage === 'undefined')
    return {}

  try {
    return parseWikiVisitCounts(localStorage.getItem(WIKI_VISIT_COUNTS_STORAGE_KEY))
  }
  catch {
    return {}
  }
}

export function recordWikiVisit(path: string): void {
  if (typeof localStorage === 'undefined' || !isWikiArticlePath(path))
    return

  try {
    const next = incrementWikiVisitCount(readWikiVisitCounts(), path)
    localStorage.setItem(WIKI_VISIT_COUNTS_STORAGE_KEY, JSON.stringify(next))
  }
  catch {
    // 存储不可用不应影响 Wiki 阅读
  }
}

export function normalizeWikiVisitsFile(input: unknown): WikiVisitsFile {
  const fallback: WikiVisitsFile = {
    counts: {},
    appliedSyncIds: [],
    updatedAt: '',
  }

  if (!input || typeof input !== 'object' || Array.isArray(input))
    return fallback

  const raw = input as Partial<WikiVisitsFile>
  const counts = sanitizeWikiCounts(raw.counts)
  const appliedSyncIds = Array.isArray(raw.appliedSyncIds)
    ? raw.appliedSyncIds.filter((item): item is string => typeof item === 'string').slice(-MAX_APPLIED_SYNC_IDS)
    : []
  const updatedAt = typeof raw.updatedAt === 'string' ? raw.updatedAt : ''

  return { counts, appliedSyncIds, updatedAt }
}

export function serializeWikiVisitsFile(file: WikiVisitsFile): string {
  return `${JSON.stringify(normalizeWikiVisitsFile(file), null, 2)}\n`
}

export function applyWikiVisitSync(
  file: WikiVisitsFile,
  batch: WikiVisitSyncBatch,
  nowIso: string,
): WikiVisitsFile {
  const normalized = normalizeWikiVisitsFile(file)
  assertBatchId(batch.id)
  const increments = assertWikiVisitSyncIncrements(batch.counts)

  if (normalized.appliedSyncIds.includes(batch.id))
    return normalized

  const nextCounts: WikiVisitCounts = { ...normalized.counts }

  for (const [path, increment] of Object.entries(increments)) {
    const current = nextCounts[path] ?? 0
    if (!Number.isSafeInteger(current) || current < 0)
      throw new Error(`Invalid existing wiki visit count for path: ${path}`)
    if (current > Number.MAX_SAFE_INTEGER - increment)
      throw new Error('Wiki visit count addition exceeds Number.MAX_SAFE_INTEGER')
    nextCounts[path] = current + increment
  }

  return {
    counts: nextCounts,
    appliedSyncIds: [...normalized.appliedSyncIds, batch.id].slice(-MAX_APPLIED_SYNC_IDS),
    updatedAt: nowIso,
  }
}

function parseWikiVisitSyncBatch(raw: string | null): WikiVisitSyncBatch | null {
  if (!raw)
    return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return null

    const batch = parsed as Partial<WikiVisitSyncBatch>
    if (typeof batch.id !== 'string')
      return null
    assertBatchId(batch.id)

    const counts = assertWikiVisitSyncIncrements(batch.counts)
    return { id: batch.id, counts }
  }
  catch {
    return null
  }
}

function writeWikiVisitSyncBatch(batch: WikiVisitSyncBatch | null): boolean {
  if (typeof localStorage === 'undefined')
    return false

  try {
    if (!batch) {
      localStorage.removeItem(WIKI_VISIT_SYNC_BATCH_STORAGE_KEY)
      return true
    }
    localStorage.setItem(WIKI_VISIT_SYNC_BATCH_STORAGE_KEY, JSON.stringify(batch))
    return true
  }
  catch {
    return false
  }
}

export function prepareWikiVisitSyncBatch(id: string): WikiVisitSyncBatch | null {
  assertBatchId(id)
  if (typeof localStorage === 'undefined')
    return null

  try {
    const existing = parseWikiVisitSyncBatch(localStorage.getItem(WIKI_VISIT_SYNC_BATCH_STORAGE_KEY))
    if (existing)
      return existing

    const counts = readWikiVisitCounts()
    if (Object.keys(counts).length === 0)
      return null

    const batch: WikiVisitSyncBatch = { id, counts }
    if (!writeWikiVisitSyncBatch(batch))
      return null

    try {
      localStorage.removeItem(WIKI_VISIT_COUNTS_STORAGE_KEY)
    }
    catch {
      writeWikiVisitSyncBatch(null)
      return null
    }
    return batch
  }
  catch {
    return null
  }
}

export function completeWikiVisitSyncBatch(id: string): void {
  assertBatchId(id)
  if (typeof localStorage === 'undefined')
    return

  try {
    const existing = parseWikiVisitSyncBatch(localStorage.getItem(WIKI_VISIT_SYNC_BATCH_STORAGE_KEY))
    if (existing && existing.id === id)
      localStorage.removeItem(WIKI_VISIT_SYNC_BATCH_STORAGE_KEY)
  }
  catch {
    // 存储不可用不应影响 Wiki 阅读
  }
}

export function getPendingWikiVisitTotal(): number {
  if (typeof localStorage === 'undefined')
    return 0

  try {
    const batch = parseWikiVisitSyncBatch(localStorage.getItem(WIKI_VISIT_SYNC_BATCH_STORAGE_KEY))
    const counts = [
      ...Object.values(batch?.counts || {}),
      ...Object.values(readWikiVisitCounts()),
    ]
    return counts.reduce(
      (total, count) => Math.min(total + count, Number.MAX_SAFE_INTEGER),
      0,
    )
  }
  catch {
    return 0
  }
}
