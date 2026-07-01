<template>
  <div class="wiki-index">
    <header class="wiki-index-hero">
      <p class="wiki-index-eyebrow">Knowledge Base</p>
      <h1 class="wiki-index-title">知识库</h1>
      <p class="wiki-index-desc">
        记录想法、整理笔记。从左侧目录选择页面开始阅读。
      </p>
      <div v-if="pageCount > 0" class="wiki-index-stats">
        <span>{{ pageCount }} 篇文档</span>
      </div>
    </header>

    <div v-if="pageCount === 0" class="wiki-empty">
      <p>还没有页面，侧栏右上角可新建第一篇。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { filterWikiPages } from '~/composables/useWikiTree'

definePageMeta({ layout: 'wiki' })

useSeoMeta({
  title: 'Wiki',
  description: '个人 Wiki 知识库',
})

const { data: pages } = await useAsyncData('wiki-index', () =>
  queryContent('/wiki').only(['_path']).find(),
)

const pageCount = computed(() => filterWikiPages(pages.value || []).length)
</script>

<style scoped>
.wiki-index {
  padding: 24px 32px 80px;
  max-width: var(--wiki-content-max-width, 960px);
  margin: 0 auto;
}

@media (max-width: 768px) {
  .wiki-index {
    padding: 16px 16px 80px;
  }
}

.wiki-index-hero {
  padding: 28px 30px;
  border: 1px solid var(--blog-blue-100);
  border-radius: 18px;
  background: linear-gradient(135deg, var(--wiki-hero-gradient-start) 0%, var(--wiki-hero-gradient-end) 68%);
  box-shadow: 0 16px 36px var(--blog-shadow-xs-plus);
}

.wiki-index-eyebrow {
  margin: 0 0 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--blog-blue-700);
}

.wiki-index-title {
  margin: 0 0 8px;
  font-size: clamp(1.6rem, 3vw, 2rem);
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: var(--blog-slate-900);
}

.wiki-index-desc {
  margin: 0;
  max-width: 36rem;
  color: var(--blog-slate-600);
  font-size: 15px;
  line-height: 1.65;
}

.wiki-index-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.wiki-index-stats span {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--blog-overlay-light);
  border: 1px solid var(--blog-blue-100);
  color: var(--blog-blue-800);
  font-size: 12px;
  font-weight: 600;
}

.wiki-empty {
  margin-top: 24px;
  padding: 56px 20px;
  text-align: center;
  color: var(--blog-slate-500);
  font-size: 14px;
  background: var(--blog-white);
  border: 1px dashed var(--blog-slate-300);
  border-radius: 14px;
}
</style>
