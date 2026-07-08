import { fetchBlogMetaList } from '~/composables/useBlogPosts'

export function useRandomBlogPost() {
  const route = useRoute()
  const router = useRouter()

  const { data: blogPosts } = useAsyncData('blog-random-pool', () =>
    fetchBlogMetaList({ includeContent: false }),
  )

  function pickRandomBlogPath() {
    const posts = (blogPosts.value || []).filter(post => post.urlPath)
    if (!posts.length)
      return null

    const currentPath = route.path.replace(/\/+$/, '') || '/'
    const candidates = posts.length > 1
      ? posts.filter(post => post.urlPath !== currentPath)
      : posts

    const index = Math.floor(Math.random() * candidates.length)
    return candidates[index]?.urlPath || null
  }

  async function goToRandomBlog() {
    const path = pickRandomBlogPath()
    if (path)
      await router.push(path)
  }

  return {
    goToRandomBlog,
  }
}
