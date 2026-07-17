import { loadWikiVisitsFile } from '../../../utils/wiki-visits'

export default defineEventHandler(async () => {
  const { data } = await loadWikiVisitsFile()
  return {
    counts: data.counts,
    updatedAt: data.updatedAt,
  }
})
