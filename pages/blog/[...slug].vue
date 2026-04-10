<template>
  <div class="blog-article">
    <p class="back">
      <NuxtLink to="/blog">← 全部文章</NuxtLink>
    </p>

    <article v-if="post">
      <header class="article-head">
        <h1>{{ post.title }}</h1>
        <p v-if="post.description" class="article-desc">{{ post.description }}</p>
        <div class="article-meta">
          <time v-if="post.date" :datetime="String(post.date)">{{ post.date }}</time>
          <span v-if="articleTags.length" class="tags">
            <NuxtLink
              v-for="t in articleTags"
              :key="t"
              :to="`/blog/tag/${encodeURIComponent(t)}`"
              class="mini-tag"
            >
              {{ t }}
            </NuxtLink>
          </span>
        </div>
      </header>

      <nav v-if="tocLinks.length" class="toc">
        <h2>目录</h2>
        <ul>
          <li v-for="item in tocLinks" :key="item.id">
            <a :href="`#${item.id}`">{{ item.text }}</a>
          </li>
        </ul>
      </nav>

      <ContentRenderer v-if="post" :value="post" class="article-body" />

      <section v-if="prevPost || nextPost" class="neighbors">
        <NuxtLink v-if="prevPost?.urlPath" :to="prevPost.urlPath" class="neighbor prev">
          ← 上一篇：{{ prevPost.title || '未命名' }}
        </NuxtLink>
        <NuxtLink v-if="nextPost?.urlPath" :to="nextPost.urlPath" class="neighbor next">
          下一篇：{{ nextPost.title || '未命名' }} →
        </NuxtLink>
      </section>

      <section class="comments">
        <h2>评论</h2>
        <UtterancesComments repo="TearKnow/comments" issue-term="pathname" />
      </section>
    </article>

    <p v-else-if="pending" class="state">加载中…</p>
    <p v-else class="state error">找不到这篇文章。</p>
  </div>
</template>

<script setup lang="ts">
import type { BlogPostMeta } from '~/composables/useBlogPosts'
import { fetchBlogMetaList, pathToSlug } from '~/composables/useBlogPosts'

