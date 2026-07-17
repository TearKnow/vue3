<template>
  <div class="wiki-index">
    <header class="wiki-index-hero">
      <p class="wiki-index-eyebrow">
        Personal Wiki
      </p>
      <h1 class="wiki-index-title">
        我的知识库
      </h1>
      <p class="wiki-index-desc">
        记录学习过程、技术实践与问题总结。
      </p>
      <dl
        v-if="pageCount > 0"
        class="wiki-index-stats"
      >
        <div class="wiki-index-stat">
          <dt>文档</dt>
          <dd>{{ pageCount }}</dd>
        </div>
        <div class="wiki-index-stat">
          <dt>主题</dt>
          <dd>{{ topicCount }}</dd>
        </div>
        <div class="wiki-index-stat">
          <dt>最近更新</dt>
          <dd class="wiki-index-stat-date">
            {{ latestUpdateDate || '暂无' }}
          </dd>
        </div>
      </dl>
    </header>

    <div
      v-if="pageCount > 0"
      class="wiki-dashboard"
    >
      <section
        v-if="currentLearningPage"
        class="wiki-panel wiki-learning"
        aria-labelledby="wiki-learning-title"
      >
        <div class="wiki-panel-heading">
          <div>
            <p class="wiki-panel-eyebrow">
              Current Focus
            </p>
            <h2
              id="wiki-learning-title"
              class="wiki-panel-title"
            >
              继续学习
            </h2>
          </div>
          <span class="wiki-learning-status">进行中</span>
        </div>
        <h3 class="wiki-learning-title">
          {{ currentLearning.title }}
        </h3>
        <p class="wiki-learning-desc">
          {{ currentLearning.description }}
        </p>
        <NuxtLink
          :to="currentLearning.path"
          no-prefetch
          class="wiki-primary-link"
        >
          继续阅读
          <span aria-hidden="true">→</span>
        </NuxtLink>
      </section>

      <section
        class="wiki-panel wiki-plans"
        aria-labelledby="wiki-plans-title"
      >
        <div class="wiki-panel-heading">
          <div>
            <p class="wiki-panel-eyebrow">
              Up Next
            </p>
            <h2
              id="wiki-plans-title"
              class="wiki-panel-title"
            >
              近期计划
            </h2>
          </div>
        </div>
        <ul class="wiki-plan-list">
          <li
            v-for="plan in upcomingPlans"
            :key="plan"
          >
            <span
              class="wiki-plan-dot"
              aria-hidden="true"
            />
            <span>{{ plan }}</span>
          </li>
        </ul>
      </section>

      <section
        class="wiki-panel wiki-recent"
        aria-labelledby="wiki-recent-title"
      >
        <div class="wiki-panel-heading">
          <div>
            <p class="wiki-panel-eyebrow">
              Latest Notes
            </p>
            <h2
              id="wiki-recent-title"
              class="wiki-panel-title"
            >
              最近更新
            </h2>
          </div>
          <span class="wiki-panel-count">{{ recentPages.length }} 篇</span>
        </div>
        <div class="wiki-recent-list">
          <NuxtLink
            v-for="page in recentPages"
            :key="page._path"
            :to="page._path"
            no-prefetch
            class="wiki-recent-item"
          >
            <span class="wiki-recent-main">
              <strong>{{ page.title || '未命名页面' }}</strong>
              <span>{{ page.topic }}</span>
            </span>
            <time
              v-if="page.date"
              :datetime="page.date"
            >{{ page.date }}</time>
            <span
              v-else
              class="wiki-recent-no-date"
            >未标注日期</span>
          </NuxtLink>
        </div>
      </section>

      <section
        v-if="availableFavoritePages.length > 0"
        class="wiki-panel wiki-favorites"
        aria-labelledby="wiki-favorites-title"
      >
        <div class="wiki-panel-heading">
          <div>
            <p class="wiki-panel-eyebrow">
              Shortcuts
            </p>
            <h2
              id="wiki-favorites-title"
              class="wiki-panel-title"
            >
              常用页面
            </h2>
          </div>
        </div>
        <div class="wiki-favorite-list">
          <NuxtLink
            v-for="page in availableFavoritePages"
            :key="page.path"
            :to="page.path"
            no-prefetch
            class="wiki-favorite-item"
          >
            <strong>{{ page.title }}</strong>
            <span>{{ page.description }}</span>
          </NuxtLink>
        </div>
      </section>
    </div>

    <div
      v-if="pageCount === 0"
      class="wiki-empty"
    >
      <p>还没有页面，侧栏右上角可新建第一篇。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { filterWikiPages } from '~/composables/useWikiTree'
import { removeNavigationLoadingOverlay } from '~/composables/useNavigationLoading'

interface WikiHomePage {
  _path: string
  title?: string
  date?: string
}

definePageMeta({ layout: 'wiki' })

useSeoMeta({
  title: 'Wiki',
  description: '个人 Wiki 知识库',
})

const { data: pages } = await useAsyncData('wiki-index', () =>
  queryContent('/wiki').only(['_path', 'title', 'date']).find(),
)

const currentLearning = {
  title: '算法基础',
  description: '从基础数据结构出发，逐步建立常见算法思想与解题框架。',
  path: '/wiki/algorithm/start',
}

const favoritePages = [
  {
    title: '算法学习目标',
    description: '学习路线、阶段目标与推荐资源。',
    path: '/wiki/algorithm/start',
  },
  {
    title: '循环数组',
    description: '循环数组的基本思路与实现记录。',
    path: '/wiki/algorithm/cycle-array',
  },
]

const upcomingPlans = [
  '完成数组与链表基础整理',
  '补充双指针与滑动窗口笔记',
  '整理算法练习中的典型错题',
]

const topicLabels: Record<string, string> = {
  algorithm: '算法',
}

