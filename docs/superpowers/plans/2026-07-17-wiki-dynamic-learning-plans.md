# Wiki Dynamic Learning and Plans Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让“继续学习”自动指向最后阅读的 Wiki 文章，并让“近期计划”通过 GitHub JSON 跨设备编辑、排序、完成和恢复。

**Architecture:** Wiki 详情页使用一年期 Cookie 记录最后阅读路径，首页用当前内容元数据解析该路径。近期计划由纯领域工具负责校验和不可删除规则，服务端工具负责 GitHub/本地 JSON 持久化，独立 `WikiPlanCard` 组件负责读取、鉴权和编辑交互。

**Tech Stack:** Nuxt 3、Vue 3、@nuxt/content、Nitro API、GitHub Contents API、Node.js test runner

## Global Constraints

- 业务时间使用 `Asia/Shanghai`，禁止用 UTC 日期冒充北京时间。
- 所有颜色使用现有 `--blog-` CSS 变量，不新增硬编码颜色。
- 按钮和徽标不使用细描边胶囊样式。
- hover 不使用 `translateY` 或 `scale`。
- 新增 `NuxtLink` 必须添加 `no-prefetch`。
- 弹框遮罩按 `pointerdown.self` / `pointerup.self` 配对关闭，并处理 `pointercancel`。
- 已有计划不得永久删除；保存请求缺失任何已有 ID 时必须拒绝。

---

### Task 1: 计划领域模型与北京时间戳

**Files:**
- Create: `utils/wiki-plans.ts`
- Modify: `utils/beijing-time.ts`
- Create: `tests/wiki-plans.test.ts`

**Interfaces:**
- Produces: `WikiPlan`, `WikiPlansFile`, `WikiPlansResponse`, `normalizeWikiPlansFile()`, `prepareWikiPlansSave()`, `serializeWikiPlansFile()`。
- Produces: `formatBeijingDateTime(date?: Date): string`，格式为 `YYYY-MM-DDTHH:mm:ss+08:00`。

- [ ] **Step 1: 写失败测试**

测试必须覆盖：

```ts
test('formatBeijingDateTime formats a UTC instant in Asia/Shanghai', () => {
  assert.equal(
    formatBeijingDateTime(new Date('2026-07-17T06:30:45.000Z')),
    '2026-07-17T14:30:45+08:00',
  )
})

test('prepareWikiPlansSave rejects removal of an existing plan', () => {
  assert.throws(
    () => prepareWikiPlansSave(existing, [], NOW),
    /不能删除已有计划/,
  )
})

test('prepareWikiPlansSave stamps completion and preserves history', () => {
  const saved = prepareWikiPlansSave(existing, [
    { ...existing.plans[0], status: 'completed' },
  ], NOW)
  assert.equal(saved.plans[0].completedAt, NOW)
})

test('prepareWikiPlansSave restores a completed plan', () => {
  const saved = prepareWikiPlansSave(completed, [
    { ...completed.plans[0], status: 'active' },
  ], NOW)
  assert.equal(saved.plans[0].completedAt, undefined)
})
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
node --experimental-strip-types --test tests/wiki-plans.test.ts
```

Expected: FAIL，因为目标模块或导出尚不存在。

- [ ] **Step 3: 实现最小领域逻辑**

`WikiPlan` 字段固定为：

```ts
export interface WikiPlan {
  id: string
  text: string
  status: 'active' | 'completed'
  createdAt: string
  completedAt?: string
}

export interface WikiPlansFile {
  plans: WikiPlan[]
  updatedAt: string
}

export interface WikiPlansResponse extends WikiPlansFile {
  version: string
}
```

`prepareWikiPlansSave(existing, incoming, now)` 必须：

1. 校验 ID 唯一、文本非空且不超过 200 字；
2. 拒绝缺失任何已有 ID；
3. 为新增项补 `createdAt`；
4. `active → completed` 时写入 `completedAt`；
5. `completed → active` 时删除 `completedAt`；
6. 保持请求数组顺序并写入 `updatedAt`。

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
node --experimental-strip-types --test tests/wiki-plans.test.ts
```

Expected: 全部 PASS。

### Task 2: GitHub JSON 持久化与 API

**Files:**
- Create: `data/wiki/plans.json`
- Create: `server/utils/wiki-plans.ts`
- Create: `server/api/wiki/plans/index.get.ts`
- Create: `server/api/wiki/plans/save.post.ts`

**Interfaces:**
- Consumes: Task 1 的领域模型和 `server/utils/wiki-github.ts`。
- Produces: `GET /api/wiki/plans -> WikiPlansResponse`。
- Produces: `POST /api/wiki/plans/save`，请求 `{ password, plans, version }`，响应 `WikiPlansResponse`。

- [ ] **Step 1: 创建初始数据**

把首页现有三项计划迁移为 `active`，使用稳定 ID；`createdAt` 和 `updatedAt` 使用当前北京时间格式。

- [ ] **Step 2: 实现服务端持久化工具**

`loadWikiPlansFile()` 优先读取 GitHub 的 `data/wiki/plans.json`，无远端内容时回退本地文件；返回 `{ data, sha }`。

`writeWikiPlansFile(data, sha)` 有 GitHub Token 时调用 `writeGithubFile()`，否则写回本地文件；返回新 SHA 或空字符串。

- [ ] **Step 3: 实现读取 API**

GET 返回：

```ts
const { data, sha } = await loadWikiPlansFile()
return { ...data, version: sha }
```

- [ ] **Step 4: 实现保存 API**

保存流程：

```ts
assertWikiPassword(password)
const current = await loadWikiPlansFile()
if (String(version || '') !== current.sha)
  throw createError({ statusCode: 409, statusMessage: '计划已在其他设备更新，请重新加载' })
