<template>
  <div class="blog-page">
    <header class="blog-header">
      <h1>一网打尽</h1>
      <p class="blog-affirmation-text">
        {{ dailyAffirmation }}
      </p>
    </header>

    <div class="search-box">
      <input
        id="blog-search"
        v-model="searchQuery"
        type="search"
        class="search-input"
        placeholder="搜索标题、摘要或标签"
        @input="onSearchInput"
      >
      <p
        v-if="searchQuery"
        class="search-info"
      >
        匹配到 {{ filteredPosts.length }}/{{ posts?.length || 0 }} 篇文章
      </p>
    </div>

    <div class="blog-layout">
      <aside
        v-if="posts?.length"
        class="blog-aside"
      >
        <section class="aside-block">
          <h2 class="section-header">
            标签
            <span class="total-count">
              <template v-if="searchKeyword">
                共 {{ filteredPosts.length }}/{{ posts?.length || 0 }} 篇
              </template>
              <template v-else>
                共 {{ posts?.length || 0 }} 篇
              </template>
            </span>
          </h2>
          <ul class="tag-list">
            <li
              v-for="[tag, count] in tagEntries"
              :key="tag"
            >
              <NuxtLink
                :to="`/blog/tag/${encodeURIComponent(tag)}`"
                class="tag-link"
              >
                {{ tag }}
                <span class="count">
                  <template v-if="searchKeyword">
                    {{ count }}/{{ allTagCount.get(tag) ?? 0 }}
                  </template>
                  <template v-else>
                    {{ count }}
                  </template>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>
        <section class="aside-block">
          <h2 class="section-header">
            按月归档
            <span class="total-count">
              <template v-if="searchKeyword">
                共 {{ filteredPosts.length }}/{{ posts?.length || 0 }} 篇
              </template>
              <template v-else>
                共 {{ posts?.length || 0 }} 篇
              </template>
            </span>
          </h2>
          <ul class="archive-list">
            <li
              v-for="{ ym, count } in monthEntries"
              :key="ym"
            >
              <NuxtLink
                :to="`/blog/archive/${ym}`"
                class="archive-link"
              >
                {{ formatMonthLabel(ym) }}
                <span class="count">
                  <template v-if="searchKeyword">
                    {{ count }}/{{ allMonthCount.get(ym) ?? 0 }}
                  </template>
                  <template v-else>
                    {{ count }}
                  </template>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </aside>

      <main>
        <p
          v-if="pending"
          class="state"
        >
          加载中…
        </p>
        <p
          v-else-if="error"
          class="state error"
        >
          加载失败：{{ errorMessage }}
        </p>
        <template v-else-if="posts?.length">
          <template v-if="filteredPostsCount">
            <ul class="post-list">
              <BlogPostListCard
                v-for="post in pagedPosts"
                :key="post.urlPath || post._path"
                :post="post"
                :highlight-keyword="searchKeyword"
              />
            </ul>
            <nav
              v-if="totalPages > 1"
              class="pager"
            >
              <NuxtLink
                class="pager-btn"
                :class="{ disabled: safePage <= 1 }"
                :to="pageTo(Math.max(1, safePage - 1))"
              >
                上一页
              </NuxtLink>
              <span class="pager-info">第 {{ safePage }} / {{ totalPages }} 页</span>
              <NuxtLink
                class="pager-btn"
                :class="{ disabled: safePage >= totalPages }"
                :to="pageTo(Math.min(totalPages, safePage + 1))"
              >
                下一页
              </NuxtLink>
            </nav>
          </template>
          <p
            v-else
            class="state"
          >
            未找到符合 “{{ searchQuery }}” 的文章。
          </p>
        </template>
        <p
          v-else
          class="state"
        >
          暂无文章，往 <code>content/blog/</code> 添加 <code>.md</code> 即可。
        </p>
      </main>
    </div>

    <Transition name="fade-up">
      <button
        v-if="showBackToTop"
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
import { onBeforeUnmount, onMounted, ref, watch, computed } from 'vue'
import { useRouter, useRoute } from '#imports'
import affirmations from '~/docs/affirmations.json'
import type { BlogPostMeta } from '~/composables/useBlogPosts'
import { BLOG_PAGE_SIZE, formatMonthLabel, monthKeyFromDate } from '~/composables/useBlogPosts'
import { removeBlogNavigationLoadingOverlay } from '~/composables/useBlogNavigationLoading'

useSeoMeta({
  title: '博客',
  description: '文章列表、标签与按月归档',
})

const { data: posts, pending, error } = await useAsyncData<BlogPostMeta[]>('blog-meta-all', () =>
  fetchBlogMetaList(),
)

const errorMessage = computed(() => {
  const e = error.value as { message?: string, statusMessage?: string } | null
  return e?.statusMessage || e?.message || '请查看控制台日志'
})

const tagEntries = computed(() => {
  const map = new Map<string, number>()
  for (const p of filteredPosts.value ?? []) {
    for (const t of p.tags ?? []) {
      map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
})

const monthEntries = computed(() => {
  const map = new Map<string, number>()
  for (const p of filteredPosts.value ?? []) {
    const ym = monthKeyFromDate(p.date)
    if (!ym) continue
    map.set(ym, (map.get(ym) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([ym, count]) => ({ ym, count }))
    .sort((a, b) => b.ym.localeCompare(a.ym))
})

const allTagCount = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts.value ?? []) {
    for (const t of p.tags ?? []) {
      map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return map
})

const allMonthCount = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts.value ?? []) {
    const ym = monthKeyFromDate(p.date)
    if (!ym) continue
    map.set(ym, (map.get(ym) ?? 0) + 1)
  }
  return map
})