const wikiPages = computed(() =>
  filterWikiPages((pages.value || []) as WikiHomePage[]),
)

const pagePaths = computed(() => new Set(wikiPages.value.map(page => page._path)))
const pageCount = computed(() => wikiPages.value.length)
const topicCount = computed(() => new Set(
  wikiPages.value
    .map((page) => {
      const segments = page._path.replace(/^\/wiki\/?/, '').split('/').filter(Boolean)
      return segments.length > 1 ? segments[0] : ''
    })
    .filter(Boolean),
).size)

const recentPages = computed(() => [...wikiPages.value]
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  .slice(0, 5)
  .map((page) => {
    const topic = page._path.replace(/^\/wiki\/?/, '').split('/').filter(Boolean)[0] || ''
    return {
      ...page,
      topic: topicLabels[topic] || topic || 'Wiki',
    }
  }))

const latestUpdateDate = computed(() =>
  recentPages.value.find(page => page.date)?.date || '',
)

const currentLearningPage = computed(() =>
  pagePaths.value.has(currentLearning.path),
)

const availableFavoritePages = computed(() =>
  favoritePages.filter(page => pagePaths.value.has(page.path)),
)

onMounted(() => {
  removeNavigationLoadingOverlay()
})
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
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  max-width: 520px;
  margin: 22px 0 0;
  padding: 18px 0 0;
  border-top: 1px solid var(--blog-blue-100);
}

.wiki-index-stat {
  min-width: 0;
}

.wiki-index-stat dt {
  margin-bottom: 5px;
  color: var(--blog-slate-500);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.wiki-index-stat dd {
  margin: 0;
  color: var(--blog-slate-900);
  font-size: 20px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.wiki-index-stat dd.wiki-index-stat-date {
  padding-top: 4px;
  font-size: 14px;
}

.wiki-dashboard {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.65fr);
  gap: 16px;
  margin-top: 18px;
}

.wiki-panel {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 16px;
  background: var(--blog-white);
  box-shadow: 0 10px 24px var(--blog-shadow-xs);
}

.wiki-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.wiki-panel-eyebrow {
  margin: 0 0 4px;
  color: var(--blog-blue-700);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.wiki-panel-title {
  margin: 0;
  color: var(--blog-slate-900);
  font-size: 16px;
  line-height: 1.35;
}

.wiki-learning {
  overflow: hidden;
  border-color: var(--blog-blue-200);
  background: linear-gradient(135deg, var(--blog-white), var(--blog-blue-50));
}

.wiki-learning-status,
.wiki-panel-count {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  padding: 4px 10px;
  border-radius: 8px;
  color: var(--blog-blue-700);
  background: var(--blog-blue-50);
  font-size: 11px;
  font-weight: 600;
}

.wiki-learning-status::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--blog-blue-600);
}

.wiki-learning-title {
  margin: 2px 0 8px;
  color: var(--blog-slate-900);
  font-size: 21px;
}

.wiki-learning-desc {
  max-width: 34rem;
  margin: 0 0 20px;
  color: var(--blog-slate-600);
  font-size: 14px;
  line-height: 1.7;
}

.wiki-primary-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: 1px solid var(--blog-blue-600);
  border-radius: 10px;
  color: var(--blog-white);
  background: var(--blog-blue-600);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  box-shadow: 0 8px 18px var(--blog-shadow-brand);
  transition: background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.wiki-primary-link:hover {
  border-color: var(--blog-blue-800);
  background: var(--blog-blue-800);
  box-shadow: 0 10px 24px var(--blog-shadow-brand);
}

.wiki-plan-list {
  display: grid;
  gap: 13px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wiki-plan-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--blog-slate-600);
  font-size: 13px;
  line-height: 1.55;
}

.wiki-plan-dot {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 7px;
  border: 2px solid var(--blog-blue-400);
  border-radius: 50%;
  background: var(--blog-blue-50);
}

.wiki-recent-list,
.wiki-favorite-list {
  display: grid;
  gap: 8px;
}

.wiki-recent-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 12px 13px;
  border: 1px solid transparent;
  border-radius: 11px;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.2s, border-color 0.2s;
}

.wiki-recent-item:hover {
  border-color: var(--blog-blue-100);
  background: var(--blog-blue-50);
}

.wiki-recent-main {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.wiki-recent-main strong {
  overflow: hidden;
  color: var(--blog-slate-800);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wiki-recent-main span,
.wiki-recent-item time,
.wiki-recent-no-date {
  color: var(--blog-slate-500);
  font-size: 11px;
}

.wiki-recent-item time,
.wiki-recent-no-date {
  flex: none;
  font-variant-numeric: tabular-nums;
}

.wiki-favorite-list {
  grid-template-columns: 1fr;
}

.wiki-favorite-item {
  display: grid;
  gap: 5px;
  padding: 13px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 11px;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
}

.wiki-favorite-item:hover {
  border-color: var(--blog-blue-300);
  background: var(--blog-blue-50);
  box-shadow: 0 8px 18px var(--blog-shadow-xs);
}

.wiki-favorite-item strong {
  color: var(--blog-slate-800);
  font-size: 13px;
}

.wiki-favorite-item span {
  color: var(--blog-slate-500);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .wiki-index-stats,
  .wiki-dashboard {
    grid-template-columns: 1fr;
  }

  .wiki-index-stats {
    gap: 14px;
  }

  .wiki-index-stat {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .wiki-index-stat dt {
    margin: 0;
  }

  .wiki-index-stat dd,
  .wiki-index-stat dd.wiki-index-stat-date {
    padding: 0;
    font-size: 15px;
  }

  .wiki-panel {
    padding: 18px;
  }

  .wiki-recent-item {
    align-items: flex-start;
    gap: 10px;
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
