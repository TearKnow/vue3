<template>
  <li class="blog-post-list-card">
    <NuxtLink
      :to="post.urlPath || '#'"
      class="blog-post-list-card__title"
    >
      <span
        v-if="post.pinned"
        class="blog-post-list-card__pinned"
        title="置顶文章"
      >
        📌
      </span>
      <span
        v-if="keyword"
        class="highlight-break"
      >
        <template
          v-for="(token, idx) in titleTokens"
          :key="idx"
        >
          <span :class="{ 'blog-post-list-card__hl': token.highlight }">{{ token.text }}</span>
        </template>
      </span>
      <template v-else>
        {{ post.title || '未命名' }}
      </template>
    </NuxtLink>
    <p
      v-if="showDesc"
      class="blog-post-list-card__desc"
    >
      <template v-if="keyword">
        <template
          v-for="(token, idx) in summaryTokens"
          :key="idx"
        >
          <span :class="{ 'blog-post-list-card__hl': token.highlight }">{{ token.text }}</span>
        </template>
      </template>
      <template v-else>
        {{ post.description }}
      </template>
    </p>
    <div class="blog-post-list-card__meta">
      <time
        v-if="post.date"
        :datetime="post.date"
      >{{ post.date }}</time>
      <span
        v-if="post.tags?.length"
        class="blog-post-list-card__tags"
      >
        <NuxtLink
          v-for="t in post.tags"
          :key="t"
          :to="`/blog/tag/${encodeURIComponent(t)}`"
          class="blog-post-list-card__tag"
        >
          {{ t }}
        </NuxtLink>
      </span>
    </div>
  </li>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BlogPostMeta } from '~/composables/useBlogPosts'
import {
  getPostSnippet,
  getPostSummaryText,
  splitHighlightText,
} from '~/composables/useBlogSearchHighlight'

const props = withDefaults(
  defineProps<{
    post: BlogPostMeta
    /** 有值时标题/摘要高亮匹配（博客首页搜索） */
    highlightKeyword?: string
  }>(),
  { highlightKeyword: '' },
)

const keyword = computed(() => props.highlightKeyword.trim())

const titleTokens = computed(() =>
  splitHighlightText(props.post.title || '未命名', keyword.value),
)

const summaryPlain = computed(() => getPostSummaryText(props.post, keyword.value))

const summaryTokens = computed(() =>
  splitHighlightText(summaryPlain.value, keyword.value),
)

const showDesc = computed(() => {
  if (keyword.value) {
    return !!(props.post.description || getPostSnippet(props.post, keyword.value))
  }
  return !!props.post.description
})
</script>

<style scoped>
.blog-post-list-card {
  position: relative;
  padding: 1rem 1.05rem;
  border: 1px solid var(--blog-slate-200);
  border-radius: 12px;
  background: var(--blog-white);
  margin-bottom: 0.8rem;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  list-style: none;
}

.blog-post-list-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
}

.blog-post-list-card__title {
  font-size: 1.08rem;
  font-weight: 600;
  color: var(--blog-slate-900);
  text-decoration: none;
  transition: color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.blog-post-list-card__pinned {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 999px;
  color: var(--blog-warn-800);
  font-size: 0.95rem;
  line-height: 1;
}

.blog-post-list-card__title::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
}

.blog-post-list-card__title:hover {
  color: var(--blog-link);
}

.blog-post-list-card__desc {
  margin: 0.4rem 0 0.5rem;
  font-size: 0.9rem;
  color: var(--blog-slate-600);
  line-height: 1.5;
}

.blog-post-list-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  font-size: 0.8rem;
  color: var(--blog-slate-500);
}

.blog-post-list-card__tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.5rem;
}

.blog-post-list-card__tag {
  position: relative;
  z-index: 1;
  display: inline-block;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  background: var(--blog-blue-50);
  color: var(--blog-blue-800);
  text-decoration: none;
  font-size: 0.75rem;
  border: 1px solid var(--blog-blue-100);
}

.blog-post-list-card__tag:hover {
  background: var(--blog-blue-100);
}

.blog-post-list-card__hl {
  background: var(--blog-highlight-bg);
  color: var(--blog-warn-800);
  padding: 0 0.1rem;
  border-radius: 0.15rem;
}

.highlight-break {
  word-break: break-word;
}
</style>
