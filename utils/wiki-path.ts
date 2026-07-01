/** Wiki 路径统一为小写，避免 Windows / Linux 大小写冲突 */

export function normalizeWikiSlug(slug: string): string {
  return slug
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)
    .map(seg => seg.toLowerCase())
    .join('/')
}

export function normalizeWikiPath(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  if (normalized === '/wiki' || normalized === '/wiki/')
    return '/wiki'

  const rel = normalized.replace(/^\/wiki\/?/, '')
  const slug = normalizeWikiSlug(rel)
  return slug ? `/wiki/${slug}` : '/wiki'
}

export function normalizeWikiOrderGroups(groups: Record<string, string[]>): Record<string, string[]> {
  const merged = new Map<string, string[]>()

  for (const [parent, paths] of Object.entries(groups)) {
    const key = normalizeWikiPath(parent)
    const existing = merged.get(key) || []
    const seen = new Set(existing.map(item => item.toLowerCase()))

    for (const path of paths) {
      const normalizedPath = normalizeWikiPath(path)
      const lookup = normalizedPath.toLowerCase()
      if (!seen.has(lookup)) {
        seen.add(lookup)
        existing.push(normalizedPath)
      }
    }

    merged.set(key, existing)
  }

  return Object.fromEntries(merged)
}

export function wikiPathToContentFile(wikiPath: string) {
  const rel = normalizeWikiSlug(wikiPath.replace(/^\/wiki\/?/, ''))
  return `content/wiki/${rel}.md`
}

export function isValidWikiSlug(slug: string) {
  if (!slug || slug.includes('..'))
    return false

  const normalized = normalizeWikiSlug(slug)
  if (!normalized)
    return false

  return !normalized.split('/').some(seg => !seg || seg.startsWith('_'))
}

export function stripWikiFrontmatter(raw: string) {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim()
}
