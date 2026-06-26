# Wiki 功能设计

**日期**: 2026-06-26 | **状态**: 设计中

## 概述

在现有博客应用基础上增加 Wiki 功能，支持在线编辑 markdown 页面，通过 GitHub API 持久化内容，利用 Vercel 自动部署实现发布。

## 架构

```
content/wiki/              ← markdown 文件（和 blog 同模式，@nuxt/content 驱动）
pages/wiki/
  index.vue                ← Wiki 首页，列出所有页面
  [...slug].vue            ← Wiki 详情页，承载阅读模式 + 编辑模式
server/api/wiki/
  save.post.ts             ← 保存/创建页面 → GitHub Contents API → commit
```

### 数据流

```
编辑保存: 浏览器 → POST /api/wiki/save (+ password) → GitHub Contents API (PUT) → commit → Vercel 自动部署
阅读:     浏览器 → @nuxt/content 查询 content/wiki/ → ContentRenderer 渲染
```

## 功能模块

### 1. Wiki 内容存储

- 目录：`content/wiki/*.md`
- 每篇 markdown 文件带有 front matter: `title`, `date`, `tags`（可选）
- 复用 `@nuxt/content` 的查询能力，和博客模块一致

### 2. 页面路由

**`/wiki` — Wiki 首页**
- 列出所有 wiki 页面，展示 title、date、description
- 可搜索/过滤
- 「新建页面」按钮

**`/wiki/[...slug]` — Wiki 详情页**
- **阅读模式**：`<ContentRenderer>` 渲染 markdown
- **编辑模式**：点击「编辑」→ 输密码验证 → 切换到分屏编辑器

### 3. 编辑器（编辑模式）

- 分屏布局：左侧 markdown textarea，右侧实时预览
- 预览使用客户端 markdown 解析库（如 `markdown-it`），因为内容尚未 commit，不能走 `@nuxt/content`
- 同步滚动（左右联动）
- 密码验证通过后才能进入编辑模式
- 保存按钮调用 `POST /api/wiki/save`

### 4. 草稿保护

- 编辑内容每次变化（debounce 2s）自动存 localStorage
- Key 格式：`wiki-draft:<slug>`
- 打开编辑模式时检测未保存草稿 → 弹窗「你有未保存的草稿，要恢复吗？」
- 保存成功后清除对应草稿
- 纯前端逻辑，无后端依赖

### 5. Server API

**`POST /api/wiki/save`**
- 入参：`{ slug: string, title: string, content: string, password: string, message?: string }`
- 校验密码（环境变量 `WIKI_PASSWORD`）
- 调用 GitHub Contents API 创建/更新文件
- 文件路径：`content/wiki/<slug>.md`
- Commit message：`wiki: update <slug>` 或自定义
- 返回：`{ success: true, commit: { sha, url } }`

### 6. 安全

- 环境变量 `WIKI_PASSWORD` 配置密码
- 密码仅在 server 端校验，不暴露到客户端
- 读写权限：GitHub Token 需要 repo 权限（已有）
- 注意：GitHub Token 目前只用于读，确认权限范围

### 7. 入口

- 首页快捷入口卡片增加「Wiki」项
- 快捷入口弹窗（Ctrl+Z）增加「Wiki」链接
- 导航处也可加链接

## 组件树

```
pages/wiki/index.vue
  └── WikiPageList (列表卡片，可复用 BlogPostListCard 样式)

pages/wiki/[...slug].vue
  ├── 阅读模式
  │   └── ContentRenderer (渲染 markdown)
  └── 编辑模式
      ├── MarkdownEditor (textarea)
      └── MarkdownPreview (实时预览)

server/api/wiki/save.post.ts
  └── GitHub Contents API
```

## CSS 约定

- 所有颜色使用 CSS 变量（`--blog-` 前缀），遵循项目规范
- 新增颜色变量先加到 `assets/styles/global.css` 的 `:root`

## 待确认

- [ ] GitHub Token 是否有 write 权限？（当前 token 用途为读文件，需确认权限范围）
- [ ] 是否需要 Wiki 页面之间的内部链接语法（如 `[[wikilink]]`）？
- [ ] Vercel 部署后到内容更新上线约有 1-2 分钟延迟，是否可接受？
