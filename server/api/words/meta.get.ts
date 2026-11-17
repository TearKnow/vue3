import { loadWordsMeta } from '../../utils/words-vocabulary'

const CACHE_CONTROL = 'public, max-age=31536000, stale-while-revalidate=86400'

export default defineCachedEventHandler(
  async (event) => {
    setResponseHeader(event, 'Cache-Control', CACHE_CONTROL)
    return await loadWordsMeta()
  },
  { maxAge: 60 * 60 * 24 * 365, swr: true },
)