<template>
  <div class="wiki-page" :class="{ 'wiki-page--editing': editing }">
    <!-- 阅读模式 -->
    <template v-if="!editing">
      <div v-if="page" class="wiki-article">
        <header class="wiki-article-header">
          <div class="wiki-article-head-main">
            <h1 class="wiki-article-title">
              {{ page.title || slug }}
            </h1>
            <div v-if="page.date" class="wiki-article-meta">
              <span class="wiki-article-date">{{ page.date }}</span>
            </div>
          </div>
          <button
            type="button"
            class="wiki-action-btn"
            title="编辑"
            @click="startEdit"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            <span>编辑</span>
          </button>
        </header>
        <div class="wiki-article-body">
          <ContentRenderer :value="page" />
        </div>
      </div>

      <!-- 页面不存在 -->
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

definePageMeta({ layout: 'wiki' })

const route = useRoute()

// slug 就是路径中 /wiki/ 后面的部分
const slug = computed(() => {
  const s = (route.params.slug as string[]) || []
  return s.join('/')
})

// 查询 wiki 页面内容
const { data: page } = await useAsyncData(`wiki-${slug.value}`, () =>
  queryContent(`/wiki/${slug.value}`).findOne(),
)

// ── 编辑状态 ──
const editing = ref(false)

// 从 query 参数获取初始标题（新建页面时传入）
const editTitle = ref((route.query.title as string) || (page.value?.title as string) || slug.value)
const editContent = ref('')

// 加载原始 markdown 内容用于编辑
async function loadRawContent() {
  try {
    const data = await $fetch<{ content: string }>('/project-files/content', {
      query: { file: `content/wiki/${slug.value}.md` },
    })
    if (data.content) {
      // 去掉 frontmatter（兼容 \n 与 \r\n）
      const body = data.content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim()
      editContent.value = body
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
  padding: 32px 32px 88px;
}

.wiki-page--editing {
  max-width: none;
  margin: 0;
  padding: 0;
}

.wiki-article {
  position: relative;
  overflow: hidden;
  background: var(--blog-white);
  border: 1px solid var(--blog-slate-200);
  border-radius: 20px;
  box-shadow: 0 18px 42px var(--blog-shadow-xs-plus);
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
  padding: 34px 36px 26px;
  border-bottom: 1px solid var(--blog-slate-200);
  background: linear-gradient(180deg, var(--wiki-hero-gradient-start) 0%, var(--blog-white) 100%);
}

.wiki-article-head-main {
  min-width: 0;
  flex: 1;
}

.wiki-article-title {
  margin: 0 0 12px;
  font-size: clamp(1.7rem, 3.2vw, 2.2rem);
  line-height: 1.28;
  letter-spacing: 0.01em;
  color: var(--blog-slate-900);
}

.wiki-article-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.wiki-article-date {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--blog-blue-50);
  border: 1px solid var(--blog-blue-100);
  color: var(--blog-blue-800);
  font-size: 12px;
  font-weight: 600;
}

.wiki-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 6px 11px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 999px;
  background: var(--blog-overlay-light);
  color: var(--blog-slate-500);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 0.2s ease, color 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.wiki-article-header:hover .wiki-action-btn,
.wiki-action-btn:focus-visible {
  opacity: 1;
}

.wiki-action-btn:hover {
  color: var(--blog-blue-800);
  background: var(--blog-white);
  border-color: var(--blog-blue-200);
  box-shadow: 0 6px 16px var(--blog-shadow-xs);
}

.wiki-article-body {
  padding: 30px 36px 38px;
  font-size: 1.03rem;
  line-height: 1.85;
  color: var(--blog-slate-800);
}

/* ── ContentRenderer 内容样式 ── */
.wiki-article-body :deep(h1) {
  font-size: 1.55rem;
  margin: 0 0 16px;
  color: var(--blog-slate-900);
}

.wiki-article-body :deep(h2) {
  position: relative;
  font-size: 1.28rem;
  margin: 2rem 0 0.9rem;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--blog-slate-200);
  color: var(--blog-slate-900);
}

.wiki-article-body :deep(h2)::before {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 56px;
  height: 2px;
  background: linear-gradient(90deg, var(--blog-blue-600), var(--blog-cyan-500));
  border-radius: 999px;
}

.wiki-article-body :deep(h3) {
  font-size: 1.08rem;
  margin: 1.5rem 0 0.6rem;
  color: var(--blog-slate-800);
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
    padding: 20px 16px 80px;
  }

  .wiki-article-header {
    padding: 24px 20px 20px;
  }

  .wiki-article-body {
    padding: 22px 20px 28px;
    font-size: 1rem;
  }

  .wiki-action-btn {
    opacity: 1;
  }
}
</style>
