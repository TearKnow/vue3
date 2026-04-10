<template>
  <div class="blog-article">
    <div class="top-bar">
      <p class="back">
        <NuxtLink to="/blog">← 全部文章</NuxtLink>
      </p>
      <button
        v-if="tocLinks.length"
        type="button"
        class="toc-toggle"
        :aria-expanded="tocOpen ? 'true' : 'false'"
        aria-controls="mobile-toc"
        @click="tocOpen = !tocOpen"
      >
        <span class="line" />
        <span class="line" />
        <span class="line" />
      </button>
    </div>

    <div
      v-if="tocLinks.length && tocOpen"
      class="toc-overlay"
      @click="tocOpen = false"
    />

    <div
      v-if="post"
      class="article-shell"
    >
      <article>
        <header class="article-head">
          <h1>{{ post.title }}</h1>
          <p
            v-if="post.description"
            class="article-desc"
          >
            {{ post.description }}
          </p>
          <div class="article-meta">
            <time
              v-if="post.date"
              :datetime="String(post.date)"
            >{{ post.date }}</time>
            <span
              v-if="articleTags.length"
              class="tags"
            >
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

        <ContentRenderer
          v-if="post"
          :value="post"
          class="article-body"
        />

        <section
          v-if="prevPost || nextPost"
          class="neighbors"
        >
          <NuxtLink
            v-if="prevPost?.urlPath"
            :to="prevPost.urlPath"
            class="neighbor prev"
          >
            ← 上一篇：{{ prevPost.title || '未命名' }}
          </NuxtLink>
          <NuxtLink
            v-if="nextPost?.urlPath"
            :to="nextPost.urlPath"
            class="neighbor next"
          >
            下一篇：{{ nextPost.title || '未命名' }} →
          </NuxtLink>
        </section>

        <section class="comments">
          <h2 v-show="commentsReady">
            评论
          </h2>
          <UtterancesComments
            repo="TearKnow/comments"
            issue-term="pathname"
            @ready="commentsReady = true"
          />
        </section>
      </article>

      <nav
        v-if="tocLinks.length"
        class="toc desktop-toc"
      >
        <h2>目录</h2>
        <ul>
          <li
            v-for="item in tocLinks"
            :key="item.id"
            :class="`depth-${item.depth}`"
          >
            <a :href="`#${item.id}`">{{ item.text }}</a>
          </li>
        </ul>
      </nav>
    </div>

    <nav
      v-if="tocLinks.length"
      id="mobile-toc"
      class="toc mobile-toc"
      :class="{ open: tocOpen }"
    >
      <h2>目录</h2>
      <ul>
        <li
          v-for="item in tocLinks"
          :key="item.id"
          :class="`depth-${item.depth}`"
        >
          <a
            :href="`#${item.id}`"
            @click="tocOpen = false"
          >{{ item.text }}</a>
        </li>
      </ul>
    </nav>

    <p
      v-else-if="pending"
      class="state"
    >
      加载中…
    </p>
    <p
      v-else
      class="state error"
    >
      找不到这篇文章。
    </p>

    <Transition name="fade-up">
      <button
        v-if="showToTop"
        type="button"
        class="back-to-top-btn"
        title="回到顶部"
        @click="scrollToTop"
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { BlogPostMeta } from '~/composables/useBlogPosts'
import { fetchBlogMetaList, pathToSlug } from '~/composables/useBlogPosts'

