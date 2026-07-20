import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { normalizeWikiOrderGroups } from './wiki-content'
import { readGithubFile, WIKI_ORDER_PATH } from './wiki-github'

const workspaceRoot = process.cwd()

async function readLocalWikiOrderFile() {
  try {
    const content = await readFile(resolve(workspaceRoot, WIKI_ORDER_PATH), 'utf8')
    return { content }
  }
  catch {
    return null
  }
}

/** 优先 GitHub，失败再读本地（与 visits / plans 一致，兼容 Vercel） */
export async function loadWikiOrderFile() {
  let remote: Awaited<ReturnType<typeof readGithubFile>> = null
  try {
    remote = await readGithubFile(WIKI_ORDER_PATH)
  }
  catch {
    // GitHub 暂时不可用时回退到本地文件
  }

  const local = remote?.content ? null : await readLocalWikiOrderFile()
  const content = remote?.content || local?.content
  let groups: Record<string, string[]> = {}

  if (content) {
    try {
      const parsed = JSON.parse(content) as { groups?: Record<string, string[]> }
      groups = normalizeWikiOrderGroups(parsed.groups || {})
    }
    catch {
      groups = {}
    }
  }

  return { groups, sha: remote?.sha || '' }
}
