# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server (http://localhost:3000)
pnpm build        # Production build (runs prebuild → nuxt build)
pnpm generate     # Static generation
pnpm preview      # Preview production build locally
pnpm lint         # ESLint (via @nuxt/eslint-config)
```

The `prebuild` script runs `scripts/generate-feeds.mjs` which reads `content/blog/*.md` front matter and generates `public/rss.xml` and `public/sitemap.xml`.

## Architecture

This is a **Nuxt 3** blog app with `@nuxt/content` for markdown-driven blogging and `@vant/nuxt` for mobile UI components (Vant).

### Blog system

- Content lives in `content/blog/` as `.md` files with front matter (`title`, `description`, `date`, `tags`, `pinned`, `draft`).
- `composables/useBlogPosts.ts` — shared blog query logic: `fetchBlogMetaList()`, slug/path utilities, pagination constant (`BLOG_PAGE_SIZE = 8`). Used by both blog listing and detail pages.
- `composables/useBlogNavigationLoading.ts` — shows a full-screen loading overlay during blog page navigation via router guards. Called once in `app.vue`.
- `pages/blog/index.vue` — blog list with search (debounced, synced to route query `?q=`), tag sidebar, monthly archive sidebar, calendar widget, pagination (`?page=`).
- `pages/blog/[...slug].vue` — blog post detail. Supports Shiki syntax highlighting (theme: `github-dark`), TOC (desktop sidebar + mobile slide-out), reading progress bar, code copy buttons, prev/next post navigation, and lazy-loaded comment system.
- `pages/blog/tag/[tag].vue` and `pages/blog/archive/[month].vue` — filtered blog listings.

### Comment system

Supports both Giscus and Utterances, configured via `runtimeConfig.public.comments`. Comment count is fetched server-side via `/api/giscus-comment-count` and `/api/utterances-comment-count`. Components: `GiscusComments.vue`, `UtterancesComments.vue`. Comments load lazily (IntersectionObserver) unless `comments.eagerLoad: true`.

### File browser / route tree

`pages/file-browser.vue`, `pages/route-tree.vue`, `pages/source-view.vue` — file browser that reads project files via local `git ls-files` with GitHub API fallback. Server routes in `server/routes/project-files/` use utilities from `server/utils/project-files.ts`.

### Quick entry panel

`app.vue` renders a floating button (mobile) / Ctrl+Z shortcut (desktop) that opens a quick navigation panel. Links defined in `constants/quick-entry-links.ts`.

### Tech demo pages

`pages/tech/` contains demo pages for Vue APIs (ref, reactive, watch, computed, proxy, provide/inject, defineModel). These are standalone examples, not part of the blog system.

### CSS conventions

**All colors must use CSS variables.** Never write hardcoded `#hex`, `rgb()`, or `rgba()` values. Variables are defined in `assets/styles/global.css` with a `--blog-` prefix. When adding new colors, add the variable to `:root` in that file first, then reference it. When modifying nearby styles, replace any existing hardcoded colors with variables. The only exceptions are the `.demo-block` styles in `global.css` (legacy).

### API proxy

The dev server proxies `/api/jjshouse/**` to `https://www.jjshouse.com/api/**`. The Nitro route rule also proxies in production.
