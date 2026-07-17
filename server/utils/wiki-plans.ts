import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import {
  normalizeWikiPlansFile,
  serializeWikiPlansFile,
  type WikiPlansFile,
} from '../../utils/wiki-plans'
import { getWikiGitHubConfig, readGithubFile, writeGithubFile } from './wiki-github'

export const WIKI_PLANS_FILE_PATH = 'data/wiki/plans.json'

const workspaceRoot = process.cwd()
const EMPTY_WIKI_PLANS: WikiPlansFile = {
  plans: [],
  updatedAt: '',
}

async function readLocalWikiPlansFile() {
  try {
    const content = await readFile(resolve(workspaceRoot, WIKI_PLANS_FILE_PATH), 'utf8')
    return { content, sha: '' }
  }
  catch {
    return null
  }
}

async function writeLocalWikiPlansFile(content: string) {
  const fullPath = resolve(workspaceRoot, WIKI_PLANS_FILE_PATH)
  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf8')
}

export async function loadWikiPlansFile() {
  let remote: Awaited<ReturnType<typeof readGithubFile>> = null
  try {
    remote = await readGithubFile(WIKI_PLANS_FILE_PATH)
  }
  catch {
    // GitHub 暂时不可用时回退到部署内置数据
  }

  const local = remote?.content ? null : await readLocalWikiPlansFile()
  const content = remote?.content || local?.content
  let data = EMPTY_WIKI_PLANS

  if (content) {
    try {
      data = normalizeWikiPlansFile(JSON.parse(content))
    }
    catch {
      data = EMPTY_WIKI_PLANS
    }
  }

  return { data, sha: remote?.sha || '' }
}

export async function writeWikiPlansFile(data: WikiPlansFile, sha = ''): Promise<string> {
  const content = serializeWikiPlansFile(data)
  const { token } = getWikiGitHubConfig()

  if (token) {
    const result = await writeGithubFile(
      WIKI_PLANS_FILE_PATH,
      content,
      'wiki: update plans',
      sha,
    ) as { content?: { sha?: string } }
    return result.content?.sha || ''
  }

  await writeLocalWikiPlansFile(content)
  return ''
}
