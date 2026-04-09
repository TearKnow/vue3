// @ts-nocheck
import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolve } from 'node:path'

const execFileAsync = promisify(execFile)
const workspaceRoot = process.cwd()

export type ProjectTreeNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: ProjectTreeNode[]
}

export async function listVisibleProjectFiles() {
  const { stdout } = await execFileAsync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard'],
    {
      cwd: workspaceRoot,
      maxBuffer: 10 * 1024 * 1024,
    },
  )

  return stdout
    .split('\n')
    .map(item => item.trim().replaceAll('\\', '/'))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
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

export async function readVisibleProjectFile(filePath: string) {
  const normalizedPath = filePath.replaceAll('\\', '/').replace(/^\/+/, '')
  const files = await listVisibleProjectFiles()

  if (!files.includes(normalizedPath))
    return null

  const absolutePath = resolve(workspaceRoot, normalizedPath)
  return readFile(absolutePath, 'utf8')
}
