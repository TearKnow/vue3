import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { getTodayDateString } from '../../utils/beijing-time'
import {
  buildCumulativeSeries,
  DEFAULT_CHECKIN_DAYS,
  type CheckinChartData,
  type CheckinData,
  type CheckinDayOption,
  type CheckinItem,
  type CheckinSeries,
  parseCheckinDays,
} from '../../utils/checkin-chart'
import { getWikiGitHubConfig, readGithubFile, writeGithubFile } from './wiki-github'

export { getTodayDateString }

export const CHECKIN_FILE_PATH = 'data/checkin/checkin.json'
export const CHECKIN_DAYS = DEFAULT_CHECKIN_DAYS

export type { CheckinChartData, CheckinData, CheckinDayOption, CheckinItem, CheckinSeries }
export { buildCumulativeSeries, parseCheckinDays }

const workspaceRoot = process.cwd()

const EMPTY_CHECKIN_DATA: CheckinData = {
  items: [],
  records: {},
}

function normalizeItemIds(ids: unknown): number[] {
  if (!Array.isArray(ids))
    return []

  const unique = new Set<number>()
  for (const id of ids) {
    const num = Number(id)
    if (Number.isInteger(num) && num > 0)
      unique.add(num)
  }

  return [...unique].sort((a, b) => a - b)
}

export function parseCheckinData(raw: string): CheckinData {
  try {
    const parsed = JSON.parse(raw) as Partial<CheckinData>
    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((item) => {
            const id = Number((item as CheckinItem).id)
            const label = String((item as CheckinItem).label || '').trim()
            if (!Number.isInteger(id) || id <= 0 || !label)
              return null
            return { id, label }
          })
          .filter((item): item is CheckinItem => item !== null)
      : []

    const records: Record<string, number[]> = {}
    if (parsed.records && typeof parsed.records === 'object') {
      for (const [date, ids] of Object.entries(parsed.records)) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(date))
          records[date] = normalizeItemIds(ids)
      }
    }

    return { items, records }
  }
  catch {
    return { ...EMPTY_CHECKIN_DATA }
  }
}

export function serializeCheckinData(data: CheckinData) {
  return `${JSON.stringify(data, null, 2)}\n`
}

export function sanitizeCheckinSave(data: CheckinData, date: string, itemIds: number[]) {
  const validIds = new Set(data.items.map(item => item.id))
  const nextIds = normalizeItemIds(itemIds).filter(id => validIds.has(id))

  return {
    ...data,
    records: {
      ...data.records,
      [date]: nextIds,
    },
  }
}

async function readLocalCheckinFile() {
  try {
    const content = await readFile(resolve(workspaceRoot, CHECKIN_FILE_PATH), 'utf8')
    return { content, sha: '' }
  }
  catch {
    return null
  }
}

async function writeLocalCheckinFile(content: string) {
  const fullPath = resolve(workspaceRoot, CHECKIN_FILE_PATH)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf8')
}

export async function readCheckinFile() {
  const local = await readLocalCheckinFile()
  if (local)
    return local

  const remote = await readGithubFile(CHECKIN_FILE_PATH)
  if (remote?.content)
    return remote

  return {
    content: serializeCheckinData(EMPTY_CHECKIN_DATA),
    sha: '',
  }
}

export async function writeCheckinFile(data: CheckinData, sha = '', message?: string) {
  const content = serializeCheckinData(data)
  const commitMessage = message || `checkin: ${getTodayDateString()}`
  const { token } = getWikiGitHubConfig()

  if (token) {
    await writeGithubFile(CHECKIN_FILE_PATH, content, commitMessage, sha)
    return
  }

  await writeLocalCheckinFile(content)
}

export async function loadCheckinData() {
  const local = await readLocalCheckinFile()
  const remote = await readGithubFile(CHECKIN_FILE_PATH)
  const content = local?.content || remote?.content || serializeCheckinData(EMPTY_CHECKIN_DATA)

  return {
    data: parseCheckinData(content),
    sha: remote?.sha || '',
  }
}
