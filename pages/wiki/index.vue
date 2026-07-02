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

    <section v-if="pageCount > 0" class="wiki-index-tips" aria-label="使用提示">
      <article class="wiki-index-tip-card">
        <span class="wiki-index-tip-mark wiki-index-tip-mark--browse" aria-hidden="true" />
        <h2 class="wiki-index-tip-title">浏览目录</h2>
        <p class="wiki-index-tip-desc">左侧树形目录按主题组织，点击即可阅读。</p>
      </article>
      <article class="wiki-index-tip-card">
        <span class="wiki-index-tip-mark wiki-index-tip-mark--create" aria-hidden="true" />
        <h2 class="wiki-index-tip-title">快速新建</h2>
        <p class="wiki-index-tip-desc">侧栏右上角 + 号，填写标题即可创建页面。</p>
      </article>
      <article class="wiki-index-tip-card">
        <span class="wiki-index-tip-mark wiki-index-tip-mark--edit" aria-hidden="true" />
        <h2 class="wiki-index-tip-title">随时编辑</h2>
        <p class="wiki-index-tip-desc">文章页右上角可进入 Markdown 编辑模式。</p>
      </article>
    </section>

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
  padding: 24px 32px 40px;
  max-width: var(--wiki-content-max-width, 960px);
  margin: 0 auto;
}

@media (max-width: 768px) {
  .wiki-index {
    padding: 16px 16px 32px;
  }
}

.wiki-index-hero {
  position: relative;
  overflow: hidden;
  padding: 28px 30px;
  border: 1px solid var(--blog-blue-100);
  border-radius: 18px;
  background: linear-gradient(135deg, var(--wiki-hero-gradient-start) 0%, var(--wiki-hero-gradient-end) 68%);
  box-shadow: 0 16px 36px var(--blog-shadow-xs-plus);
}

.wiki-index-hero::after {
  content: '';
  position: absolute;
  right: -36px;
  top: -48px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--wiki-hero-accent) 0%, transparent 72%);
  pointer-events: none;
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

.wiki-index-tips {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.wiki-index-tip-card {
  padding: 18px 18px 16px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 14px;
  background: var(--blog-white);
  box-shadow: 0 10px 24px var(--blog-shadow-xs);
}

.wiki-index-tip-mark {
  display: block;
  width: 28px;
  height: 4px;
  margin-bottom: 12px;
  border-radius: 999px;
}

.wiki-index-tip-mark--browse {
  background: linear-gradient(90deg, var(--blog-blue-600), var(--blog-cyan-500));
}

.wiki-index-tip-mark--create {
  background: linear-gradient(90deg, var(--blog-blue-400), var(--blog-blue-600));
}

.wiki-index-tip-mark--edit {
  background: linear-gradient(90deg, var(--blog-cyan-500), var(--blog-blue-400));
}

.wiki-index-tip-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--blog-slate-800);
}

.wiki-index-tip-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--blog-slate-600);
}

@media (max-width: 768px) {
  .wiki-index-tips {
    grid-template-columns: 1fr;
  }
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
