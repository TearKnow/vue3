import { loadWikiOrderFile } from '../../utils/wiki-order'

// 与 visits / plans 一致：优先 GitHub，本地兜底
export default defineEventHandler(async () => {
  const { groups } = await loadWikiOrderFile()
  return { groups }
})
