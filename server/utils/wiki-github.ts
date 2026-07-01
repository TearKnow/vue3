import { normalizeWikiOrderGroups } from './wiki-content'

const GITHUB_API = 'https://api.github.com'
const WIKI_ORDER_PATH = 'data/wiki/_order.json'

export function getWikiGitHubConfig() {
  return {
    owner: process.env.GITHUB_OWNER || 'TearKnow',
    repo: process.env.GITHUB_REPO || 'vue3',
    branch: process.env.GITHUB_BRANCH || 'main',
    token: process.env.GITHUB_TOKEN || '',
  }
}

export function wikiGithubHeaders(token: string) {
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'nuxt-wiki-editor',
    Authorization: `Bearer ${token}`,
  }
}

export function assertWikiPassword(password: string) {
  const wikiPassword = process.env.WIKI_PASSWORD || ''
  if (!wikiPassword) {
    throw createError({ statusCode: 500, statusMessage: '服务器未配置 WIKI_PASSWORD 环境变量' })
  }
  if (password !== wikiPassword) {
    throw createError({ statusCode: 401, statusMessage: '密码错误' })
  }
}

function encodeRepoPath(filePath: string) {
  return filePath.split('/').map(encodeURIComponent).join('/')
}

export async function readGithubFile(filePath: string) {
  const { owner, repo, branch, token } = getWikiGitHubConfig()
  if (!token)
    return null

  const apiUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeRepoPath(filePath)}?ref=${branch}`
  const res = await fetch(apiUrl, { headers: wikiGithubHeaders(token) })
  if (!res.ok)
    return null

  const data = await res.json() as { content?: string, encoding?: string, sha?: string }
  if (data.encoding === 'base64' && data.content) {
    return {
      content: Buffer.from(data.content, 'base64').toString('utf8'),
      sha: data.sha || '',
    }
  }

  return {
    content: data.content || '',
    sha: data.sha || '',
  }
}

export async function writeGithubFile(filePath: string, content: string, message: string, sha = '') {
  const { owner, repo, branch, token } = getWikiGitHubConfig()
  if (!token) {
    throw createError({ statusCode: 500, statusMessage: '服务器未配置 GITHUB_TOKEN 环境变量' })
  }

  const apiUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeRepoPath(filePath)}`
  const putBody: Record<string, string> = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
  }
  if (sha)
    putBody.sha = sha

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: wikiGithubHeaders(token),
    body: JSON.stringify(putBody),
  })

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}))
    throw createError({
      statusCode: putRes.status,
      statusMessage: `GitHub API 错误: ${(err as { message?: string }).message || putRes.statusText}`,
    })
  }

  return putRes.json()
}

export function parseWikiFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match)
    return {}

  const meta: Record<string, string | number> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':')
    if (idx === -1)
      continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key === 'order') {
      const num = Number(value)
      if (!Number.isNaN(num))
        meta.order = num
      continue
    }
    meta[key] = value
  }
  return meta
}

export async function readWikiOrderFileFromGithub() {
  const file = await readGithubFile(WIKI_ORDER_PATH)
  if (!file?.content)
    return { groups: {} as Record<string, string[]>, sha: '' }

  try {
    const parsed = JSON.parse(file.content) as { groups?: Record<string, string[]> }
    return {
      groups: normalizeWikiOrderGroups(parsed.groups || {}),
      sha: file.sha,
    }
  }
  catch {
    return { groups: {}, sha: file.sha }
  }
}

export async function writeWikiOrderFileToGithub(groups: Record<string, string[]>, sha = '') {
  const content = `${JSON.stringify({ groups: normalizeWikiOrderGroups(groups) }, null, 2)}\n`
  return writeGithubFile(WIKI_ORDER_PATH, content, 'wiki: update sidebar order', sha)
}

export { WIKI_ORDER_PATH }
