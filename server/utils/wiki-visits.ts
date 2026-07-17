import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import {
  normalizeWikiVisitsFile,
  serializeWikiVisitsFile,
  type WikiVisitsFile,
} from '../../utils/wiki-visit-counts'
import { getWikiGitHubConfig, readGithubFile, writeGithubFile } from './wiki-github'

export const WIKI_VISITS_FILE_PATH = 'data/wiki/visits.json'

const workspaceRoot = process.cwd()
const EMPTY_WIKI_VISITS: WikiVisitsFile = {
  counts: {},
  appliedSyncIds: [],
  updatedAt: '',
}

async function readLocalWikiVisitsFile() {
  try {
    const content = await readFile(resolve(workspaceRoot, WIKI_VISITS_FILE_PATH), 'utf8')
    return { content, sha: '' }
  }
  catch {
    return null
  }
}

async function writeLocalWikiVisitsFile(content: string) {
  const fullPath = resolve(workspaceRoot, WIKI_VISITS_FILE_PATH)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf8')
}

export async function loadWikiVisitsFile() {
  let remote: Awaited<ReturnType<typeof readGithubFile>> = null
  try {
    remote = await readGithubFile(WIKI_VISITS_FILE_PATH)
  }
  catch {
    // GitHub 暂时不可用时回退到部署内置数据
  }

  const local = remote?.content ? null : await readLocalWikiVisitsFile()
  const content = remote?.content || local?.content
  let data = EMPTY_WIKI_VISITS

  if (content) {
    try {
      data = normalizeWikiVisitsFile(JSON.parse(content))
    }
    catch {
      data = EMPTY_WIKI_VISITS
    }
  }

  return { data, sha: remote?.sha || '' }
}

export async function writeWikiVisitsFile(data: WikiVisitsFile, sha = ''): Promise<string> {
  const content = serializeWikiVisitsFile(data)
  const { token } = getWikiGitHubConfig()

  if (token) {
    const result = await writeGithubFile(
      WIKI_VISITS_FILE_PATH,
      content,
      'wiki: sync visit counts',
      sha,
    ) as { content?: { sha?: string } }
    return result.content?.sha || ''
  }

  await writeLocalWikiVisitsFile(content)
  return ''
}
