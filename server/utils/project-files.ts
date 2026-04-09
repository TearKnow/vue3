// @ts-nocheck
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'

const execFileAsync = promisify(execFile)
const workspaceRoot = process.cwd()
const GITHUB_API = 'https://api.github.com'

export type ProjectTreeNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: ProjectTreeNode[]
}

function getGitHubConfig() {
  return {
    owner: process.env.GITHUB_OWNER || 'TearKnow',
    repo: process.env.GITHUB_REPO || 'vue3',
    branch: process.env.GITHUB_BRANCH || 'main',
    token: process.env.GITHUB_TOKEN || '',
  }
}

function githubHeaders() {
  const { token } = getGitHubConfig()
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'nuxt-file-browser',
  }
  if (token)
    headers.Authorization = `Bearer ${token}`
  return headers
}

// ── Local git ──

async function listFilesLocal(): Promise<string[]> {
  const { stdout } = await execFileAsync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    { cwd: workspaceRoot, maxBuffer: 10 * 1024 * 1024 },
  )
  return stdout
    .split('\n')
    .map(s => s.trim().replaceAll('\\', '/'))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

async function readFileLocal(filePath: string): Promise<string | null> {
  const normalizedPath = filePath.replaceAll('\\', '/').replace(/^\/+/, '')
  const files = await listFilesLocal()
  if (!files.includes(normalizedPath))
    return null
  return readFile(resolve(workspaceRoot, normalizedPath), 'utf8')
}

// ── GitHub API ──

let treeCache: { files: string[], ts: number } | null = null
const TREE_CACHE_TTL = 5 * 60_000

async function listFilesGitHub(): Promise<string[]> {
  if (treeCache && Date.now() - treeCache.ts < TREE_CACHE_TTL)
    return treeCache.files

  const { owner, repo, branch } = getGitHubConfig()
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  const res = await fetch(url, { headers: githubHeaders() })

  if (!res.ok)
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`)

  const data = (await res.json()) as { tree: { path: string, type: string }[] }
  const files = data.tree
    .filter(item => item.type === 'blob')
    .map(item => item.path)
    .sort((a, b) => a.localeCompare(b))

  treeCache = { files, ts: Date.now() }
  return files
}

async function readFileGitHub(filePath: string): Promise<string | null> {
  const { owner, repo, branch } = getGitHubConfig()
  const normalizedPath = filePath.replaceAll('\\', '/').replace(/^\/+/, '')
  const encodedPath = normalizedPath.split('/').map(encodeURIComponent).join('/')
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${branch}`
  const res = await fetch(url, { headers: githubHeaders() })

  if (!res.ok)
    return null

  const data = (await res.json()) as { content?: string, encoding?: string }
  if (data.encoding === 'base64' && data.content)
    return Buffer.from(data.content, 'base64').toString('utf8')

  return data.content ?? null
}

// ── Public API: local → GitHub fallback ──

export async function listVisibleProjectFiles(): Promise<string[]> {
  try {
    return await listFilesLocal()
  }
  catch {
    return await listFilesGitHub()
  }
}

export async function readVisibleProjectFile(filePath: string): Promise<string | null> {
  try {
    return await readFileLocal(filePath)
  }
  catch {
    return await readFileGitHub(filePath)
  }
}

export function buildProjectTree(files: string[]) {
  const root: ProjectTreeNode[] = []

  files.forEach((filePath) => {
    const segments = filePath.split('/').filter(Boolean)
    let currentLevel = root
    let currentPath = ''

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      const isFile = index === segments.length - 1
      let node = currentLevel.find(item => item.name === segment)

      if (!node) {
        node = {
          name: segment,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
        }
        currentLevel.push(node)
      }

      if (!isFile) {
        node.type = 'directory'
        node.children ??= []
        currentLevel = node.children
      }
    })
  })

  sortTree(root)
  return root
}

function sortTree(nodes: ProjectTreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type)
      return a.type === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  nodes.forEach((node) => {
    if (node.children)
      sortTree(node.children)
  })
}
