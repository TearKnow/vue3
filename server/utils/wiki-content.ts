export function wikiPathToContentFile(wikiPath: string) {
  const rel = wikiPath.replace(/^\/wiki\/?/, '').replace(/\\/g, '/')
  return `content/wiki/${rel}.md`
}

export function isValidWikiSlug(slug: string) {
  if (!slug || slug.includes('..'))
    return false
  return !slug.split('/').some(seg => !seg || seg.startsWith('_'))
}

export function stripWikiFrontmatter(raw: string) {
  return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim()
}
