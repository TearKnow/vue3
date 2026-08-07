import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { getTodayDateString } from '../../utils/beijing-time'
import type { WeightData, WeightPerson } from '../../utils/weight-chart'
import { getWikiGitHubConfig, readGithubFile, writeGithubFile } from './wiki-github'

export const WEIGHT_FILE_PATH = 'data/weight/weight.json'

const workspaceRoot = process.cwd()

const EMPTY_WEIGHT_DATA: WeightData = {
  people: [],
  records: {},
}

export function parseWeightData(raw: string): WeightData {
  try {
    const parsed = JSON.parse(raw) as Partial<WeightData>

    const people: WeightPerson[] = Array.isArray(parsed.people)
      ? parsed.people
          .map((p) => {
            const id = Number((p as WeightPerson).id)
            const label = String((p as WeightPerson).label || '').trim()
            if (!Number.isInteger(id) || id <= 0 || !label)
              return null
            return { id, label }
          })
          .filter((p): p is WeightPerson => p !== null)
      : []

    const records: Record<string, Record<string, number>> = {}
    if (parsed.records && typeof parsed.records === 'object') {
      for (const [date, dayRecord] of Object.entries(parsed.records)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !dayRecord || typeof dayRecord !== 'object')
          continue

        const personWeights: Record<string, number> = {}
        for (const [personId, weight] of Object.entries(dayRecord as Record<string, unknown>)) {
          const num = Number(weight)
          if (Number.isFinite(num) && num > 0 && num <= 500)
            personWeights[personId] = Math.round(num * 10) / 10
        }

        if (Object.keys(personWeights).length > 0)
          records[date] = personWeights
      }
    }

    return { people, records }
  }
  catch {
    return { ...EMPTY_WEIGHT_DATA }
  }
}

export function serializeWeightData(data: WeightData) {
  return `${JSON.stringify(data, null, 2)}\n`
}

async function readLocalWeightFile() {
  try {
    const content = await readFile(resolve(workspaceRoot, WEIGHT_FILE_PATH), 'utf8')
    return { content, sha: '' }
  }
  catch {
    return null
  }
}

async function writeLocalWeightFile(content: string) {
  const fullPath = resolve(workspaceRoot, WEIGHT_FILE_PATH)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf8')
}

export async function readWeightFile() {
  const local = await readLocalWeightFile()
  if (local)
    return local

  const remote = await readGithubFile(WEIGHT_FILE_PATH)
  if (remote?.content)
    return remote

  return {
    content: serializeWeightData(EMPTY_WEIGHT_DATA),
    sha: '',
  }
}

export async function writeWeightFile(data: WeightData, sha = '', message?: string) {
  const content = serializeWeightData(data)
  const commitMessage = message || `weight: ${getTodayDateString()}`
  const { token } = getWikiGitHubConfig()

  if (token) {
    await writeGithubFile(WEIGHT_FILE_PATH, content, commitMessage, sha)
    return
  }

  await writeLocalWeightFile(content)
}

export async function loadWeightData() {
  const local = await readLocalWeightFile()
  const remote = await readGithubFile(WEIGHT_FILE_PATH)
  const content = local?.content || remote?.content || serializeWeightData(EMPTY_WEIGHT_DATA)

  return {
    data: parseWeightData(content),
    sha: remote?.sha || '',
  }
}