const next = prepareWikiPlansSave(current.data, plans, formatBeijingDateTime())
const nextVersion = await writeWikiPlansFile(next, current.sha)
return { ...next, version: nextVersion }
```

将领域校验错误转换为 400，认证失败保持 401，SHA 冲突返回 409。

- [ ] **Step 5: 运行领域测试和 API 文件 lint**

Run:

```bash
node --experimental-strip-types --test tests/wiki-plans.test.ts
pnpm exec eslint utils/wiki-plans.ts utils/beijing-time.ts server/utils/wiki-plans.ts server/api/wiki/plans/index.get.ts server/api/wiki/plans/save.post.ts
```

Expected: 测试全部 PASS，ESLint 退出码 0。

### Task 3: 最后阅读 Cookie

**Files:**
- Modify: `pages/wiki/[...slug].vue`
- Modify: `pages/wiki/index.vue`

**Interfaces:**
- Produces/consumes: Cookie `wiki-last-read`，值为规范化 `/wiki/<slug>` 路径，`maxAge = 31536000`、`sameSite = 'lax'`、`path = '/'`。

- [ ] **Step 1: 在详情页记录有效文章**

创建 Cookie ref，并监听 `page` 与 `slug`；仅当 `page.value` 存在且路径可浏览时写入规范化路径。

- [ ] **Step 2: 首页解析最后阅读文章**

删除写死的 `currentLearning`，改为：

```ts
const lastReadPath = useCookie<string>('wiki-last-read')
const currentLearningPage = computed(() =>
  wikiPages.value.find(page => page._path === lastReadPath.value)
    || recentPages.value[0]
    || null,
)
```

卡片展示当前元数据标题、主题和更新日期；按钮跳转到 `currentLearningPage._path`。

- [ ] **Step 3: 运行页面 lint**

Run:

```bash
pnpm exec eslint "pages/wiki/[...slug].vue" pages/wiki/index.vue
```

Expected: 退出码 0。

### Task 4: 可编辑计划卡片

**Files:**
- Create: `components/WikiPlanCard.vue`
- Modify: `pages/wiki/index.vue`

**Interfaces:**
- Consumes: Task 2 的两个 API、`utils/wiki-edit-password.ts`。
- Produces: 活动计划展示与新增、修改、拖动排序、完成、历史折叠、恢复、保存和取消交互。

- [ ] **Step 1: 实现读取与只读状态**

组件使用 `useFetch<WikiPlansResponse>('/api/wiki/plans')`；只读卡片仅渲染 `status === 'active'`，无活动项时显示“近期计划已完成”。

- [ ] **Step 2: 实现密码解锁**

点击编辑时先验证 `getStoredWikiEditPassword()`；无缓存或验证失败时打开密码弹框。成功后调用 `setStoredWikiEditPassword()` 并进入编辑态，失败则清除缓存并展示错误。

- [ ] **Step 3: 实现本地编辑**

- 新增项使用 `crypto.randomUUID()`，追加到活动列表末尾；
- 文本使用受控输入；
- HTML5 drag/drop 重排活动项，移动端同时提供上移/下移按钮；
- 完成后移入折叠历史区；
- 历史项可恢复为活动状态；
- 不渲染永久删除操作。

- [ ] **Step 4: 实现保存与冲突处理**

点击保存一次提交完整数组和当前 `version`。成功后替换响应数据并退出编辑；401 清除密码并重新要求认证；409 保留草稿并提示重新加载；其他错误保留草稿并显示错误。

- [ ] **Step 5: 实现现代化响应式样式**

使用无边框软色块状态、实心主按钮和 8–12px 圆角；禁止描边胶囊和位移动效。密码弹框遵循项目遮罩关闭规则。

- [ ] **Step 6: 替换首页静态计划**

删除 `upcomingPlans` 和原计划 section，使用：

```vue
<WikiPlanCard class="wiki-panel wiki-plans" />
```

- [ ] **Step 7: 运行组件 lint**

Run:

```bash
pnpm exec eslint components/WikiPlanCard.vue pages/wiki/index.vue
```

Expected: 退出码 0。

### Task 5: 集成验证

**Files:**
- Verify: all files above

- [ ] **Step 1: 运行自动验证**

Run:

```bash
node --experimental-strip-types --test tests/wiki-plans.test.ts
pnpm exec eslint utils/wiki-plans.ts utils/beijing-time.ts server/utils/wiki-plans.ts server/api/wiki/plans/index.get.ts server/api/wiki/plans/save.post.ts components/WikiPlanCard.vue "pages/wiki/[...slug].vue" pages/wiki/index.vue
```

Expected: 测试全部 PASS，ESLint 退出码 0。

- [ ] **Step 2: 浏览器验证继续学习**

依次打开两篇 Wiki 文章并返回首页，确认“继续学习”分别指向最后打开的文章；删除或手动写入无效 Cookie 后确认回退最近更新文章。

- [ ] **Step 3: 浏览器验证计划编辑**

验证密码认证、新增、改名、排序、完成后隐藏、历史展开、恢复、取消不保存，以及错误时草稿保留。确认没有永久删除入口。

- [ ] **Step 4: 验证移动端**

在 375px 视口确认无横向滚动、计划可用上移/下移排序、密码弹框可安全关闭。

- [ ] **Step 5: 构建验证**

Run:

```bash
pnpm build
```

Expected: Nuxt 构建退出码 0；若仍在既有 Nitro 预渲染阶段报 `Unexpected token 'default'`，记录为现有环境阻塞，并确认本次客户端和服务端模块编译已完成。