const route = useRoute()
const currentSlug = computed(() => decodeURIComponent(route.path.replace(/^\/blog\//, '').replace(/\/$/, '')))
const tocOpen = ref(false)
const lockedScrollTop = ref(0)
const showToTop = ref(false)
const commentsReady = ref(false)

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
  tocOpen.value = false
  refresh()
})

const onScroll = () => {
  showToTop.value = window.scrollY > 300
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(tocOpen, (open) => {
  if (import.meta.client) {
    const html = document.documentElement
    const body = document.body
    if (open) {
      lockedScrollTop.value = window.scrollY || window.pageYOffset || 0
      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = `-${lockedScrollTop.value}px`
      body.style.left = '0'
      body.style.right = '0'
      body.style.width = '100%'
      body.style.touchAction = 'none'
    }
    else {
      html.style.overflow = ''
      body.style.overflow = ''
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.width = ''
      body.style.touchAction = ''
      window.scrollTo(0, lockedScrollTop.value)
    }
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    const html = document.documentElement
    const body = document.body
    html.style.overflow = ''
    body.style.overflow = ''
    body.style.position = ''
    body.style.top = ''
    body.style.left = ''
    body.style.right = ''
    body.style.width = ''
    body.style.touchAction = ''
    window.removeEventListener('scroll', onScroll)
  }
})

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

const { data: postNavList } = await useAsyncData<BlogPostMeta[]>('blog-post-nav', () => fetchBlogMetaList())

const currentIndex = computed(() =>
  (postNavList.value ?? []).findIndex(item => item.slug === currentSlug.value),
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

const flattenTocLinks = (nodes: TocLinkNode[] = [], depth = 0): Array<{ id: string, text: string, depth: number }> => {
  const result: Array<{ id: string, text: string, depth: number }> = []
  for (const node of nodes) {
    if (node.id && node.text) {
      result.push({ id: node.id, text: node.text, depth })
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
:global(html) {
  overflow-x: clip;
}

.blog-article {
  padding: 2rem 1rem 3rem;
  --toc-toggle-right: calc(env(safe-area-inset-right, 0px) + 12px);
  --toc-toggle-size: 32px;
  --mobile-toc-gap: 10px;
}

.blog-article article {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
  padding: 1.4rem 1.2rem;
  min-width: 0;
}

.article-shell {
  display: block;
}

.back {
  margin: 0 0 1rem;
  font-size: 0.9rem;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.top-bar .back {
  margin: 0;
}

.back a {
  color: #64748b;
  text-decoration: none;
}

.back a:hover {
  text-decoration: underline;
}

.toc-toggle {
  display: inline-flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 32px;
  height: 32px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 0 7px;
  flex-shrink: 0;
  margin-left: 0.6rem;
  margin-right: 0.1rem;
  position: relative;
  z-index: 1002;
}

.toc-toggle .line {
  display: block;
  height: 2px;
  width: 100%;
  background: #1e3a8a;
}

.article-head h1 {
  margin: 0 0 0.5rem;
  font-size: 1.95rem;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: #0f172a;
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
  color: #0f172a;
}

.article-body :deep(h3) {
  margin: 1.25rem 0 0.4rem;
  font-size: 1rem;
  color: #1e293b;
}

.article-body :deep(p) {
  margin: 0.65rem 0;
  line-height: 1.65;
  color: #1e293b;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.article-body :deep(strong) {
  color: #334155;
  font-weight: 600;
}

.article-body :deep(a) {
  color: #3b6fc0;
  text-decoration: underline;
  text-decoration-color: #a8c4e0;
  text-underline-offset: 2px;
  transition: color 0.18s ease, text-decoration-color 0.18s ease;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.article-body :deep(a:hover) {
  color: #2b5aa0;
  text-decoration-color: #6a9fd8;
}

.article-body :deep(a:visited) {
  color: #3b6fc0;
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 0.5rem 0 0.5rem 1.25rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.article-body :deep(pre) {
  margin: 1rem 0;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: #020617;
  color: #e2e8f0;
  overflow-x: auto;
  max-width: 100%;
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

.article-body :deep(table) {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 1rem 0;
}

.article-body :deep(table th),
.article-body :deep(table td) {
  border: 1px solid #cbd5e1;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.article-body :deep(table th) {
  background: #f1f5f9;
  font-weight: 600;
  color: #0f172a;
}

.toc {
  margin: 1rem 0 1.25rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  max-height: calc(100vh - 2rem);
  overflow: auto;
  position: sticky;
  top: 1rem;
}

.mobile-toc {
  display: none;
  position: fixed;
  left: auto;
  right: var(--toc-toggle-right);
  top: 3.3rem;
  width: min(320px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  max-height: 70vh;
  overflow: auto;
  margin: 0;
  z-index: 1001;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.2);
  box-sizing: border-box;
  transform: translateX(calc(-1 * (var(--toc-toggle-size) + var(--mobile-toc-gap))));
}

.mobile-toc.open {
  display: block;
}

.toc-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.25);
  z-index: 1000;
}

.desktop-toc {
  display: none;
}

.toc h2 {
  margin: 0 0 0.45rem;
  font-size: 0.95rem;
}

.toc ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.toc li {
  margin: 0.1rem 0;
  position: relative;
}

.toc a {
  color: #334155;
  text-decoration: none;
  font-size: 0.86rem;
  display: block;
  padding: 0.28rem 0.45rem;
  border-radius: 6px;
  transition: all 0.18s ease;
  border-left: 2px solid transparent;
}

.toc a:hover {
  color: #1d4ed8;
  background: #eff6ff;
  border-left-color: #93c5fd;
}

.toc li.depth-0 a {
  font-weight: 600;
}

.toc li.depth-1 {
  margin-left: 0.7rem;
}

.toc li.depth-1::before {
  content: '';
  position: absolute;
  left: -0.35rem;
  top: 0.3rem;
  bottom: 0.3rem;
  width: 1px;
  background: #cbd5e1;
}

.toc li.depth-2 {
  margin-left: 1.35rem;
}

.toc li.depth-2::before {
  content: '';
  position: absolute;
  left: -0.35rem;
  top: 0.3rem;
  bottom: 0.3rem;
  width: 1px;
  background: #e2e8f0;
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
  .blog-article {
    padding-top: 3rem;
  }

  .toc-toggle {
    position: fixed;
    right: var(--toc-toggle-right);
    top: calc(env(safe-area-inset-top, 0px) + 12px);
    margin: 0;
  }

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

@media (min-width: 1280px) {
  .blog-article {
    padding: 2rem 2rem 3rem;
  }

  .top-bar {
    max-width: 820px;
    margin: 0 auto 1rem;
  }

  .article-shell {
    display: flex;
    align-items: flex-start;
    max-width: 820px;
    margin: 0 auto;
    overflow: visible;
  }

  .article-shell > article {
    flex: 0 0 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .desktop-toc {
    display: block;
    flex: 0 0 200px;
    margin-left: 1.5rem;
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 2rem);
    overflow-y: auto;
    overflow-x: hidden;
    align-self: flex-start;
  }

  .toc-toggle {
    display: none;
  }

  .mobile-toc {
    display: none !important;
  }
}

@media (min-width: 980px) and (max-width: 1279px) {
  .blog-article {
    padding: 2rem 1.5rem 3rem;
  }

  .top-bar {
    max-width: 820px;
    margin: 0 auto 1rem;
  }

  .article-shell {
    max-width: 820px;
    margin: 0 auto;
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

.back-to-top-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: 1px solid #dbe3ee;
  border-radius: 50%;
  background: #fff;
  color: #475569;
  box-shadow: 0 4px 14px rgb(15 23 42 / 12%);
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}

.back-to-top-btn:hover {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 6px 20px rgb(37 99 235 / 30%);
}

.fade-up-enter-active,
.fade-up-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
