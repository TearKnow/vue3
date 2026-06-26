<template>
  <div class="wiki-index">
    <h1 class="wiki-index-title">📚 Wiki 首页</h1>
    <p class="wiki-index-desc">
      左侧边栏浏览所有页面，点击「＋ 新建」创建新页面。
    </p>

    <!-- 按目录分组展示 -->
    <div v-if="pages.length > 0">
      <section v-for="group in groupedPages" :key="group.name" class="wiki-group">
        <h2 class="wiki-group-title">{{ group.name || '未分类' }}</h2>
        <NuxtLink
          v-for="p in group.pages"
          :key="p._path"
          class="wiki-list-item"
          :to="p._path"
        >
          <span class="wiki-list-title">{{ p.title || displayName(p._path) }}</span>
          <span v-if="p.date" class="wiki-list-date">{{ p.date }}</span>
        </NuxtLink>
      </section>
    </div>

    <div v-else class="wiki-empty">
      <p>还没有 Wiki 页面，点击侧边栏的「＋ 新建」创建第一篇。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'wiki' })

useSeoMeta({
  title: 'Wiki',
  description: '个人 Wiki 知识库',
})

const { data: pages } = await useAsyncData('wiki-index', () =>
  queryContent('/wiki').only(['_path', 'title', 'date']).find(),
)

function displayName(path?: string) {
  if (!path) return ''
  const parts = path.replace(/^\/wiki\//, '').split('/')
  return parts[parts.length - 1] || ''
}

// 按父目录分组
const groupedPages = computed(() => {
  const list = (pages.value || []).filter(p => p._path !== '/wiki')
  const groups = new Map<string, typeof list>()

  for (const page of list) {
    const parentPath = (page._path || '').replace(/\/[^/]+$/, '') // 去掉最后一个路径段
    const groupName = parentPath === '/wiki' ? '' : (parentPath.replace(/^\/wiki\//, '') || '')
    if (!groups.has(groupName)) groups.set(groupName, [])
    groups.get(groupName)!.push(page)
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([name, groupPages]) => ({
      name,
      pages: groupPages.sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    }))
})
</script>

<style scoped>
.wiki-index {
  padding: 32px 40px 80px;
  max-width: 800px;
}

@media (max-width: 768px) {
  .wiki-index {
    padding: 24px 20px 80px;
  }
}

.wiki-index-title {
  margin: 0 0 8px;
  font-size: 1.6rem;
  color: var(--blog-slate-900);
}

.wiki-index-desc {
  margin: 0 0 32px;
  color: var(--blog-slate-600);
  font-size: 15px;
}

.wiki-group {
  margin-bottom: 32px;
}

.wiki-group-title {
  margin: 0 0 10px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--blog-slate-700);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--blog-slate-200);
}

.wiki-list-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  text-decoration: none;
  color: var(--blog-slate-800);
  transition: background 0.15s;
}

.wiki-list-item:hover {
  background: var(--blog-slate-50);
}

.wiki-list-title {
  font-weight: 500;
  font-size: 14px;
}

.wiki-list-date {
  font-size: 13px;
  color: var(--blog-slate-500);
  white-space: nowrap;
}

.wiki-empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--blog-slate-500);
}
</style>
