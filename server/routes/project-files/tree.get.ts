import { buildProjectTree, listVisibleProjectFiles } from '../../utils/project-files'

export default defineEventHandler(async () => {
  const files = await listVisibleProjectFiles()

  return {
    items: buildProjectTree(files),
    total: files.length,
  }
})
