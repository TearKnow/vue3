# 词汇学习页（Nuxt）

**路由**: `/words`（原 `/words.html` 301 重定向）

## 数据

| 路径 | 说明 |
|------|------|
| `data/words/meta.json` | 各册课数、词数（源码；`prebuild` 同步到 `server/assets/words`） |
| `data/words/book-{1-4}.json` | 分册词条 |
| `public/nce/{2-4}/{课号}.json` | 课文正文 |
| `GET /api/words/meta` | 元数据（长期缓存） |
| `GET /api/words/:book` | 分册词表（长期缓存） |

## 代码

- `pages/words/index.vue` — 页面
- `composables/useWordsPage.ts` — 状态、筛选、课文/随机练习
- `composables/useWordsAudio.ts` — 发音与连播
- `assets/styles/words.css` — 样式

功能说明详见旧版整理（交互与 localStorage 键名一致）。