const router = useRouter()
const route = useRoute()

const dailyAffirmation = computed(() => {
  const day = new Date().getDate()
  return affirmations[(day - 1) % affirmations.length]
})

const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')
const searchKeyword = computed(() => searchQuery.value.trim())

watch(
  () => route.query.q,
  (value) => {
    searchQuery.value = typeof value === 'string' ? value : ''
  },
)

const filteredPosts = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) return posts.value ?? []

  return (posts.value ?? []).filter((post) => {
    const title = post.title?.toLowerCase() ?? ''
    const description = post.description?.toLowerCase() ?? ''
    const tags = (post.tags ?? []).join(' ').toLowerCase()
    const content = post.content?.toLowerCase() ?? ''
    return title.includes(keyword)
      || description.includes(keyword)
      || tags.includes(keyword)
      || content.includes(keyword)
  })
})

const currentPage = computed(() => {
  const raw = route.query.page
  const val = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(val) && val > 0 ? Math.floor(val) : 1
})

const totalPages = computed(() => Math.max(1, Math.ceil((filteredPosts.value.length ?? 0) / BLOG_PAGE_SIZE)))
const safePage = computed(() => Math.min(currentPage.value, totalPages.value))

const pagedPosts = computed(() => {
  const start = (safePage.value - 1) * BLOG_PAGE_SIZE
  return filteredPosts.value.slice(start, start + BLOG_PAGE_SIZE)
})

const filteredPostsCount = computed(() => filteredPosts.value.length)

function updateRouteQuery(query: Record<string, string | undefined>) {
  router.replace({
    path: '/blog',
    query: Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== '')),
  })
}

function onSearchInput() {
  updateRouteQuery({
    ...route.query,
    q: searchQuery.value.trim() || undefined,
    page: '1',
  })
}
const pageTo = (page: number) => {
  const query: Record<string, string | undefined> = {
    ...(page > 1 ? { page: String(page) } : undefined),
    ...(searchQuery.value.trim() ? { q: searchQuery.value.trim() } : undefined),
  }
  return {
    path: '/blog',
    query,
  }
}

const showBackToTop = ref(false)

function handleScroll() {
  showBackToTop.value = window.scrollY > 300
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  removeBlogNavigationLoadingOverlay()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.blog-page {
  max-width: 1040px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
}

.blog-header {
  padding: 1.2rem 1.25rem;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
}

.blog-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.85rem;
  letter-spacing: 0.01em;
}

.blog-affirmation-text {
  margin: 0;
  color: #334155;
  font-size: 1rem;
  line-height: 1.75;
  padding: 0.7rem 0 0;
}

.search-box {
  margin-top: 1.25rem;
  display: grid;
  gap: 0.5rem;
}

.search-input {
  width: 100%;
  min-height: 46px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 0.8rem 1rem;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-input:focus {
  border-color: #60a5fa;
  box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.12);
}

.search-info {
  margin: 0;
  color: #475569;
  font-size: 0.9rem;
}

.lead {
  margin: 0;
  color: #475569;
  font-size: 0.96rem;
}

.blog-layout {
  display: grid;
  gap: 1.1rem;
  margin-top: 1.5rem;
}

.blog-layout > main {
  order: 1;
}

@media (min-width: 720px) {
  .blog-layout {
    grid-template-columns: 230px 1fr;
    align-items: start;
  }

  .blog-layout > main {
    order: 2;
  }

  .blog-aside {
    position: sticky;
    top: 1rem;
  }
}

.blog-aside {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  order: 2;
}

.aside-block {
  padding: 0.9rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.aside-block h2 {
  margin: 0 0 0.65rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #64748b;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.total-count {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: normal;
  text-transform: none;
  letter-spacing: normal;
}

.tag-list,
.archive-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tag-list li,
.archive-list li {
  margin-bottom: 0.45rem;
}

.tag-link,
.archive-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.35rem;
  color: #1e293b;
  text-decoration: none;
  font-size: 0.88rem;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.38rem 0.5rem;
  background: #f8fafc;
  transition: all 0.2s ease;
}

.tag-link:hover,
.archive-link:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
  color: #1d4ed8;
}

.count {
  font-size: 0.75rem;
  color: #64748b;
}

.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.state {
  color: #64748b;
  font-size: 0.95rem;
}

.state.error {
  color: #b91c1c;
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.4rem;
}

.pager-info {
  font-size: 0.85rem;
  color: #475569;
  min-width: 112px;
  text-align: center;
}

.pager-btn {
  font-size: 0.84rem;
  text-decoration: none;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
  background: #eff6ff;
  padding: 0.35rem 0.75rem;
  border-radius: 9px;
  transition: all 0.2s ease;
}

.pager-btn:hover {
  background: #dbeafe;
}

.pager-btn.disabled {
  pointer-events: none;
  color: #94a3b8;
  border-color: #e2e8f0;
  background: #f8fafc;
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

.page-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
}

.loading-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.2rem 1.4rem;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
}

.spinner {
  width: 42px;
  height: 42px;
  border: 4px solid #cbd5e1;
  border-top-color: #3b6fc0;
  border-radius: 999px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
