# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.


### self
#### 安装pnpm
npm install pnpm -g


todo：随机一篇文章，做出有种抽奖的感觉，抽到了后每天固定，别换。



来自deepseek 2026-04-25：

性能优化

  1. 缺乏路由级缓存（ISR/SWR）

  nuxt.config.ts 的 routeRules 只配置了 jjshouse 代理，博客路由没有任何缓存策略。每次请求都会重新 SSR 渲染。

  // 建议在 nitro.routeRules 中加入：
  '/blog/**': { swr: 300 },  // 5分钟内返回缓存，后台重新验证

  2. 没有图片优化

  项目未安装 @nuxt/image，markdown 里的图片以原图分辨率加载，也没有 loading="lazy"。图片稍多的文章首屏会明显慢。

  3. 列表页查询包含了不需要的全文内容

  fetchBlogMetaList() 默认 includeContent: true，意味着博客列表页会拉取所有文章的完整 markdown
  body。列表页只需要做搜索匹配，不需要渲染全文，这个 payload 白传了。tag 和 archive 页面更完全不需要 body。

  4. 详情页客户端二次请求全量文章列表

  pages/blog/[...slug].vue 的 loadPostNavList()
  在客户端又请求了一遍完整的文章元数据列表，仅为了计算「上一篇/下一篇」。这个数据实际上可以从服务端一次性返回。

  5. 评论系统默认尽早加载

  eagerLoad: true 会让 Giscus/Utterances 的第三方 JS 在页面加载后就注入，影响首屏 TTI。可以考虑默认 false，完全依赖 IntersectionObserver
  懒加载。

  6. 代码块增强是客户端 DOM 操作

  enhanceCodeBlocks() 在每次文章加载后遍历所有 <pre> 元素，手动创建 .code-scroll 包裹层和复制按钮。这个逻辑应该通过 @nuxt/content 的
  content: { highlight: {} } 配置或自定义 rehype 插件在服务端完成，避免客户端 DOM 抖动。

  7. 没有 web font 优化

  未配置 @nuxt/fonts，也没有 font-display 策略。

  ---
  功能问题 & 建议

  需修复

  ┌──────────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────┐
  │                   问题                   │                                           说明                                            │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ robots.txt 是空文件                      │ 存在但无内容，搜索引擎无法发现 sitemap                                                    │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ sitemap.xml 硬编码 localhost             │ siteUrl 默认值是 http://localhost:3000，生产环境依赖环境变量但没有任何 fallback 提示      │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ sitemap 缺少 tag/archive 页面            │ 只有文章详情页被收录，列表衍生页缺失                                                      │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ RSS 无 auto-discovery                    │ HTML head 里没有 <link rel="alternate" type="application/rss+xml"> 标签，RSS              │
  │                                          │ 阅读器无法自动发现                                                                        │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ generate-feeds.mjs 的 frontmatter        │ 用的是手写正则逐行解析，遇到冒号、多行值会出错。建议换成 gray-matter 库                   │
  │ 解析很脆弱                               │                                                                                           │
  ├──────────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────┤
  │ viewport 禁止缩放                        │ maximum-scale=1, user-scalable=no 有可访问性问题                                          │
  └──────────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────┘

  建议新增

  ┌─────────────────┬─────────────────────────────────────────────────────────────────────────────┐
  │      功能       │                                    说明                                     │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 阅读时长估算    │ 在文章卡片和详情页显示「约 X 分钟」，对中文按 ~250 字/分钟计算              │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 相关文章推荐    │ 详情页底部根据标签交集推荐 2-3 篇相关文章                                   │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 暗色模式        │ CSS 变量体系已经有了，加一套 [data-theme="dark"] 的变量值和一个切换开关即可 │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ Open Graph 图片 │ 社交分享时没有预览图，可以用 nuxt-og-image 或写个简单的 server/og-image API │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 日历组件可交互  │ 目前侧边栏日历只展示当月，没有链接到对应日期的文章                          │
  ├─────────────────┼─────────────────────────────────────────────────────────────────────────────┤
  │ 文章内链接优化  │ markdown 里的外部链接没有加 target="_blank" rel="noopener"                  │
  └─────────────────┴─────────────────────────────────────────────────────────────────────────────┘

  ---
  总结优先级

  立即修： robots.txt 空文件、viewport 禁止缩放、sitemap localhost 问题
  性价比最高： 路由 ISR/SWR 缓存、列表页去掉 body 查询、图片懒加载
  长期价值： 暗色模式、OG 图片、相关文章推荐

  需要我针对其中哪些项开始改？