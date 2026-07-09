<template>
  <div class="wiki-page" :class="{ 'wiki-page--editing': editing }">
    <!-- 阅读模式 -->
    <template v-if="!editing">
      <div v-if="page" class="wiki-article-wrap">
        <nav v-if="breadcrumbs.length" class="wiki-breadcrumb" aria-label="当前位置">
          <NuxtLink to="/wiki" class="wiki-breadcrumb-link" no-prefetch>Wiki</NuxtLink>
          <template v-for="(item, index) in breadcrumbs" :key="item.path">
            <span class="wiki-breadcrumb-sep" aria-hidden="true">/</span>
            <NuxtLink
              v-if="!item.isCurrent && item.isPage"
              :to="item.path"
              no-prefetch
              class="wiki-breadcrumb-link"
            >
              {{ item.label }}
            </NuxtLink>
            <span
              v-else-if="!item.isCurrent"
              class="wiki-breadcrumb-folder"
            >
              {{ item.label }}
            </span>
            <span v-else class="wiki-breadcrumb-current">{{ item.label }}</span>
          </template>
        </nav>

        <div class="wiki-article">
        <header class="wiki-article-header">
          <div class="wiki-article-head-main">
            <h1 class="wiki-article-title">
              {{ page.title || slug }}
            </h1>
            <div v-if="page.date" class="wiki-article-meta">
              <time class="wiki-article-date" :datetime="String(page.date)">
                更新于 {{ page.date }}
              </time>
            </div>
          </div>
          <button
            type="button"
            class="wiki-action-btn"
            title="编辑此页"
            @click="startEdit"
          >
            <svg class="wiki-action-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>编辑</span>
          </button>
        </header>
        <ClientOnly>
          <InlineAnnotations :page-key="annotationPageKey">
            <div class="wiki-article-body">
              <ContentRenderer :value="page" />
            </div>
          </InlineAnnotations>
          <template #fallback>
            <div class="wiki-article-body">
              <ContentRenderer :value="page" />
            </div>
          </template>
        </ClientOnly>
        </div>
      </div>
      <div v-else-if="isReservedSlug" class="wiki-empty">
        <h2>页面不存在</h2>
        <p>该路径不可访问。</p>
      </div>
      <div v-else class="wiki-empty">
        <h2>此页面不存在</h2>
        <p>「{{ slug }}」尚未创建。</p>
        <button type="button" class="wiki-text-btn" @click="startEdit">
          创建此页面
        </button>
      </div>
    </template>

    <!-- 编辑模式 (客户端独有) -->
    <ClientOnly v-else>
      <WikiEditor
        :slug="slug"
        :initial-title="editTitle"
        :initial-content="editContent"
        @saved="onSaved"
        @cancel="editing = false"
      />
      <template #fallback>
        <div class="wiki-loading">
          加载编辑器中...
        </div>
      </template>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { buildWikiBreadcrumbs, filterWikiPages, isWikiBrowsablePage } from '~/composables/useWikiTree'
import { normalizeWikiSlug } from '~/utils/wiki-path'

definePageMeta({ layout: 'wiki' })

const route = useRoute()

// slug 就是路径中 /wiki/ 后面的部分（统一小写，避免大小写冲突）
const slug = computed(() => {
  const s = (route.params.slug as string[]) || []
  return normalizeWikiSlug(s.join('/'))
})

const rawSlug = computed(() => {
  const s = (route.params.slug as string[]) || []
  return s.join('/')
})

const isReservedSlug = computed(() => !isWikiBrowsablePage(`/wiki/${slug.value}`))

const { data: wikiPageList } = await useAsyncData('wiki-tree', () =>
  queryContent('/wiki').only(['_path', 'title']).find(),
)

const breadcrumbs = computed(() =>
  buildWikiBreadcrumbs(slug.value, filterWikiPages(wikiPageList.value || [])),
)

const annotationPageKey = computed(() => `wiki:${slug.value}`)

// 查询 wiki 页面内容
const { data: page } = await useAsyncData(`wiki-${slug.value}`, () => {
  if (!isWikiBrowsablePage(`/wiki/${slug.value}`))
    return Promise.resolve(null)
  return queryContent(`/wiki/${slug.value}`).findOne()
})

// ── 编辑状态 ──
const editing = ref(false)

// 从 query 参数获取初始标题（新建页面时传入）
const editTitle = ref((route.query.title as string) || (page.value?.title as string) || slug.value)
const editContent = ref('')

// 加载原始 markdown 内容用于编辑
async function loadRawContent() {
  try {
    const data = await $fetch<{ content: string }>('/api/wiki/raw', {
      query: { slug: slug.value },
    })
    if (data.content) {
      editContent.value = data.content
      return
    }
  }
  catch {
    // 文件不存在或读取失败
  }
  editContent.value = ''
}

