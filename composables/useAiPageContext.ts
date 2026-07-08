import { normalizeWikiSlug } from '~/utils/wiki-path'

export interface AiPageContext {
  pageKey: string
  pagePath: string
  title: string
}

export function buildAiPageContext(path: string): AiPageContext {
  const pagePath = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'

  if (pagePath.startsWith('/wiki/') && pagePath !== '/wiki') {
    const slug = normalizeWikiSlug(pagePath.slice('/wiki/'.length))
    return {
      pageKey: `wiki:${slug}`,
      pagePath,
      title: slug,
    }
  }

  if (
    pagePath.startsWith('/blog/')
    && pagePath !== '/blog'
    && !pagePath.startsWith('/blog/tag/')
    && !pagePath.startsWith('/blog/archive/')
  ) {
    const slug = pagePath.slice('/blog/'.length)
    return {
      pageKey: `blog:${slug}`,
      pagePath,
      title: slug,
    }
  }

  return {
    pageKey: `route:${pagePath}`,
    pagePath,
    title: pagePath === '/' ? '首页' : pagePath,
  }
}

export function useAiPageContext() {
  const route = useRoute()

  return computed(() => buildAiPageContext(route.path))
}
