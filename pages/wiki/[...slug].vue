<template>
  <div class="wiki-page">
    <!-- 阅读模式 -->
    <template v-if="!editing">
      <div v-if="page" class="wiki-article">
        <header class="wiki-article-header">
          <h1 class="wiki-article-title">
            {{ page.title || slug }}
          </h1>
          <div v-if="page.date" class="wiki-article-meta">
            <span>{{ page.date }}</span>
          </div>
          <button class="wiki-btn wiki-btn-primary" @click="startEdit">
            ✏️ 编辑
          </button>
        </header>
        <div class="wiki-article-body">
          <ContentRenderer :value="page" />
        </div>
      </div>

      <!-- 页面不存在 -->
      <div v-else class="wiki-empty">
        <h2>📝 此页面不存在</h2>
        <p>「{{ slug }}」尚未创建。要现在创建吗？</p>
        <button class="wiki-btn wiki-btn-primary" @click="startEdit">
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
import { ref, computed } from 'vue'

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
    const res = await fetch(`/api/project-files/content?file=content/wiki/${slug.value}.md`)
    if (res.ok) {
      const data = await res.json()
      if (data.content) {
        // 去掉 frontmatter
        const raw = data.content as string
        const body = raw.replace(/^---\n[\s\S]*?\n---\n?/, '').trim()
        editContent.value = body
        return
      }
    }
  }
  catch {
    // 文件不存在或读取失败
  }
  editContent.value = ''
}

async function startEdit() {
  await loadRawContent()
  editing.value = true
}

function onSaved() {
  editing.value = false
  refreshNuxtData(`wiki-${slug.value}`)
}
</script>

<style scoped>
.wiki-page {
  max-width: 860px;
  margin: 0 auto;
  padding: 24px 20px 80px;
}

/* ── 阅读模式 ── */
.wiki-article-header {
  margin-bottom: 32px;
}

.wiki-article-title {
  margin: 0 0 8px;
  font-size: 1.8rem;
  color: var(--blog-slate-900);
}

.wiki-article-meta {
  font-size: 14px;
  color: var(--blog-slate-500);
  margin-bottom: 16px;
}

.wiki-article-body {
  line-height: 1.9;
  color: var(--blog-slate-800);
}

/* ── ContentRenderer 内容样式 ── */
.wiki-article-body :deep(h1) { font-size: 1.6rem; margin: 0 0 16px; }
.wiki-article-body :deep(h2) { font-size: 1.3rem; margin: 28px 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--blog-slate-200); }
.wiki-article-body :deep(h3) { font-size: 1.1rem; margin: 22px 0 10px; }
.wiki-article-body :deep(p) { margin: 0 0 16px; }
.wiki-article-body :deep(ul), .wiki-article-body :deep(ol) { margin: 0 0 16px; padding-left: 24px; }
.wiki-article-body :deep(li) { margin-bottom: 6px; }
.wiki-article-body :deep(pre) { margin: 0 0 20px; border-radius: 8px; }
.wiki-article-body :deep(blockquote) {
  border-left: 3px solid var(--blog-blue-400);
  padding: 4px 20px;
  margin: 0 0 16px;
  color: var(--blog-slate-600);
}
.wiki-article-body :deep(a) { color: var(--blog-link); }

/* ── 空页面 ── */
.wiki-empty {
  text-align: center;
  padding: 80px 20px;
}

.wiki-empty h2 {
  margin: 0 0 12px;
  font-size: 1.4rem;
  color: var(--blog-slate-800);
}

.wiki-empty p {
  color: var(--blog-slate-600);
  margin-bottom: 24px;
}

.wiki-loading {
  text-align: center;
  padding: 60px;
  color: var(--blog-slate-500);
}
</style>
