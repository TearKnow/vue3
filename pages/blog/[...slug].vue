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

      <ContentRenderer v-if="post" :value="post" class="article-body" />

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
const route = useRoute()

const { data: post, pending, error, refresh } = await useAsyncData(
  'blog-current-post',
  () => queryContent(route.path).findOne().then((doc) => doc ?? null),
)

watch(() => route.path, () => {
  refresh()
})

const articleTags = computed(() => {
  const t = post.value?.tags
  return Array.isArray(t) ? (t as string[]) : []
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
