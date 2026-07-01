export interface WikiTreeNode {
  name: string
  path: string
  urlPath: string
  title: string
  date?: string
  order?: number
  children: WikiTreeNode[]
  isPage: boolean
}

export interface WikiPageMeta {
  _path: string
  title?: string
  date?: string
  order?: number
}

export type WikiOrderGroups = Record<string, string[]>

export interface WikiOrderFile {
  groups: WikiOrderGroups
}

export function emptyWikiOrder(): WikiOrderFile {
  return { groups: {} }
}

function parentPathOf(path: string): string | null {
  if (path === '/wiki')
    return null
  const parent = path.substring(0, path.lastIndexOf('/'))
  return parent || '/wiki'
}

function compareWikiNodes(a: WikiTreeNode, b: WikiTreeNode, customOrder: string[]) {
  const aFolderOnly = a.children.length > 0 && !a.isPage
  const bFolderOnly = b.children.length > 0 && !b.isPage
  if (aFolderOnly !== bFolderOnly)
    return aFolderOnly ? -1 : 1

  const ai = customOrder.indexOf(a.path)
  const bi = customOrder.indexOf(b.path)
  if (ai !== -1 || bi !== -1) {
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  }

  const aOrder = a.order ?? Number.POSITIVE_INFINITY
  const bOrder = b.order ?? Number.POSITIVE_INFINITY
  if (aOrder !== bOrder)
    return aOrder - bOrder

  const dateCmp = (a.date || '').localeCompare(b.date || '')
  if (dateCmp !== 0)
    return dateCmp

  return a.title.localeCompare(b.title, 'zh-CN')
}

function sortWikiNodes(nodes: WikiTreeNode[], parentPath: string, orderFile: WikiOrderFile) {
  const customOrder = orderFile.groups[parentPath] || []
  nodes.sort((a, b) => compareWikiNodes(a, b, customOrder))
  nodes.forEach((node) => {
    if (node.children.length > 0)
      sortWikiNodes(node.children, node.path, orderFile)
  })
}

export function buildWikiTree(
  pages: WikiPageMeta[],
  orderFile: WikiOrderFile = emptyWikiOrder(),
): WikiTreeNode[] {
  const map = new Map<string, WikiTreeNode>()

  for (const page of pages) {
    if (!page._path || page._path === '/wiki')
      continue

    const segments = page._path.split('/').filter(Boolean)
    let acc = ''
    for (const seg of segments) {
      acc += `/${seg}`
      if (!map.has(acc)) {
        map.set(acc, {
          name: seg,
          path: acc,
          urlPath: acc,
          title: seg,
          children: [],
          isPage: false,
        })
      }
    }
  }

  const pageMap = new Map(pages.map(p => [p._path, p]))
  for (const [path, node] of map) {
    const page = pageMap.get(path)
    if (page) {
      node.isPage = true
      if (page.title) node.title = page.title
      if (page.date) node.date = page.date
      if (page.order != null) node.order = page.order
    }
  }

  for (const [, node] of map) {
    const parentPath = parentPathOf(node.path)
    if (!parentPath)
      continue
    const parent = map.get(parentPath)
    if (parent && parent !== node)
      parent.children.push(node)
  }

  const root = map.get('/wiki')
  if (!root)
    return []

  sortWikiNodes(root.children, '/wiki', orderFile)
  return root.children
}

export function sortWikiPages<T extends WikiPageMeta>(pages: T[], parentPath = '/wiki', orderFile: WikiOrderFile = emptyWikiOrder()) {
  const customOrder = orderFile.groups[parentPath] || []
  return [...pages].sort((a, b) => {
    const nodeA: WikiTreeNode = {
      name: '',
      path: a._path,
      urlPath: a._path,
      title: a.title || '',
      date: a.date,
      order: a.order,
      children: [],
      isPage: true,
    }
    const nodeB: WikiTreeNode = {
      name: '',
      path: b._path,
      urlPath: b._path,
      title: b.title || '',
      date: b.date,
      order: b.order,
      children: [],
      isPage: true,
    }
    return compareWikiNodes(nodeA, nodeB, customOrder)
  })
}

export function moveWikiPathInOrder(
  orderFile: WikiOrderFile,
  parentPath: string,
  path: string,
  direction: 'up' | 'down',
  siblingPaths: string[],
) {
  const groups = { ...orderFile.groups }
  let order = [...(groups[parentPath] || [])]

  for (const siblingPath of siblingPaths) {
    if (!order.includes(siblingPath))
      order.push(siblingPath)
  }

  const index = order.indexOf(path)
  if (index === -1)
    return orderFile

  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= order.length)
    return orderFile

  const next = [...order]
  const [item] = next.splice(index, 1)
  next.splice(targetIndex, 0, item)
  groups[parentPath] = next
  return { groups }
}

export async function fetchWikiOrderFile(): Promise<WikiOrderFile> {
  try {
    const data = await $fetch<{ content: string }>('/project-files/content', {
      query: { file: 'content/wiki/_order.json' },
    })
    const parsed = JSON.parse(data.content) as WikiOrderFile
    if (parsed?.groups && typeof parsed.groups === 'object')
      return parsed
  }
  catch {
    // ignore
  }
  return emptyWikiOrder()
}
