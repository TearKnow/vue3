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
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
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
        <section class="aside-block calendar-block">
          <div class="calendar-header">
            <button
              type="button"
              class="calendar-nav-btn"
              aria-label="查看上个月"
              @click="shiftCalendarMonth(-1)"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <div class="calendar-header-center">
              <p class="calendar-month">
                {{ calendarMonthLabel }}
              </p>
            </div>
            <button
              type="button"
              class="calendar-nav-btn"
              aria-label="查看下个月"
              @click="shiftCalendarMonth(1)"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
          <div class="calendar-grid calendar-weekdays">
            <span
              v-for="day in weekDays"
              :key="day"
              class="calendar-weekday"
            >
              {{ day }}
            </span>
          </div>
          <div class="calendar-grid calendar-days">
            <span
              v-for="(dayCell, index) in calendarDays"
              :key="index"
              class="calendar-day"
              :class="{ today: dayCell.isToday }"
            >
              <span
                v-if="dayCell.day"
                class="calendar-day-number"
                :title="dayCell.hasPost ? `${dayCell.postCount} 篇文章` : undefined"
                :aria-label="dayCell.hasPost ? `${dayCell.postCount} 篇文章` : undefined"
              >
                {{ dayCell.day }}
              </span>
              <span
                v-if="dayCell.hasPost"
                class="calendar-day-dot"
                :class="dotLevelClass(dayCell.postCount)"
              />
            </span>
          </div>
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

const today = new Date()
const viewMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const weekDays = ['日', '一', '二', '三', '四', '五', '六']
const calendarMonthLabel = computed(() => viewMonth.value.toLocaleDateString('zh-CN', {
  year: 'numeric',
  month: 'long',
}))

const todayYear = today.getFullYear()
const todayMonth = today.getMonth()
const todayDate = today.getDate()

const postDateCountMap = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts.value ?? []) {
    const date = p.date
    if (!date || date.length < 10) continue
    const key = date.slice(0, 10)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
})

const formatDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const calendarDays = computed(() => {
  const year = viewMonth.value.getFullYear()
  const month = viewMonth.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: Array<{ day: number | null, hasPost: boolean, postCount: number, isToday: boolean }> = []

  for (let i = 0; i < firstDay; i++) {
    days.push({
      day: null,
      hasPost: false,
      postCount: 0,
      isToday: false,
    })
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayKey = formatDateKey(year, month, day)
    const postCount = postDateCountMap.value.get(dayKey) ?? 0
    days.push({
      day,
      hasPost: postCount > 0,
      postCount,
      isToday: year === todayYear && month === todayMonth && day === todayDate,
    })
  }
  while (days.length % 7 !== 0) {
    days.push({
      day: null,
      hasPost: false,
      postCount: 0,
      isToday: false,
    })
  }
  return days
})

function shiftCalendarMonth(offset: number) {
  viewMonth.value = new Date(
    viewMonth.value.getFullYear(),
    viewMonth.value.getMonth() + offset,
    1,
  )
}

function dotLevelClass(postCount: number) {
  if (postCount >= 4) return 'dot-level-4'
  if (postCount === 3) return 'dot-level-3'
  if (postCount === 2) return 'dot-level-2'
  return 'dot-level-1'
}

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

let searchDebounceTimer: number | undefined

function onSearchInput() {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = window.setTimeout(() => {
    updateRouteQuery({
      ...route.query,
      q: searchQuery.value.trim() || undefined,
      page: '1',
    })
  }, 260)
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

onMounted(() => {
  removeBlogNavigationLoadingOverlay()
})

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
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
  border: 1px solid var(--blog-slate-200);
  border-radius: 14px;
  background: linear-gradient(135deg, var(--blog-slate-50) 0%, var(--blog-slate-100) 100%);
}

.blog-header h1 {
  margin: 0 0 0.35rem;
  font-size: 1.85rem;
  letter-spacing: 0.01em;
}

