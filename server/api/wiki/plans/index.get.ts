import { loadWikiPlansFile } from '../../../utils/wiki-plans'

export default defineEventHandler(async () => {
  const { data, sha } = await loadWikiPlansFile()
  return {
    ...data,
    version: sha,
  }
})