async function startEdit() {
  editTitle.value = (route.query.title as string) || (page.value?.title as string) || slug.value
  await loadRawContent()
  editing.value = true
}

function onSaved() {
  editing.value = false
  refreshNuxtData(`wiki-${slug.value}`)
}

// 从「创建并编辑」跳转过来时，直接进入编辑模式
onMounted(async () => {
  if (rawSlug.value && rawSlug.value !== slug.value) {
    await navigateTo({
      path: `/wiki/${slug.value}`,
      query: route.query,
      replace: true,
    })
    return
  }

  const titleFromQuery = route.query.title
  if (typeof titleFromQuery === 'string' && titleFromQuery.trim() && !page.value) {
    await startEdit()
    await navigateTo({ path: route.path, replace: true })
  }
})
</script>

<style scoped>
.wiki-page {
  max-width: var(--wiki-content-max-width, 960px);
  margin: 0 auto;
  padding: 32px 32px 40px;
}

.wiki-page--editing {
  max-width: none;
  margin: 0;
  padding: 0;
}

.wiki-article-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wiki-breadcrumb {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--blog-slate-500);
}

.wiki-breadcrumb-link {
  color: var(--blog-slate-500);
  text-decoration: none;
  transition: color 0.15s ease;
}

.wiki-breadcrumb-link:hover {
  color: var(--blog-link);
}

.wiki-breadcrumb-sep {
  color: var(--blog-slate-300);
  user-select: none;
}

.wiki-breadcrumb-current {
  color: var(--blog-slate-700);
  font-weight: 500;
}

.wiki-breadcrumb-folder {
  color: var(--blog-slate-400);
}

.wiki-article {
  position: relative;
  overflow: hidden;
  background: var(--blog-white);
  border: 1px solid var(--blog-slate-200);
  border-radius: 20px;
  box-shadow:
    0 18px 42px var(--blog-shadow-xs-plus),
    0 0 0 1px var(--blog-blue-100);
}

.wiki-article::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 4px;
  background: linear-gradient(90deg, var(--blog-blue-600) 0%, var(--blog-cyan-500) 100%);
}

/* ── 阅读模式 ── */
.wiki-article-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 0;
  padding: 32px 36px 24px;
  border-bottom: 1px solid var(--blog-slate-200);
  background:
    linear-gradient(180deg, var(--wiki-hero-gradient-start) 0%, var(--blog-white) 100%),
    radial-gradient(ellipse 80% 120% at 100% 0%, var(--wiki-hero-accent) 0%, transparent 55%);
}

.wiki-article-head-main {
  min-width: 0;
  flex: 1;
}

.wiki-article-title {
  margin: 0 0 10px;
  font-size: clamp(1.7rem, 3.2vw, 2.2rem);
  line-height: 1.28;
  letter-spacing: 0.01em;
  color: var(--blog-slate-900);
}

.wiki-article-meta {
  margin-top: 2px;
}

.wiki-article-date {
  font-size: 13px;
  line-height: 1.5;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: var(--blog-slate-500);
}

.wiki-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  align-self: center;
  padding: 7px 12px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 8px;
  background: var(--blog-white);
  color: var(--blog-slate-600);
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 1px 2px var(--blog-shadow-xs);
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.wiki-action-btn-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.wiki-action-btn:hover {
  color: var(--blog-blue-800);
  background: var(--blog-blue-50);
  border-color: var(--blog-blue-200);
  box-shadow: 0 4px 12px var(--blog-shadow-xs);
}

.wiki-action-btn:focus-visible {
  outline: 2px solid var(--blog-blue-200);
  outline-offset: 2px;
}

.wiki-article-body {
  padding: 28px 36px 36px;
  font-size: 1.03rem;
  line-height: 1.85;
  color: var(--blog-slate-800);
  user-select: text;
  background:
    linear-gradient(180deg, var(--blog-white) 0%, var(--blog-slate-50) 220%);
}

/* ── ContentRenderer 内容样式 ── */
.wiki-article-body :deep(h1) {
  font-size: 1.55rem;
  margin: 0 0 16px;
  color: var(--blog-slate-900);
}

.wiki-article-body :deep(h2) {
  font-size: 1.28rem;
  margin: 2rem 0 0.75rem;
  color: var(--blog-slate-900);
}

.wiki-article-body :deep(h3) {
  font-size: 1.08rem;
  margin: 1.5rem 0 0.6rem;
  color: var(--blog-slate-800);
}

