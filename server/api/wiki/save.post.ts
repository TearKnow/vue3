// POST /api/wiki/save — 保存 wiki 页面到 GitHub
const GITHUB_API = 'https://api.github.com'

function getGitHubConfig() {
  return {
    owner: process.env.GITHUB_OWNER || 'TearKnow',
    repo: process.env.GITHUB_REPO || 'vue3',
    branch: process.env.GITHUB_BRANCH || 'main',
    token: process.env.GITHUB_TOKEN || '',
  }
}

function githubHeaders(token: string) {
  return {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'nuxt-wiki-editor',
    Authorization: `Bearer ${token}`,
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { slug, title, content, password } = body || {}

  // 校验必填字段
  if (!slug || !title || !password) {
    throw createError({ statusCode: 400, statusMessage: 'slug, title, password 为必填字段' })
  }

  // 校验密码
  const wikiPassword = process.env.WIKI_PASSWORD || ''
  if (!wikiPassword) {
    throw createError({ statusCode: 500, statusMessage: '服务器未配置 WIKI_PASSWORD 环境变量' })
  }
  if (password !== wikiPassword) {
    throw createError({ statusCode: 401, statusMessage: '密码错误' })
  }

  // 生成带 frontmatter 的 markdown 文件内容
  const today = new Date().toISOString().slice(0, 10)
  const fileContent = [
    '---',
    `title: ${title}`,
    `date: ${today}`,
    '---',
    '',
    (content || '').trim(),
  ].join('\n')

  const { owner, repo, branch, token } = getGitHubConfig()
  if (!token) {
    throw createError({ statusCode: 500, statusMessage: '服务器未配置 GITHUB_TOKEN 环境变量' })
  }

  const filePath = `content/wiki/${slug}.md`
  const encodedPath = filePath.split('/').map(encodeURIComponent).join('/')
  const apiUrl = `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}`

  // 先检查文件是否已存在（获取 sha，更新时需要）
  let existingSha = ''
  try {
    const getRes = await fetch(`${apiUrl}?ref=${branch}`, { headers: githubHeaders(token) })
    if (getRes.ok) {
      const existing = await getRes.json() as { sha?: string }
      existingSha = existing.sha || ''
    }
  }
  catch {
    // 文件不存在，继续创建
  }

  // 调用 GitHub Contents API 创建/更新文件
  const putBody: Record<string, string> = {
    message: `wiki: ${existingSha ? 'update' : 'create'} ${slug}`,
    content: Buffer.from(fileContent, 'utf8').toString('base64'),
    branch,
  }
  if (existingSha) {
    putBody.sha = existingSha
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: githubHeaders(token),
    body: JSON.stringify(putBody),
  })

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}))
    throw createError({
      statusCode: putRes.status,
      statusMessage: `GitHub API 错误: ${(err as any).message || putRes.statusText}`,
    })
  }

  const result = await putRes.json() as {
    content?: { sha?: string; html_url?: string }
    commit?: { sha?: string; html_url?: string }
  }

  return {
    success: true,
    slug,
    action: existingSha ? 'updated' : 'created',
    commit: {
      sha: result.commit?.sha,
      url: result.commit?.html_url,
    },
  }
})
