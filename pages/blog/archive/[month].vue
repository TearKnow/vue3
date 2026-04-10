<template>
  <div class="blog-page">
    <header class="blog-header">
      <p class="back">
        <NuxtLink to="/blog">← 全部文章</NuxtLink>
      </p>
      <h1>归档：{{ monthLabel }}</h1>
      <p class="lead">共 {{ filtered.length }} 篇</p>
    </header>

    <ul v-if="filtered.length" class="post-list">
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
    <p v-else class="empty">该月份暂无文章。</p>
  </div>
</template>

<script setup lang="ts">
import type { BlogPostMeta } from '~/composables/useBlogPosts'
import { BLOG_PAGE_SIZE, formatMonthLabel, monthKeyFromDate } from '~/composables/useBlogPosts'

const route = useRoute()
const monthParam = computed(() => {
  const raw = route.params.month
  return Array.isArray(raw) ? raw[0] : raw
})

const monthKey = computed(() => monthParam.value ?? '')

const monthLabel = computed(() => formatMonthLabel(monthKey.value))

const { data: posts } = await useAsyncData<BlogPostMeta[]>('blog-meta-all', () => fetchBlogMetaList())

const filtered = computed(() => {
  const ym = monthKey.value
  if (!ym) return []
  return (posts.value ?? []).filter((p) => monthKeyFromDate(p.date) === ym)
})

const currentPage = computed(() => {
  const raw = route.query.page
  const val = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isFinite(val) && val > 0 ? Math.floor(val) : 1
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / BLOG_PAGE_SIZE)))
const safePage = computed(() => Math.min(currentPage.value, totalPages.value))

const pagedPosts = computed(() => {
  const start = (safePage.value - 1) * BLOG_PAGE_SIZE
  return filtered.value.slice(start, start + BLOG_PAGE_SIZE)
})

const pageTo = (page: number) => ({
  path: `/blog/archive/${monthKey.value}`,
  query: page <= 1 ? {} : { page: String(page) },
})

useSeoMeta({
  title: () => `归档：${monthLabel.value}`,
  description: () => `${monthLabel.value} 的文章列表`,
})
</script>

<style scoped>
.blog-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
}

.back {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.back a {
  color: #64748b;
  text-decoration: none;
}

.back a:hover {
  text-decoration: underline;
}

.blog-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
}

.lead {
  margin: 0;
  color: #64748b;
  font-size: 0.9rem;
}

.post-list {
  list-style: none;
  margin: 1.25rem 0 0;
  padding: 0;
}

.post-card {
  padding: 1rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.post-title {
  font-size: 1.05rem;
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

.empty {
  margin-top: 1.25rem;
  color: #64748b;
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