const route = useRoute()
const currentSlug = computed(() => decodeURIComponent(route.path.replace(/^\/blog\//, '').replace(/\/$/, '')))

const { data: post, pending, error, refresh } = await useAsyncData(
  () => `blog-current-post-${currentSlug.value}`,
  async () => {
    const docs = await queryContent('/blog').find()
    const matched = (docs as Array<Record<string, unknown>>).find((doc) => {
      const path = typeof doc._path === 'string' ? doc._path : ''
      return pathToSlug(path) === currentSlug.value
    })
    return matched ?? null
  },
)

watch(() => route.path, () => {
  refresh()
})

const { data: postNavList } = await useAsyncData<BlogPostMeta[]>('blog-post-nav', () => fetchBlogMetaList())

const currentIndex = computed(() =>
  (postNavList.value ?? []).findIndex((item) => item.slug === currentSlug.value),
)

const prevPost = computed(() => {
  const idx = currentIndex.value
  if (idx <= 0) return null
  return (postNavList.value ?? [])[idx - 1] ?? null
})

const nextPost = computed(() => {
  const idx = currentIndex.value
  if (idx < 0) return null
  return (postNavList.value ?? [])[idx + 1] ?? null
})

const articleTags = computed(() => {
  const t = post.value?.tags
  return Array.isArray(t) ? (t as string[]) : []
})

interface TocLinkNode {
  id?: string
  text?: string
  children?: TocLinkNode[]
}

const flattenTocLinks = (nodes: TocLinkNode[] = [], depth = 0): Array<{ id: string; text: string }> => {
  const result: Array<{ id: string; text: string }> = []
  for (const node of nodes) {
    if (node.id && node.text) {
      result.push({ id: node.id, text: `${'  '.repeat(depth)}${node.text}` })
    }
    if (Array.isArray(node.children) && node.children.length) {
      result.push(...flattenTocLinks(node.children, depth + 1))
    }
  }
  return result
}

const tocLinks = computed(() => {
  const toc = (post.value?.body as { toc?: { links?: TocLinkNode[] } } | undefined)?.toc?.links
  return flattenTocLinks(toc ?? [])
})

watchEffect(() => {
  if (!post.value?.title) return
  useSeoMeta({
    title: String(post.value.title),
    description: post.value.description ? String(post.value.description) : undefined,
  })
})

watchEffect(() => {
  if (pending.value || error.value) return
  if (!post.value) {
    showError(createError({ statusCode: 404, statusMessage: '文章未找到' }))
  }
})
</script>

<style scoped>
.blog-article {
  max-width: 820px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
}

.blog-article article {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
  padding: 1.4rem 1.2rem;
}

.back {
  margin: 0 0 1rem;
  font-size: 0.9rem;
}

.back a {
  color: #64748b;
  text-decoration: none;
}

.back a:hover {
  text-decoration: underline;
}

.article-head h1 {
  margin: 0 0 0.5rem;
  font-size: 1.95rem;
  line-height: 1.25;
  letter-spacing: 0.01em;
}

.article-desc {
  margin: 0 0 0.75rem;
  color: #475569;
  font-size: 1rem;
  line-height: 1.55;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 1.5rem;
}

.tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.38rem 0.55rem;
}

.mini-tag {
  display: inline-block;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  background: #eff6ff;
  color: #1e3a8a;
  text-decoration: none;
  font-size: 0.75rem;
  border: 1px solid #dbeafe;
}

.mini-tag:hover {
  background: #dbeafe;
}

.article-body :deep(h2) {
  margin: 1.5rem 0 0.5rem;
  font-size: 1.25rem;
}

.article-body :deep(h3) {
  margin: 1.25rem 0 0.4rem;
  font-size: 1.1rem;
}

.article-body :deep(p) {
  margin: 0.65rem 0;
  line-height: 1.65;
  color: #1e293b;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 0.5rem 0 0.5rem 1.25rem;
  line-height: 1.6;
}

.article-body :deep(pre) {
  margin: 1rem 0;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: #020617;
  color: #e2e8f0;
  overflow-x: auto;
  font-size: 0.85rem;
  border: 1px solid #0f172a;
}

.article-body :deep(code) {
  font-family: ui-monospace, monospace;
}

.article-body :deep(p code),
.article-body :deep(li code) {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: #f1f5f9;
  font-size: 0.88em;
}

.article-body :deep(blockquote) {
  margin: 1rem 0;
  padding: 0.45rem 0.8rem;
  border-left: 4px solid #93c5fd;
  background: #f8fafc;
  border-radius: 6px;
  color: #475569;
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.75rem 0;
}

.toc {
  margin: 1rem 0 1.25rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.toc h2 {
  margin: 0 0 0.45rem;
  font-size: 0.95rem;
}

.toc ul {
  margin: 0;
  padding-left: 1rem;
}

.toc li {
  margin: 0.25rem 0;
}

.toc a {
  color: #334155;
  text-decoration: none;
  font-size: 0.88rem;
}

.toc a:hover {
  color: #1d4ed8;
}

.neighbors {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 0.65rem;
  margin-top: 1.6rem;
}

.neighbor {
  display: inline-flex;
  align-items: center;
  border: 1px solid #dbeafe;
  background: #eff6ff;
  color: #1e3a8a;
  text-decoration: none;
  border-radius: 10px;
  padding: 0.42rem 0.7rem;
  font-size: 0.85rem;
  max-width: calc(50% - 0.35rem);
}

.neighbor.next {
  margin-left: auto;
  text-align: right;
}

.neighbor:hover {
  background: #dbeafe;
}

@media (max-width: 640px) {
  .neighbors {
    flex-direction: column;
  }

  .neighbor {
    max-width: 100%;
  }

  .neighbor.next {
    margin-left: 0;
    text-align: left;
  }
}

.comments {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.comments h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.state {
  color: #64748b;
}

.state.error {
  color: #b91c1c;
}
</style>
