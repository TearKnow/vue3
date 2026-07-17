# Wiki Visit Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将本地未同步 Wiki 访问增量安全累加到 GitHub JSON，并让常用页面只按远端累计次数排行。

**Architecture:** 本地分为“新增量”和“正在同步批次”两个存储；服务端通过批次 ID 幂等合并、GitHub SHA 冲突重试保证不重复、不覆盖。独立常用页面组件负责远端读取、同步按钮、密码鉴权和排行展示。

**Tech Stack:** Nuxt 3、Vue 3、Nitro API、GitHub Contents API、localStorage、Node.js test runner

## Global Constraints

- GitHub 文件固定为 `data/wiki/visits.json`。
- 本地 key 固定为 `wiki-visit-counts` 和 `wiki-visit-sync-batch`。
- 排行只使用远端累计次数；本地增量不参与展示。
- 同步成功前不得删除批次；同步期间新增访问必须保留。
- 同一批次 ID 重试不得重复累加。
- GitHub 冲突最多重试 3 次，业务时间使用 `Asia/Shanghai`。
- 写入复用 Wiki 密码；无增量刷新不要求密码。

---

### Task 1: 访问同步领域模型与本地批次

**Files:**
- Modify: `utils/wiki-visit-counts.ts`
- Modify: `tests/wiki-visit-counts.test.ts`

**Interfaces:**
- Produces: `WikiVisitsFile`、`WikiVisitsResponse`、`WikiVisitSyncBatch`。
- Produces: `normalizeWikiVisitsFile()`、`applyWikiVisitSync()`、`serializeWikiVisitsFile()`。
- Produces: `prepareWikiVisitSyncBatch()`、`completeWikiVisitSyncBatch()`、`getPendingWikiVisitTotal()`。

- [ ] 先写失败测试，覆盖：

```ts
test('applyWikiVisitSync adds increments from different batches', () => {
  const first = applyWikiVisitSync(empty, { id: ID_A, counts: { '/wiki/a': 2 } }, NOW)
  const second = applyWikiVisitSync(first, { id: ID_B, counts: { '/wiki/a': 3 } }, NOW)
  assert.equal(second.counts['/wiki/a'], 5)
})

test('applyWikiVisitSync is idempotent for the same batch id', () => {
  const once = applyWikiVisitSync(empty, batch, NOW)
  const twice = applyWikiVisitSync(once, batch, NOW)
  assert.equal(twice.counts['/wiki/a'], once.counts['/wiki/a'])
})

test('completing a batch preserves visits recorded during sync', () => {
  const batch = prepareWikiVisitSyncBatch(ID_A)
  recordWikiVisit('/wiki/new-during-sync')
  completeWikiVisitSyncBatch(batch!.id)
  assert.equal(readWikiVisitCounts()['/wiki/new-during-sync'], 1)
})
```

- [ ] 运行测试确认新导出不存在而失败。
- [ ] 实现校验：批次 ID 8–80 字符；增量必须为 Wiki 路径和正安全整数；累计溢出时报错；`appliedSyncIds` 只保留最近 500 个。
- [ ] `prepareWikiVisitSyncBatch(id)` 优先返回已有批次；没有批次时把当前增量固化后清空增量 key。
- [ ] `completeWikiVisitSyncBatch(id)` 只删除 ID 匹配的批次，不操作新增量 key。
- [ ] 重跑测试确认通过。

### Task 2: GitHub JSON 与访问 API

**Files:**
- Create: `data/wiki/visits.json`
- Create: `server/utils/wiki-visits.ts`
- Create: `server/api/wiki/visits/index.get.ts`
- Create: `server/api/wiki/visits/sync.post.ts`

**Interfaces:**
- Produces: `GET /api/wiki/visits -> WikiVisitsResponse`。
- Produces: `POST /api/wiki/visits/sync`，请求 `{ password, id, counts }`，响应 `WikiVisitsResponse`。

- [ ] 创建空累计数据文件。
- [ ] 服务端工具优先读取 GitHub，失败回退本地；无 Token 时写本地。
- [ ] GET 仅返回 `{ counts, updatedAt }`。
- [ ] POST 校验 Wiki 密码并循环最多 3 次：加载最新文件 → 幂等合并 → 带 SHA 写入；409/422 时重试，其他错误直接抛出。
- [ ] 已应用批次直接返回，不触发 GitHub 写入。

### Task 3: 常用页面同步组件

**Files:**
- Create: `components/WikiFrequentPages.vue`
- Modify: `pages/wiki/index.vue`

**Interfaces:**
- Props: `pages: Array<{ _path: string, title?: string, date?: string, topic: string }>`。
- Consumes: 访问 API、本地批次工具、`utils/wiki-edit-password.ts`。

- [ ] 组件用 `useFetch('/api/wiki/visits')` SSR 读取远端累计次数；远端无排行时按日期回退前 2 篇。
- [ ] 标题旁添加无边框软色块同步按钮；本地待同步数为批次增量与新增量之和。
- [ ] 无增量点击只调用 `refresh()`；有增量时优先使用缓存密码，缺失或 401 时显示符合遮罩规则的密码弹框。
- [ ] 同步成功后删除对应批次并用响应更新排行；失败保留批次和错误提示。
- [ ] 监听 `storage` 事件刷新待同步数量。
- [ ] 首页删除原常用页面 section、本地排行状态和访问计数读取，改用 `<WikiFrequentPages :pages="wikiPagesWithTopic" />`。

### Task 4: 验证

- [ ] 运行领域测试与目标 ESLint。
- [ ] 浏览器验证：无远端数据回退、无增量刷新、有增量密码框、错误密码保留批次、375px 无溢出。
- [ ] API 验证错误密码返回 401。
- [ ] 运行 `pnpm build`；如仍只在既有 Nitro 预渲染阶段报 `Unexpected token 'default'`，记录该环境阻塞。
