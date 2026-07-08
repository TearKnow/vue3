# Wiki 页面 AI 助手（待办）

> 状态：**第一版已实现**（2026-07-08）  
> 更新：2026-07-08 — **全站**页面可用（不仅 Wiki）

## 目标

全站任意页面提供 **AI 助教** 入口，针对**当前页面内容**提问；弹框内支持「考考我」快速出题。

## 已实现（v1）

- [x] 全站右下角 **「AI 助教」** 悬浮按钮（`app.vue`）
- [x] Wiki / 博客文章 / 其他页面自动识别上下文
- [x] 点击弹出聊天面板
- [x] 编辑密码解锁 + 24h 记忆
- [x] 多轮对话 + 按 `pageKey` 本地持久化
- [x] 快捷操作：**考考我**、**总结要点**
- [x] `server/api/ai/chat.post.ts`

## 页面上下文规则

| 页面类型 | pageKey 示例 | 正文来源 |
|----------|--------------|----------|
| Wiki 文章 | `wiki:algorithm/start` | `content/wiki/*.md` |
| 博客文章 | `blog:my-post` | `content/blog/*.md` |
| 其他页面 | `route:/tech/ref` | 仅路径说明（无正文时通用回答） |

## 环境变量

```bash
DEEPSEEK_API_KEY=sk-xxx
WIKI_PASSWORD=你的编辑密码
```

## 相关文件

| 文件 | 说明 |
|------|------|
| `components/WikiAiPanel.vue` | 悬浮钮 + 弹框 |
| `app.vue` | 全站接入 |
| `composables/useAiPageContext.ts` | 路由 → pageKey |
| `server/api/ai/chat.post.ts` | 聊天 API |
| `server/utils/site-page-body.ts` | 按路径读正文 |

## 后续可选

- [ ] 接口限流
- [ ] 非 Markdown 页面抓取可见正文
- [ ] 流式输出（SSE）
