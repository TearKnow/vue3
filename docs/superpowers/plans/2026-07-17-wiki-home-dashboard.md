# Wiki Home Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Wiki 首页改造成结合自动统计与手动入口的个人知识工作台。

**Architecture:** 保持实现集中在 `pages/wiki/index.vue`。页面通过一次 `queryContent('/wiki')` 获取元数据，计算统计和最近更新；当前学习、常用页面及近期计划使用页面内常量配置，不引入后端、持久化或新依赖。

**Tech Stack:** Nuxt 3、Vue 3 Composition API、@nuxt/content、scoped CSS

## Global Constraints

- 所有颜色使用现有 CSS 变量，不新增硬编码颜色。
- 所有新增 `NuxtLink` 添加 `no-prefetch`。
- hover 不使用 `translateY` 或 `scale`。
- Wiki 首页在 `onMounted` 中继续调用 `removeNavigationLoadingOverlay()`。
- 仅修改 Wiki 首页及其页面级样式。

---

### Task 1: 首页数据模型与内容区块

**Files:**
- Modify: `pages/wiki/index.vue`

**Interfaces:**
- Consumes: `filterWikiPages(pages)`，输入包含 `_path`、`title`、`date` 的 Wiki 元数据。
- Produces: `pageCount`、`topicCount`、`latestUpdateDate`、`recentPages`，供首页模板展示。

- [ ] **Step 1: 扩展内容查询与类型**

将查询字段改为：

```ts
interface WikiHomePage {
  _path: string
  title?: string
  date?: string
}

const { data: pages } = await useAsyncData('wiki-index', () =>
  queryContent('/wiki').only(['_path', 'title', 'date']).find(),
)

const wikiPages = computed(() =>
  filterWikiPages((pages.value || []) as WikiHomePage[]),
)
```

- [ ] **Step 2: 添加自动统计**

```ts
const pageCount = computed(() => wikiPages.value.length)
const topicCount = computed(() => new Set(
  wikiPages.value
    .map(page => page._path.replace(/^\/wiki\/?/, '').split('/')[0])
    .filter(Boolean),
).size)
const recentPages = computed(() => [...wikiPages.value]
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  .slice(0, 5))
const latestUpdateDate = computed(() => recentPages.value.find(page => page.date)?.date || '')
```

- [ ] **Step 3: 添加手动配置**

```ts
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
```

- [ ] **Step 4: 替换模板**

模板包含：

- “我的知识库”顶部概览及文档数、主题数、最近更新时间；
- “继续学习”卡片；
- “常用页面”卡片列表；
- “最近更新”列表；
- “近期计划”清单；
- 无文档时的原有空状态。

每个站内链接均使用：

```vue
<NuxtLink :to="item.path" no-prefetch>
  {{ item.title }}
</NuxtLink>
```

- [ ] **Step 5: 运行静态检查**

Run:

```bash
pnpm exec eslint pages/wiki/index.vue
```

Expected: 命令退出码为 0，无 ESLint 错误。

### Task 2: 工作台响应式视觉

**Files:**
- Modify: `pages/wiki/index.vue`

**Interfaces:**
- Consumes: Task 1 中的区块 class。
- Produces: 桌面双栏、移动单栏的 Wiki 工作台布局。

- [ ] **Step 1: 重写 scoped CSS**

样式应满足：

- 顶部概览沿用现有渐变背景、蓝色边框与装饰光斑；
- 统计项使用三列网格；
- 主体在桌面端使用两列布局，“最近更新”占较宽列；
- 常用页面使用卡片网格；
- 近期计划使用无序列表和静态标记；
- 链接 hover 只改变边框、背景、文字或阴影；
- `max-width: 768px` 时所有网格切换为单列。

- [ ] **Step 2: 运行 lint**

Run:

```bash
pnpm exec eslint pages/wiki/index.vue
```

Expected: 命令退出码为 0。

- [ ] **Step 3: 浏览器验证**

在现有开发服务器打开 `/wiki`，验证：

1. 五个区块全部可见；
2. 文档数为 2，主题数为 1；
3. 所有手动入口均能进入现有页面；
4. 最近更新按日期倒序；
5. 375px 宽度下无横向滚动，区块为单列；
6. 页面加载完成后全屏导航 loading 消失。

- [ ] **Step 4: 最终构建验证**

Run:

```bash
pnpm build
```

Expected: Nuxt 构建成功，退出码为 0。