.wiki-article-body :deep(h2:last-child),
.wiki-article-body :deep(h3:last-child),
.wiki-article-body :deep(p:last-child),
.wiki-article-body :deep(ul:last-child),
.wiki-article-body :deep(ol:last-child),
.wiki-article-body :deep(blockquote:last-child),
.wiki-article-body :deep(pre:last-child) {
  margin-bottom: 0;
}

.wiki-article-body :deep(p) {
  margin: 0 0 1rem;
}

.wiki-article-body :deep(p:first-child) {
  font-size: 1.06rem;
  color: var(--blog-slate-700);
}

.wiki-article-body :deep(ul),
.wiki-article-body :deep(ol) {
  margin: 0 0 1rem;
  padding-left: 1.45rem;
}

.wiki-article-body :deep(li) {
  margin-bottom: 0.35rem;
}

.wiki-article-body :deep(li::marker) {
  color: var(--blog-blue-600);
}

.wiki-article-body :deep(pre) {
  margin: 0 0 1.2rem;
  border-radius: 12px;
  box-shadow: 0 10px 24px var(--blog-shadow-xs);
}

.wiki-article-body :deep(code) {
  padding: 0.12rem 0.38rem;
  border-radius: 6px;
  background: var(--blog-slate-100);
  font-size: 0.92em;
}

.wiki-article-body :deep(pre code) {
  padding: 0;
  background: transparent;
}

.wiki-article-body :deep(blockquote) {
  border-left: 4px solid var(--blog-blue-400);
  padding: 10px 18px;
  margin: 0 0 1rem;
  border-radius: 0 10px 10px 0;
  background: var(--blog-blue-50);
  color: var(--blog-slate-700);
}

.wiki-article-body :deep(hr) {
  border: 0;
  height: 1px;
  margin: 1.8rem 0;
  background: linear-gradient(90deg, transparent, var(--blog-slate-300), transparent);
}

.wiki-article-body :deep(a) {
  color: var(--blog-link);
  text-decoration: underline;
  text-decoration-color: var(--blog-link-underline);
  text-underline-offset: 3px;
  transition: color 0.18s ease, text-decoration-color 0.18s ease;
}

.wiki-article-body :deep(a:hover) {
  color: var(--blog-link-hover);
  text-decoration-color: var(--blog-link-underline-hover);
}

.wiki-article-body :deep(img) {
  max-width: 100%;
  border-radius: 12px;
  box-shadow: 0 12px 28px var(--blog-shadow-xs);
}

.wiki-article-body :deep(table) {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--blog-scrollbar-thumb) transparent;
  border-collapse: collapse;
  margin: 1rem 0;
}

.wiki-article-body :deep(table::-webkit-scrollbar) {
  height: 6px;
}

.wiki-article-body :deep(table::-webkit-scrollbar-track) {
  background: transparent;
}

.wiki-article-body :deep(table::-webkit-scrollbar-thumb) {
  background-color: var(--blog-scrollbar-thumb);
  border-radius: 999px;
}

.wiki-article-body :deep(table::-webkit-scrollbar-thumb:hover) {
  background-color: var(--blog-scrollbar-thumb-hover);
}

.wiki-article-body :deep(table::-webkit-scrollbar-button),
.wiki-article-body :deep(table::-webkit-scrollbar-corner) {
  display: none;
  width: 0;
  height: 0;
}

.wiki-article-body :deep(table th),
.wiki-article-body :deep(table td) {
  border: 1px solid var(--blog-slate-300);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.wiki-article-body :deep(table th) {
  background: var(--blog-slate-100);
  font-weight: 600;
  color: var(--blog-slate-900);
}

.wiki-text-btn {
  padding: 0;
  border: 0;
  background: none;
  color: var(--blog-link);
  font-size: 14px;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: var(--blog-link-underline);
  text-underline-offset: 2px;
}

.wiki-text-btn:hover {
  color: var(--blog-link-hover);
}

.wiki-empty {
  text-align: center;
  padding: 80px 28px;
  background: var(--blog-white);
  border: 1px dashed var(--blog-blue-200);
  border-radius: 20px;
  box-shadow: 0 14px 30px var(--blog-shadow-xs-plus);
}

.wiki-empty h2 {
  margin: 0 0 8px;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--blog-slate-800);
}

.wiki-empty p {
  color: var(--blog-slate-500);
  margin: 0 0 16px;
  font-size: 14px;
}

.wiki-loading {
  text-align: center;
  padding: 60px;
  color: var(--blog-slate-500);
}

@media (max-width: 768px) {
  .wiki-page {
    padding: 20px 16px 32px;
  }

  .wiki-article-header {
    padding: 24px 20px 20px;
  }

  .wiki-article-body {
    padding: 22px 20px 28px;
    font-size: 1rem;
  }
}
</style>
