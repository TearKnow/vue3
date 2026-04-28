<template>
  <div class="blog-page">
    <header class="blog-header">
      <p class="back">
        <NuxtLink
          to="/blog"
          no-prefetch
        >← 全部文章</NuxtLink>
      </p>
      <h1>标签：{{ tagDisplay }}</h1>
      <p class="lead">
        共 {{ filtered.length }} 篇
      </p>
    </header>

    <ul
      v-if="filtered.length"
      class="post-list"
    >
      <BlogPostListCard
        v-for="post in pagedPosts"
        :key="post.urlPath || post._path"
        :post="post"
      />
    </ul>
    <nav
      v-if="filtered.length && totalPages > 1"
      class="pager"
    >
      <NuxtLink
        class="pager-btn"
        :class="{ disabled: safePage <= 1 }"
        :to="pageTo(Math.max(1, safePage - 1))"
        no-prefetch
      >
        上一页
      </NuxtLink>
      <span class="pager-info">第 {{ safePage }} / {{ totalPages }} 页</span>
      <NuxtLink
        class="pager-btn"
        :class="{ disabled: safePage >= totalPages }"
        :to="pageTo(Math.min(totalPages, safePage + 1))"
        no-prefetch
      >
        下一页
      </NuxtLink>
    </nav>
    <p
      v-if="!filtered.length"
      class="empty"
    >
      该标签下暂无文章。
    </p>
  </div>
</template>

<script setup lang="ts">
import type { BlogPostMeta } from '~/composables/useBlogPosts'
import { BLOG_PAGE_SIZE } from '~/composables/useBlogPosts'
import { onMounted } from 'vue'
import { removeBlogNavigationLoadingOverlay } from '~/composables/useBlogNavigationLoading'

const route = useRoute()
const tagParam = computed(() => {
  const raw = route.params.tag
  return Array.isArray(raw) ? raw[0] : raw
})

const tagDecoded = computed(() => {
  try {
    return decodeURIComponent(tagParam.value ?? '')
  }
  catch {
    return tagParam.value ?? ''
  }
})

const tagDisplay = computed(() => tagDecoded.value || '（未知）')

const { data: posts } = await useAsyncData<BlogPostMeta[]>('blog-meta-all', () => fetchBlogMetaList())

const filtered = computed(() => {
  const t = tagDecoded.value
  if (!t) return []
  return (posts.value ?? []).filter(p => (p.tags ?? []).includes(t))
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
  path: `/blog/tag/${encodeURIComponent(tagDecoded.value)}`,
  query: page <= 1 ? {} : { page: String(page) },
})

useSeoMeta({
  title: () => `标签：${tagDisplay.value}`,
  description: () => `标签「${tagDisplay.value}」下的文章`,
})

onMounted(() => {
  removeBlogNavigationLoadingOverlay()
})
</script>

<style scoped>
.blog-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 2rem 1rem 3rem;
}

.blog-header {
  padding: 1.15rem 1.2rem;
  border: 1px solid var(--blog-slate-200);
  border-radius: 14px;
  background: linear-gradient(135deg, var(--blog-slate-50) 0%, var(--blog-slate-100) 100%);
}

.back {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
}

.back a {
  color: var(--blog-slate-500);
  text-decoration: none;
}

.back a:hover {
  text-decoration: underline;
}

.blog-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.6rem;
}

.lead {
  margin: 0;
  color: var(--blog-slate-600);
  font-size: 0.9rem;
}

.post-list {
  list-style: none;
  margin: 1.25rem 0 0;
  padding: 0;
}

.empty {
  margin-top: 1.25rem;
  color: var(--blog-slate-500);
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
  color: var(--blog-slate-600);
  min-width: 112px;
  text-align: center;
}

.pager-btn {
  font-size: 0.84rem;
  text-decoration: none;
  color: var(--blog-blue-700);
  border: 1px solid var(--blog-blue-200);
  background: var(--blog-blue-50);
  padding: 0.35rem 0.75rem;
  border-radius: 9px;
  transition: all 0.2s ease;
}

.pager-btn:hover {
  background: var(--blog-blue-100);
}

.pager-btn.disabled {
  pointer-events: none;
  color: var(--blog-slate-400);
  border-color: var(--blog-slate-200);
  background: var(--blog-slate-50);
}
</style>
