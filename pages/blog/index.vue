<template>
  <div class="blog-page">
    <header class="blog-header">
      <h1>博客</h1>
      <p class="lead">Markdown 文章，支持按标签与月份浏览。</p>
    </header>

    <div class="blog-layout">
      <aside v-if="posts?.length" class="blog-aside">
        <section class="aside-block">
          <h2>标签</h2>
          <ul class="tag-list">
            <li v-for="[tag, count] in tagEntries" :key="tag">
              <NuxtLink :to="`/blog/tag/${encodeURIComponent(tag)}`" class="tag-link">
                {{ tag }}
                <span class="count">{{ count }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>
        <section class="aside-block">
          <h2>按月归档</h2>
          <ul class="archive-list">
            <li v-for="{ ym, count } in monthEntries" :key="ym">
              <NuxtLink :to="`/blog/archive/${ym}`" class="archive-link">
                {{ formatMonthLabel(ym) }}
                <span class="count">{{ count }}</span>
              </NuxtLink>
            </li>
          </ul>
        </section>
      </aside>

      <main>
        <p v-if="pending" class="state">加载中…</p>
        <p v-else-if="error" class="state error">加载失败：{{ errorMessage }}</p>
        <ul v-else-if="posts?.length" class="post-list">
          <li v-for="post in pagedPosts" :key="post._path" class="post-card">
            <NuxtLink :to="post._path || '#'" class="post-title">{{ post.title || '未命名' }}</NuxtLink>
            <p v-if="post.description" class="post-desc">{{ post.description }}</p>
            <div class="post-meta">
              <time v-if="post.date" :datetime="post.date">{{ post.date }}</time>
              <span v-if="post.tags?.length" class="post-tags">
                <NuxtLink
                  v-for="t in post.tags"
                  :key="t"
                  :to="`/blog/tag/${encodeURIComponent(t)}`"
                  class="mini-tag"
                >
                  {{ t }}
                </NuxtLink>
              </span>
            </div>
          </li>
        </ul>
        <nav v-if="totalPages > 1" class="pager">
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
        <p v-else class="state">暂无文章，往 <code>content/blog/</code> 添加 <code>.md</code> 即可。</p>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BlogPostMeta } from '~/composables/useBlogPosts'
import { BLOG_PAGE_SIZE, formatMonthLabel, monthKeyFromDate } from '~/composables/useBlogPosts'

useSeoMeta({
  title: '博客',
  description: '文章列表、标签与按月归档',
})

const { data: posts, pending, error } = await useAsyncData<BlogPostMeta[]>('blog-meta-all', () =>
  fetchBlogMetaList(),
)
const route = useRoute()

const errorMessage = computed(() => {
  const e = error.value as { message?: string; statusMessage?: string } | null
  return e?.statusMessage || e?.message || '请查看控制台日志'
})

const tagEntries = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts.value ?? []) {
    for (const t of p.tags ?? []) {
      map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
})

const monthEntries = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts.value ?? []) {
    const ym = monthKeyFromDate(p.date)
    if (!ym) continue
    map.set(ym, (map.get(ym) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([ym, count]) => ({ ym, count }))
    .sort((a, b) => b.ym.localeCompare(a.ym))
})

const currentPage = computed(() => {
  const raw = route.query.page
  const val = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(val) && val > 0 ? Math.floor(val) : 1
})

const totalPages = computed(() => Math.max(1, Math.ceil((posts.value?.length ?? 0) / BLOG_PAGE_SIZE)))
const safePage = computed(() => Math.min(currentPage.value, totalPages.value))

const pagedPosts = computed(() => {
  const start = (safePage.value - 1) * BLOG_PAGE_SIZE
  return (posts.value ?? []).slice(start, start + BLOG_PAGE_SIZE)
})

const pageTo = (page: number) => ({
  path: '/blog',
  query: page <= 1 ? {} : { page: String(page) },
})
</script>

<style scoped>
.blog-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.blog-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.75rem;
}

.lead {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.blog-layout {
  display: grid;
  gap: 1.5rem;
  margin-top: 1.5rem;
}

@media (min-width: 720px) {
  .blog-layout {
    grid-template-columns: 200px 1fr;
    align-items: start;
  }
}

.blog-aside {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.aside-block h2 {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
}

.tag-list,
.archive-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.tag-list li,
.archive-list li {
  margin-bottom: 0.35rem;
}

.tag-link,
.archive-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #0f172a;
  text-decoration: none;
  font-size: 0.9rem;
}

.tag-link:hover,
.archive-link:hover {
  text-decoration: underline;
}

.count {
  font-size: 0.75rem;
  color: #94a3b8;
}

.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.post-card {
  padding: 1rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.post-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1d4ed8;
  text-decoration: none;
}

.post-title:hover {
  text-decoration: underline;
}

.post-desc {
  margin: 0.4rem 0 0.5rem;
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.5;
}

.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: #64748b;
}

.mini-tag {
  display: inline-block;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  background: #f1f5f9;
  color: #334155;
  text-decoration: none;
  font-size: 0.75rem;
}

.mini-tag:hover {
  background: #e2e8f0;
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
  gap: 0.75rem;
  margin-top: 1rem;
}

.pager-info {
  font-size: 0.85rem;
  color: #64748b;
}

.pager-btn {
  font-size: 0.85rem;
  text-decoration: none;
  color: #1d4ed8;
}

.pager-btn.disabled {
  pointer-events: none;
  color: #94a3b8;
}
</style>
