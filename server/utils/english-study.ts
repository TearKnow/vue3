import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { getTodayDateString } from '../../utils/beijing-time'
import { getWikiGitHubConfig, readGithubFile, writeGithubFile } from './wiki-github'

export interface EnglishStudyData {
  records: Record<string, boolean>
}

export const ENGLISH_STUDY_FILE_PATH = 'data/english-study/english-study.json'

const workspaceRoot = process.cwd()

const EMPTY_ENGLISH_STUDY_DATA: EnglishStudyData = {
  records: {},
}

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function parseEnglishStudyData(raw: string): EnglishStudyData {
  try {
    const parsed = JSON.parse(raw) as Partial<EnglishStudyData>
    const records: Record<string, boolean> = {}
    if (parsed.records && typeof parsed.records === 'object') {
      for (const [date, checked] of Object.entries(parsed.records)) {
        if (isValidDateKey(date) && checked === true)
          records[date] = true
      }
    }

    return { records }
  }
  catch {
    return { ...EMPTY_ENGLISH_STUDY_DATA }
  }
}

export function serializeEnglishStudyData(data: EnglishStudyData) {
  return `${JSON.stringify(data, null, 2)}\n`
}

export function markEnglishStudyDone(data: EnglishStudyData, date: string): EnglishStudyData {
  return {
    ...data,
    records: {
      ...data.records,
      [date]: true,
    },
  }
}

async function readLocalEnglishStudyFile() {
  try {
    const content = await readFile(resolve(workspaceRoot, ENGLISH_STUDY_FILE_PATH), 'utf8')
    return { content, sha: '' }
  }
  catch {
    return null
  }
}

async function writeLocalEnglishStudyFile(content: string) {
  const fullPath = resolve(workspaceRoot, ENGLISH_STUDY_FILE_PATH)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf8')
}

export async function writeEnglishStudyFile(data: EnglishStudyData, sha = '', message?: string) {
  const content = serializeEnglishStudyData(data)
  const commitMessage = message || `english-study: ${getTodayDateString()}`
  const { token } = getWikiGitHubConfig()

  if (token) {
    await writeGithubFile(ENGLISH_STUDY_FILE_PATH, content, commitMessage, sha)
    return
  }

  await writeLocalEnglishStudyFile(content)
}

export async function loadEnglishStudyData() {
  const local = await readLocalEnglishStudyFile()
  const remote = await readGithubFile(ENGLISH_STUDY_FILE_PATH)
  const content = local?.content || remote?.content || serializeEnglishStudyData(EMPTY_ENGLISH_STUDY_DATA)

  return {
    data: parseEnglishStudyData(content),
    sha: remote?.sha || '',
  }
}