.blog-affirmation-text {
  margin: 0;
  color: var(--blog-slate-700);
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
  border: 1px solid var(--blog-slate-300);
  border-radius: 12px;
  padding: 0.8rem 1rem;
  font-size: 16px;
  outline: none;
  background: var(--blog-white);
  color: var(--blog-slate-800);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.search-input::placeholder {
  color: var(--blog-slate-400);
}

.search-input:focus {
  border-color: var(--blog-blue-400);
  box-shadow: 0 0 0 4px var(--blog-blue-200-rgb);
}

.search-info {
  margin: 0;
  color: var(--blog-slate-600);
  font-size: 0.9rem;
}

.lead {
  margin: 0;
  color: var(--blog-slate-600);
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
  border: 1px solid var(--blog-slate-200);
  border-radius: 12px;
  background: var(--blog-white);
  box-shadow: 0 8px 18px var(--blog-shadow-xs);
}

.aside-block h2 {
  margin: 0 0 0.65rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--blog-slate-500);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.65rem;
}

.total-count {
  font-size: 0.75rem;
  color: var(--blog-slate-500);
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
  color: var(--blog-slate-800);
  text-decoration: none;
  font-size: 0.88rem;
  border: 1px solid var(--blog-slate-200);
  border-radius: 8px;
  padding: 0.38rem 0.5rem;
  background: var(--blog-slate-50);
  transition: all 0.2s ease;
}

.tag-link:hover,
.archive-link:hover {
  background: var(--blog-blue-50);
  border-color: var(--blog-blue-200);
  color: var(--blog-blue-700);
}

.count {
  font-size: 0.75rem;
  color: var(--blog-slate-500);
}

.post-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.state {
  color: var(--blog-slate-500);
  font-size: 0.95rem;
}

.state.error {
  color: var(--blog-danger-700);
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

.calendar-block {
  padding: 1rem;
  border: 1px solid var(--blog-blue-100);
  border-radius: 16px;
  background: linear-gradient(180deg, var(--blog-calendar-bg-start) 0%, var(--blog-calendar-bg-end) 100%);
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.calendar-header-center {
  flex: 1;
  text-align: center;
}

.calendar-title {
  margin: 0 0 0.25rem;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--blog-slate-900);
}

.calendar-month {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--blog-blue-800);
}

.calendar-nav-btn {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--blog-blue-200);
  border-radius: 9999px;
  background: var(--blog-white);
  color: var(--blog-blue-700);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
}

.calendar-nav-btn > span {
  display: inline-block;
  line-height: 1;
  transform: translateY(-1px);
}

.calendar-nav-btn:hover {
  background: var(--blog-blue-50);
  transform: translateY(-1px);
}

.calendar-nav-btn:focus-visible {
  outline: 2px solid var(--blog-blue-300);
  outline-offset: 1px;
}

.calendar-time {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--blog-blue-600);
}

.calendar-date {
  margin: 0 0 0.8rem;
  font-size: 0.92rem;
  color: var(--blog-slate-700);
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.4rem;
}

.calendar-weekday {
  text-align: center;
  font-size: 0.72rem;
  color: var(--blog-slate-500);
}

.calendar-days {
  justify-items: center;
}

.calendar-day {
  min-height: 36px;
  aspect-ratio: 1 / 1;
  width: 100%;
  max-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  color: var(--blog-slate-800);
  font-size: 0.88rem;
  position: relative;
  transition: transform 0.2s ease, background-color 0.2s ease;
}

.calendar-day.today {
  color: var(--blog-white);
  border-radius: 9999px;
}

.calendar-day.today .calendar-day-number {
  background: var(--blog-calendar-today-bg);
  inline-size: 24px;
  block-size: 24px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}

.calendar-day .calendar-day-number {
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.calendar-day-dot {
  position: absolute;
  bottom: 6px;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--blog-blue-300);
  transform: translateX(-50%);
}

.calendar-day-dot.dot-level-1 {
  background: var(--blog-blue-400);
}

.calendar-day-dot.dot-level-2 {
  background: var(--blog-blue-600);
}

.calendar-day-dot.dot-level-3 {
  background: var(--blog-blue-700);
}

.calendar-day-dot.dot-level-4 {
  background: var(--blog-blue-800);
}

.page-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--blog-overlay-light);
}

.loading-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.2rem 1.4rem;
  border-radius: 16px;
  background: var(--blog-white);
  box-shadow: 0 18px 40px var(--blog-shadow-md);
}

.spinner {
  width: 42px;
  height: 42px;
  border: 4px solid var(--blog-slate-300);
  border-top-color: var(--blog-link);
  border-radius: 999px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
