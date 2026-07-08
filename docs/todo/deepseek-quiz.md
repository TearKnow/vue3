# DeepSeek 出题功能（待办）

> 状态：规划中，尚未开始  
> 记录时间：2026-07-08  
> 更新：2026-07-08 — 改为**会话式**交互，保留多轮历史；需 **Wiki 编辑密码** 解锁后方可使用

## 目标

接入 DeepSeek API，根据 Wiki 文章内容或指定主题进行**多轮对话式**自测：出题、作答、追问、讲解可连续进行，**不会因为回答一次就清空上次互动**。

## 交互形态（已确认）

采用**聊天会话 UI**，而非「点一次出一批题、刷新即没」的单次模式：

| 能力 | 说明 |
|------|------|
| 多轮上下文 | 每次请求携带完整 `messages[]`，模型记得前面出过什么题、用户答了什么 |
| 历史保留 | 当前会话消息列表持久化到 `localStorage`（按 Wiki 文章 slug 或会话 id 分桶） |
| 连续互动 | 支持「再出一题」「我选 B，为什么错」「换个角度考」等追问 |
| 新开会话 | 提供「重新开始」按钮，手动清空当前会话（不自动清） |
| 会话恢复 | 再次打开同一篇文章的「考考我」时，自动恢复上次未清空的对话 |

## 访问控制（已确认）

**必须先通过 Wiki 编辑密码验证，才能打开聊天面板并调用接口**，防止 DeepSeek API 被匿名刷量。

| 环节 | 做法 |
|------|------|
| 前端解锁 | 打开「考考我」时，若本地无有效密码则弹出解锁层（复用 `WikiEditor` 同款交互） |
| 密码记忆 | 复用 `utils/wiki-edit-password.ts`（`localStorage`，24 小时有效），与编辑功能共用同一份解锁状态 |
| 服务端校验 | `chat.post.ts` 每次请求 body 必带 `password`，调用 `assertWikiPassword()`（与 `save.post.ts` / `verify.post.ts` 一致） |
| 未授权 | 返回 `401`，前端清除本地密码并回到解锁层 |
| 限流（建议） | 同一 IP / 密码 每分钟请求次数上限，作为第二道防线 |

**注意：** 仅前端隐藏入口不够，必须在服务端校验密码；否则直接 `curl /api/quiz/chat` 仍可滥用。

## 架构概要

```
前端（聊天面板：消息列表 + 输入框）
    ↓ 未解锁 → 密码层（/api/wiki/verify）
    ↓ POST { password, sessionId?, slug?, messages[], context? }
server/api/quiz/chat.post.ts
    ↓ assertWikiPassword(password)   ← 无密码 / 错误则 401
    ↓ 组装 system prompt（文章摘要/全文 + 出题规则）
    ↓ 转发 messages 历史
DeepSeek API（chat/completions，多轮 messages）
    ↓
返回 assistant 消息 → 追加到会话列表并写回 localStorage
```

**与单次模式的区别：** 不再只有 `generate` 一次性接口；核心是 `chat`，前端负责维护并回传 `messages` 数组。

## 会话数据结构（草案）

```ts
interface QuizSession {
  id: string
  slug: string          // 关联的 Wiki 路径，如 algorithm/start
  title: string
  createdAt: number
  updatedAt: number
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
    // 可选：结构化题目卡片，便于 UI 渲染选择题
    quiz?: { question: string; options: string[]; answer: string; explanation?: string }
  }>
}
```

- `localStorage` key 示例：`wiki-quiz-session:{slug}`
- `system` 消息由服务端根据文章内容注入，可不存前端或仅存摘要
- 结构化 `quiz` 字段：模型用 JSON 块返回时解析，方便渲染选项按钮

## 待办清单

- [ ] **环境配置**：`DEEPSEEK_API_KEY`、`DEEPSEEK_MODEL`（默认 `deepseek-chat`）写入环境变量；在 `nuxt.config.ts` 的 `runtimeConfig` 中注册（仅服务端，不放 `public`）
- [ ] **服务端接口**：新增 `server/api/quiz/chat.post.ts`，接收 `password`（必填）+ `messages[]` + 可选 `slug/context`；先 `assertWikiPassword` 再调 DeepSeek
- [ ] **访问控制 UI**：聊天面板打开前校验密码；复用 `getStoredWikiEditPassword` 自动解锁；401 时清除并回到密码层
- [ ] **Prompt 与协议**：system prompt 定义角色（考官/助教）、出题格式、何时返回结构化 JSON；限制 context token
- [ ] **会话存储**：`utils/wiki-quiz-session.ts` — 读/写/清空 `localStorage`，按 slug 恢复会话
- [ ] **聊天 UI 组件**：消息气泡列表、选择题卡片、文本输入、发送、加载态、「重新开始」
- [ ] **Wiki 接入**：文章页侧栏或浮层打开「考考我」聊天面板，带入当前页标题与内容作为 context
- [ ] **安全与体验**：接口限流、错误重试、超长历史截断（只保留最近 N 轮）；API Key 与 `WIKI_PASSWORD` 均不暴露前端

## 待确认（开始做之前）

1. **出题来源**：基于当前 Wiki 文章全文，还是仅标题/主题？（全文更准但 token 多，可先做摘要）
2. **题型**：选择题为主，还是允许开放问答混排？
3. **入口位置**：文章页浮层、侧栏抽屉，或独立 `/wiki/quiz/[slug]` 页面？
4. **会话有效期**：`localStorage` 永久保留直到手动清空，还是 7 天过期？（可参考 `utils/wiki-edit-password.ts` 的 TTL 模式）

## 参考

- DeepSeek API 文档：https://api-docs.deepseek.com/（`messages` 多轮对话）
- 密码校验：`server/utils/wiki-github.ts` → `assertWikiPassword()`；`server/api/wiki/verify.post.ts`
- 本地密码记忆：`utils/wiki-edit-password.ts`（24h，与 Wiki 编辑共用）
- 解锁 UI 参考：`components/WikiEditor.vue`
