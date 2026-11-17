import { getRouterParam } from 'h3'
import { loadWordsBook } from '../../utils/words-vocabulary'

const CACHE_CONTROL = 'public, max-age=31536000, stale-while-revalidate=86400'

export default defineCachedEventHandler(
  async (event) => {
    const book = Number(getRouterParam(event, 'book'))
    setResponseHeader(event, 'Cache-Control', CACHE_CONTROL)
    return await loadWordsBook(book)
  },
  { maxAge: 60 * 60 * 24 * 365, swr: true },
)