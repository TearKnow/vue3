# Wiki Local Visit Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Wiki 首页“常用页面”改为当前浏览器访问次数最高的两篇文章，无记录时回退最近更新前两篇。

**Architecture:** 新增纯工具统一解析、累加和排序访问数据，详情页在有效文章加载后写入 `localStorage`，首页 SSR 先展示最近更新回退，挂载后读取本地计数并切换排行。

**Tech Stack:** Nuxt 3、Vue 3、localStorage、Node.js test runner

## Global Constraints

- localStorage key 固定为 `wiki-visit-counts`。
- 只保存规范化 Wiki 路径和非负整数次数。
- 最多展示 2 篇；同次数按文档日期从新到旧排列。
- 无有效访问记录、JSON 损坏或存储不可用时回退最近更新前 2 篇。
- 所有站内 `NuxtLink` 添加 `no-prefetch`，颜色使用 CSS 变量。

---

### Task 1: 访问统计纯工具

**Files:**
- Create: `utils/wiki-visit-counts.ts`
- Create: `tests/wiki-visit-counts.test.ts`

**Interfaces:**
- Produces: `parseWikiVisitCounts(raw)`、`incrementWikiVisitCount(counts, path)`、`selectFrequentWikiPages(pages, counts, limit)`、`readWikiVisitCounts()`、`recordWikiVisit(path)`。

- [ ] 先写失败测试，覆盖损坏 JSON、无效计数、计数累加、次数降序、同次数日期降序和不存在路径过滤。
- [ ] 运行 `node --experimental-strip-types --test tests/wiki-visit-counts.test.ts`，确认因模块不存在而失败。
- [ ] 实现最小逻辑；浏览器存储函数必须捕获存储异常，不能影响阅读页。
- [ ] 重跑测试，确认全部通过。

### Task 2: 详情页记录访问

**Files:**
- Modify: `pages/wiki/[...slug].vue`

- [ ] 在现有有效文章 watcher 中，客户端调用 `recordWikiVisit(pagePath)`；无效或不存在页面不记录。
- [ ] 保持 Cookie 最后阅读逻辑不变。

### Task 3: 首页常用页面排行

**Files:**
- Modify: `pages/wiki/index.vue`

- [ ] 删除写死的 `favoritePages`。
- [ ] SSR 初始使用空计数；`onMounted` 调用 `readWikiVisitCounts()`。
- [ ] 有有效计数时通过 `selectFrequentWikiPages(..., 2)` 展示排行；无结果时回退 `recentPages.slice(0, 2)`。
- [ ] 卡片链接改用 `_path`，副文案展示主题与日期。

### Task 4: 验证

- [ ] 运行：

```bash
node --experimental-strip-types --test tests/wiki-visit-counts.test.ts tests/wiki-plans.test.ts
pnpm exec eslint tests/wiki-visit-counts.test.ts utils/wiki-visit-counts.ts "pages/wiki/[...slug].vue" pages/wiki/index.vue
```

- [ ] 浏览器依次访问文章，确认排行按次数变化；清空或写入损坏存储后确认回退最近更新前两篇。
- [ ] 375px 视口确认无横向溢出。
