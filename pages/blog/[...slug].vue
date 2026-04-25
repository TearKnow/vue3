<template>
  <div class="blog-article">
    <div
      class="reading-progress"
      :style="{ transform: `scaleX(${readingProgress})` }"
      aria-hidden="true"
    />
    <div class="top-bar">
      <p class="back">
        <NuxtLink to="/blog">← 全部文章</NuxtLink>
      </p>
      <button
        type="button"
        class="comment-nav-btn"
        aria-label="Scroll to comments"
        @click="scrollToComments"
      >
        <svg
          class="comment-nav-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span
          v-if="commentsCount !== null"
          class="comment-nav-count"
          aria-hidden="true"
        >({{ commentsCount }})</span>
      </button>
      <button
        v-if="tocLinks.length"
        type="button"
        class="toc-toggle"
        :aria-expanded="tocOpen ? 'true' : 'false'"
        aria-controls="mobile-toc"
        @click="tocOpen = !tocOpen"
      >
        <span class="line" />
        <span class="line" />
        <span class="line" />
      </button>
    </div>

    <div
      v-if="tocLinks.length && tocOpen"
      class="toc-overlay"
      @click="tocOpen = false"
    />

    <div
      v-if="post"
      class="article-shell"
    >
      <article>
        <header class="article-head">
          <h1>{{ post.title }}</h1>
          <p
            v-if="post.description"
            class="article-desc"
          >
            {{ post.description }}
          </p>
          <div class="article-meta">
            <time
              v-if="post.date"
              :datetime="String(post.date)"
            >{{ post.date }}</time>
            <span
              v-if="articleTags.length"
              class="tags"
            >
              <NuxtLink
                v-for="t in articleTags"
                :key="t"
                :to="`/blog/tag/${encodeURIComponent(t)}`"
                class="mini-tag"
              >
                {{ t }}
              </NuxtLink>
            </span>
          </div>
        </header>

        <ContentRenderer
          v-if="post"
          :value="post"
          class="article-body"
        />

        <section
          v-if="prevPost || nextPost"
          class="neighbors"
        >
          <NuxtLink
            v-if="prevPost?.urlPath"
            :to="prevPost.urlPath"
            class="neighbor prev"
          >
            ← 上一篇：{{ prevPost.title || '未命名' }}
          </NuxtLink>
          <NuxtLink
            v-if="nextPost?.urlPath"
            :to="nextPost.urlPath"
            class="neighbor next"
          >
            下一篇：{{ nextPost.title || '未命名' }} →
          </NuxtLink>
        </section>

        <section
          id="comments"
          ref="commentsSectionRef"
          class="comments"
          :class="{ 'comments-loading-state': !commentsReady }"
        >
          <h2>评论区</h2>
          <template v-if="commentsVisible">
            <UtterancesComments
              v-if="commentsProvider === 'utterances'"
              :repo="utterancesRepo"
              :issue-term="utterancesIssueTerm"
              :theme="utterancesTheme"
              @ready="commentsReady = true"
            />
            <GiscusComments
              v-else-if="commentsProvider === 'giscus'"
              :repo="giscusRepo"
              :repo-id="giscusRepoId"
              :category="giscusCategory"
              :category-id="giscusCategoryId"
              :mapping="giscusMapping"
              :strict="giscusStrict"
              :reactions-enabled="giscusReactionsEnabled"
              :emit-metadata="giscusEmitMetadata"
              :input-position="giscusInputPosition"
              :lang="giscusLang"
              :theme="giscusTheme"
              @ready="commentsReady = true"
            />
            <div
              v-else
              class="comments-loading-placeholder"
            >
              未启用评论系统，请检查 comments provider 配置。
            </div>
          </template>
          <template v-else>
            <div class="comments-loading-placeholder">
              {{ commentsEagerLoad ? '评论区即将加载…' : '评论区将在滚动到此处后加载…' }}
            </div>
          </template>
        </section>
      </article>

      <nav
        v-if="tocLinks.length"
        class="toc desktop-toc"
      >
        <h2>目录</h2>
        <ul>
          <li
            v-for="item in tocLinks"
            :key="item.id"
            :class="`depth-${item.depth}`"
          >
            <a
              :href="`#${item.id}`"
              :class="{ active: activeHeadingId === item.id }"
            >{{ item.text }}</a>
          </li>
        </ul>
      </nav>
    </div>

    <nav
      v-if="tocLinks.length"
      id="mobile-toc"
      class="toc mobile-toc"
      :class="{ open: tocOpen }"
    >
      <h2>目录</h2>
      <ul>
        <li
          v-for="item in tocLinks"
          :key="item.id"
          :class="`depth-${item.depth}`"
        >
          <a
            :href="`#${item.id}`"
            :class="{ active: activeHeadingId === item.id }"
            @click="tocOpen = false"
          >{{ item.text }}</a>
        </li>
      </ul>
    </nav>

    <p
      v-else-if="pending"
      class="state"
    >
      加载中…
    </p>
    <p
      v-else
      class="state error"
    >
      找不到这篇文章。
    </p>
  </div>
</template>

<script setup lang="ts">
import { nextTick } from 'vue'
import type { BlogPostMeta } from '~/composables/useBlogPosts'
import { fetchBlogMetaList } from '~/composables/useBlogPosts'
import { removeBlogNavigationLoadingOverlay } from '~/composables/useBlogNavigationLoading'
import { useTheme } from '~/composables/useTheme'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const requestURL = useRequestURL()
const currentSlug = computed(() => decodeURIComponent(route.path.replace(/^\/blog\//, '').replace(/\/$/, '')))
const { isDark: isDarkMode } = useTheme()
const tocOpen = ref(false)
const lockedScrollTop = ref(0)
const activeHeadingId = ref('')
const tocHeadingElements = ref<Array<{ id: string, el: HTMLElement }>>([])
const readingProgress = ref(0)
const commentsReady = ref(false)
const commentsVisible = ref(false)
const commentsSectionRef = ref<HTMLElement | null>(null)
let scrollRafId = 0
const copyFeedbackTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>()

/** 与 utteranc.es 及 giscus client.js 的 pathname 规则一致（issue / Discussion 标题或检索 term） */
const utterancesPathname = computed(() => {
  const p = route.path.replace(/\/$/, '') || '/'
  if (p.length < 2) return 'index'
  return p.slice(1).replace(/\.\w+$/, '')
})

interface UtterancesPublicConfig {
  repo?: string
  issueTerm?: string
  theme?: string
}

interface GiscusPublicConfig {
  repo?: string
  repoId?: string
  category?: string
  categoryId?: string
  term?: string
  mapping?: string
  strict?: string
  reactionsEnabled?: string
  emitMetadata?: string
  inputPosition?: string
  lang?: string
  theme?: string
}

interface CommentsPublicConfig {
  provider?: string
  /** 进入详情页即开始加载评论（客户端异步），关闭时仍用 IntersectionObserver 懒加载 */
  eagerLoad?: boolean
  utterances?: UtterancesPublicConfig
  giscus?: GiscusPublicConfig
}

const commentsConfig = computed<CommentsPublicConfig>(() => runtimeConfig.public.comments ?? {})
const commentsEagerLoad = computed(() => Boolean(commentsConfig.value.eagerLoad))
const commentsProvider = computed<'utterances' | 'giscus' | ''>(() => {
  const rawProvider = String(commentsConfig.value.provider ?? 'utterances').toLowerCase()
  if (rawProvider === 'giscus') return 'giscus'
  if (rawProvider === 'utterances') return 'utterances'
  return ''
})

const utterancesConfig = computed<UtterancesPublicConfig>(() => commentsConfig.value.utterances ?? {})
const utterancesRepo = computed(() => String(utterancesConfig.value.repo ?? ''))
const utterancesIssueTerm = computed(() => String(utterancesConfig.value.issueTerm ?? 'pathname'))
const utterancesTheme = computed(() => {
  return isDarkMode.value ? 'github-dark' : (utterancesConfig.value.theme ?? 'github-light')
})

const giscusConfig = computed<GiscusPublicConfig>(() => commentsConfig.value.giscus ?? {})
const giscusRepo = computed(() => String(giscusConfig.value.repo ?? ''))
const giscusRepoId = computed(() => String(giscusConfig.value.repoId ?? ''))
const giscusCategory = computed(() => String(giscusConfig.value.category ?? 'General'))
const giscusCategoryId = computed(() => String(giscusConfig.value.categoryId ?? ''))
const giscusDataTerm = computed(() => String((giscusConfig.value as { term?: string }).term ?? ''))
const giscusMapping = computed(() => String(giscusConfig.value.mapping ?? 'pathname'))
const giscusStrict = computed(() => String(giscusConfig.value.strict ?? '0'))
const giscusReactionsEnabled = computed(() => String(giscusConfig.value.reactionsEnabled ?? '1'))
const giscusEmitMetadata = computed(() => String(giscusConfig.value.emitMetadata ?? '0'))
const giscusInputPosition = computed(() => String(giscusConfig.value.inputPosition ?? 'top'))
const giscusLang = computed(() => String(giscusConfig.value.lang ?? 'zh-CN'))
const giscusTheme = computed(() => {
  return isDarkMode.value ? 'dark' : (giscusConfig.value.theme ?? 'light')
})

/** Giscus 传给后端的 term（与 client.js 的 params.term 一致；number 映射不用 term） */
const giscusCommentTerm = computed(() => {
  const m = giscusMapping.value
  if (m === 'specific')
    return giscusDataTerm.value
  if (m === 'number')
    return ''
  if (m === 'url') {
    try {
      const u = new URL(requestURL.href)
      u.searchParams.delete('giscus')
      u.hash = ''
      return u.toString()
    }
    catch {
      return utterancesPathname.value
    }
  }
  if (m === 'title' && import.meta.client)
    return document.title.trim() || utterancesPathname.value
  if (m === 'og:title') {
    if (import.meta.client) {
      const el = document.querySelector(`meta[property='og:title']`) as HTMLMetaElement | null
      const t = el?.content?.trim()
      if (t)
        return t
    }
    return utterancesPathname.value
  }
  return utterancesPathname.value
})

/** Giscus API 的 number 参数（pathname/url/title 等为 0；mapping=number 时为 data-term） */
const giscusDiscussionNumber = computed(() => {
  if (giscusMapping.value === 'number' && giscusDataTerm.value)
    return giscusDataTerm.value
  return '0'
})

const { data: commentCountPayload } = useAsyncData(
  () => `comment-cc-${commentsProvider.value}-${commentsProvider.value === 'giscus' ? `${giscusDiscussionNumber.value}:${giscusCommentTerm.value}` : utterancesPathname.value}`,
  async () => {
    if (commentsProvider.value === 'utterances' && utterancesRepo.value) {
      return await $fetch<{ count: number | null }>('/api/utterances-comment-count', {
        query: { repo: utterancesRepo.value, pathname: utterancesPathname.value },
      })
    }
    if (commentsProvider.value === 'giscus' && giscusRepo.value) {
      return await $fetch<{ count: number | null }>('/api/giscus-comment-count', {
        query: {
          repo: giscusRepo.value,
          term: giscusCommentTerm.value,
          number: giscusDiscussionNumber.value,
          category: giscusCategory.value,
          strict: giscusStrict.value,
        },
      })
    }
    return { count: null as number | null }
  },
  {
    watch: [
      utterancesPathname,
      giscusCommentTerm,
      giscusDiscussionNumber,
      commentsProvider,
      utterancesRepo,
      giscusRepo,
      giscusCategory,
      giscusStrict,
      giscusMapping,
      giscusDataTerm,
    ],
    server: false,
  },
)

const commentsCount = computed(() => commentCountPayload.value?.count ?? null)

const postNavList = ref<BlogPostMeta[] | null>(null)
const navLoading = ref(false)

const currentPostPathPattern = computed(() => {
  const slug = currentSlug.value
  if (!slug) return null
  const escapedSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^/blog/(?:\\d{4}-\\d{2}-\\d{2}-)?${escapedSlug}$`)
})

const { data: post, pending, error, refresh } = await useAsyncData(
  () => `blog-current-post-${currentSlug.value}`,
  async () => {
    if (!currentPostPathPattern.value) {
      return null
    }

    return await queryContent('/blog')
      .where({ _path: currentPostPathPattern.value })
      .only(['_path', 'title', 'description', 'date', 'tags', 'body'])
      .findOne()
  },
)

const loadPostNavList = async () => {
  if (!import.meta.client || postNavList.value !== null || navLoading.value) return
  navLoading.value = true

  try {
    postNavList.value = await fetchBlogMetaList({ includeContent: false })
  }
  finally {
    navLoading.value = false
  }
}

/** 详情页客户端异步挂载评论区（不阻塞首屏）；用于 eagerLoad 与路由切换 */
function scheduleCommentsMount() {
  if (!import.meta.client || !commentsEagerLoad.value)
    return
  void nextTick(() => {
    requestAnimationFrame(() => {
      commentsVisible.value = true
    })
  })
}

watch(() => route.path, () => {
  tocOpen.value = false
  commentsReady.value = false
  commentsVisible.value = false
  readingProgress.value = 0
  refresh()
  scheduleCommentsMount()
  void nextTick(() => {
    updateReadingProgress()
    refreshTocHeadingElements()
    updateActiveHeading()
  })
})

watch(commentsProvider, () => {
  commentsReady.value = false
})

watch(pending, (value) => {
  if (!value) {
    removeBlogNavigationLoadingOverlay()
  }
})

const onScroll = () => {
  if (!import.meta.client || scrollRafId) return
  scrollRafId = window.requestAnimationFrame(() => {
    scrollRafId = 0
    updateReadingProgress()
    updateActiveHeading()
  })
}

const updateReadingProgress = () => {
  if (!import.meta.client) return
  const articleEl = document.querySelector('.blog-article article') as HTMLElement | null
  if (!articleEl) {
    readingProgress.value = 0
    return
  }
  const articleTop = window.scrollY + articleEl.getBoundingClientRect().top
  const maxScrollable = Math.max(1, articleEl.offsetHeight - window.innerHeight)
  const current = window.scrollY - articleTop
  const progress = current / maxScrollable
  readingProgress.value = Math.min(1, Math.max(0, progress))
}

const scrollToComments = () => {
  if (import.meta.client) {
    // 点击后立即触发加载，避免滚动到评论区时出现短暂空白。
    commentsVisible.value = true
    const target = commentsSectionRef.value ?? document.getElementById('comments')
    if (!target) return
    const top = window.scrollY + target.getBoundingClientRect().top - 12
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }
}

const enhanceCodeBlocks = () => {
  if (!import.meta.client) return
  const blocks = document.querySelectorAll('.article-body pre')
  blocks.forEach((pre) => {
    if (!pre.querySelector(':scope > .code-scroll')) {
      const nodes = [...pre.childNodes].filter(
        n => !(n instanceof HTMLElement && n.classList.contains('code-copy-btn')),
      )
      if (nodes.length) {
        const scroll = document.createElement('div')
        scroll.className = 'code-scroll'
        for (const node of nodes) {
          scroll.appendChild(node)
        }
        pre.insertBefore(scroll, pre.firstChild)
      }
    }
    if (pre.querySelector('.code-copy-btn')) return
    const codeEl = pre.querySelector('.code-scroll code')
    if (!codeEl) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'code-copy-btn'
    button.setAttribute('aria-label', '复制代码')
    button.setAttribute('title', '复制代码')
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
    `
    button.addEventListener('click', async () => {
      const restoreLabel = () => {
        button.setAttribute('aria-label', '复制代码')
        button.setAttribute('title', '复制代码')
      }
      const prevTimer = copyFeedbackTimers.get(button)
      if (prevTimer) {
        clearTimeout(prevTimer)
      }
      try {
        await navigator.clipboard.writeText(codeEl.textContent ?? '')
        showToast('已复制')
        button.setAttribute('aria-label', '复制成功')
        button.setAttribute('title', '已复制')
        const timerId = setTimeout(restoreLabel, 1200)
        copyFeedbackTimers.set(button, timerId)
      }
      catch {
        showToast('复制失败')
        button.setAttribute('aria-label', '复制失败')
        button.setAttribute('title', '复制失败')
        const timerId = setTimeout(restoreLabel, 1200)
        copyFeedbackTimers.set(button, timerId)
      }
    })
    pre.appendChild(button)
  })
}

const updateActiveHeading = () => {
  if (!import.meta.client) return
  if (!tocHeadingElements.value.length) {
    activeHeadingId.value = ''
    return
  }

  const threshold = 120
  let current = tocHeadingElements.value[0]?.id ?? ''

  for (const item of tocHeadingElements.value) {
    const top = item.el.getBoundingClientRect().top
    if (top - threshold <= 0) {
      current = item.id
    }
    else {
      break
    }
  }

  activeHeadingId.value = current
}

const refreshTocHeadingElements = () => {
  if (!import.meta.client) return
  tocHeadingElements.value = tocLinks.value
    .map(item => ({ id: item.id, el: document.getElementById(item.id) as HTMLElement | null }))
    .filter((item): item is { id: string, el: HTMLElement } => Boolean(item.el))
}

watch(tocOpen, (open) => {
  if (import.meta.client) {
    const html = document.documentElement
    const body = document.body
    if (open) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
      lockedScrollTop.value = window.scrollY || window.pageYOffset || 0
      html.style.overflow = 'hidden'
      body.style.overflow = 'hidden'
      body.style.position = 'fixed'
      body.style.top = `-${lockedScrollTop.value}px`
      body.style.left = '0'
      body.style.right = '0'
      if (scrollBarWidth > 0) {
        body.style.paddingRight = `${scrollBarWidth}px`
      }
    }
    else {
      html.style.overflow = ''
      body.style.overflow = ''
      body.style.position = ''
      body.style.top = ''
      body.style.left = ''
      body.style.right = ''
      body.style.paddingRight = ''
      window.scrollTo(0, lockedScrollTop.value)
    }
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    const html = document.documentElement
    const body = document.body
    html.style.overflow = ''
    body.style.overflow = ''
    body.style.position = ''
    body.style.top = ''
    body.style.left = ''
    body.style.right = ''
    body.style.paddingRight = ''
    body.style.touchAction = ''
    if (scrollRafId) {
      window.cancelAnimationFrame(scrollRafId)
      scrollRafId = 0
    }
    window.removeEventListener('scroll', onScroll)
  }
})

onMounted(() => {
  removeBlogNavigationLoadingOverlay()
  refreshTocHeadingElements()
  updateReadingProgress()
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })

  scheduleCommentsMount()

  if (import.meta.client && commentsSectionRef.value) {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) {
        commentsVisible.value = true
        observer.disconnect()
      }
    }, { rootMargin: '200px' })

    observer.observe(commentsSectionRef.value)
  }

  void loadPostNavList()
  void nextTick(() => {
    updateReadingProgress()
    refreshTocHeadingElements()
    updateActiveHeading()
    enhanceCodeBlocks()
  })
})

const currentIndex = computed(() => {
  return (postNavList.value ?? []).findIndex(item => item.slug === currentSlug.value)
})

const prevPost = computed(() => {
  const idx = currentIndex.value
  if (idx <= 0) return null
  return (postNavList.value ?? [])[idx - 1] ?? null
})

const nextPost = computed(() => {
  const idx = currentIndex.value
  if (idx < 0) return null
  return (postNavList.value ?? [])[idx + 1] ?? null
})

const articleTags = computed(() => {
  const t = post.value?.tags
  return Array.isArray(t) ? (t as string[]) : []
})

interface TocLinkNode {
  id?: string
  text?: string
  children?: TocLinkNode[]
}

const flattenTocLinks = (nodes: TocLinkNode[] = [], depth = 0): Array<{ id: string, text: string, depth: number }> => {
  const result: Array<{ id: string, text: string, depth: number }> = []
  for (const node of nodes) {
    if (node.id && node.text) {
      result.push({ id: node.id, text: node.text, depth })
    }
    if (Array.isArray(node.children) && node.children.length) {
      result.push(...flattenTocLinks(node.children, depth + 1))
    }
  }
  return result
}

const tocLinks = computed(() => {
  const toc = (post.value?.body as { toc?: { links?: TocLinkNode[] } } | undefined)?.toc?.links
  return flattenTocLinks(toc ?? [])
})

watch(tocLinks, () => {
  if (!import.meta.client) return
  void nextTick(() => {
    updateReadingProgress()
    refreshTocHeadingElements()
    updateActiveHeading()
  })
}, { flush: 'post' })

watch(
  () => post.value?._path,
  () => {
    if (!import.meta.client) return
    void nextTick(() => {
      updateReadingProgress()
      enhanceCodeBlocks()
    })
  },
  { flush: 'post' },
)

watchEffect(() => {
  if (!post.value?.title) return
  useSeoMeta({
    title: String(post.value.title),
    description: post.value.description ? String(post.value.description) : undefined,
  })
})

watchEffect(() => {
  if (pending.value || error.value) return
  if (!post.value) {
    showError(createError({ statusCode: 404, statusMessage: '文章未找到' }))
  }
})
</script>

<style scoped>
:global(html) {
  overflow-x: clip;
}

.blog-article {
  padding: 2rem 0rem 3rem;
  --toc-toggle-right: calc(env(safe-area-inset-right, 0px) + 12px);
  --toc-toggle-size: 32px;
  --mobile-toc-gap: 10px;
}

.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  transform-origin: left center;
  background: linear-gradient(90deg, var(--blog-blue-600) 0%, var(--blog-cyan-500) 100%);
  box-shadow: 0 1px 8px var(--blog-shadow-brand);
  z-index: 1200;
  pointer-events: none;
}

.blog-article article {
  background: var(--blog-white);
  border: 1px solid var(--blog-slate-200);
  border-radius: 16px;
  box-shadow: 0 14px 30px var(--blog-shadow-xs-plus);
  padding: 1.4rem 1.2rem;
  min-width: 0;
}

.article-shell {
  display: block;
}

.back {
  margin: 0 0 1rem;
  font-size: 0.9rem;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.top-bar .back {
  margin: 0;
}

.back a {
  color: var(--blog-slate-500);
  text-decoration: none;
}

.back a:hover {
  text-decoration: underline;
}

.comment-nav-btn,
.toc-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px solid var(--blog-blue-100);
  border-radius: 8px;
  background: var(--blog-blue-50);
  color: var(--blog-blue-700);
  flex-shrink: 0;
  margin-left: 0.6rem;
  margin-right: 0.1rem;
  position: relative;
  z-index: 1000;
  cursor: pointer;
  box-sizing: border-box;
}

.comment-nav-btn {
  min-height: 32px;
  padding: 5px 12px;
  font-size: 0.92rem;
  line-height: 1;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.comment-nav-btn:hover {
  border-color: var(--blog-slate-300);
  background: var(--blog-slate-50);
  box-shadow: 0 1px 2px var(--blog-shadow-sm);
}

.comment-nav-icon {
  flex-shrink: 0;
  display: block;
  width: 18px;
  height: 18px;
  transform: translateY(0.5px);
}

.comment-nav-count {
  flex-shrink: 0;
  font-size: inherit;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: var(--blog-slate-500);
}

.comment-nav-btn:hover .comment-nav-count {
  color: var(--blog-slate-600);
}

.toc-toggle {
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 32px;
  height: 32px;
  padding: 0 7px;
}

.toc-toggle .line {
  display: block;
  height: 2px;
  width: 100%;
  background: var(--blog-blue-800);
}

.article-head h1 {
  margin: 0 0 0.5rem;
  font-size: 1.95rem;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: var(--blog-slate-900);
}

.article-desc {
  margin: 0 0 0.75rem;
  color: var(--blog-slate-600);
  font-size: 1rem;
  line-height: 1.55;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  font-size: 0.85rem;
  color: var(--blog-slate-500);
  margin-bottom: 1.5rem;
}

.tags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.38rem 0.55rem;
}

.mini-tag {
  display: inline-block;
  padding: 0.16rem 0.5rem;
  border-radius: 999px;
  background: var(--blog-blue-50);
  color: var(--blog-blue-800);
  text-decoration: none;
  font-size: 0.75rem;
  border: 1px solid var(--blog-blue-100);
}

.mini-tag:hover {
  background: var(--blog-blue-100);
}

.article-body :deep(h2) {
  margin: 1.5rem 0 0.5rem;
  font-size: 1.25rem;
  color: var(--blog-slate-900);
}

.article-body :deep(h3) {
  margin: 1.25rem 0 0.4rem;
  font-size: 1rem;
  color: var(--blog-slate-800);
}

.article-body :deep(p) {
  margin: 0.65rem 0;
  line-height: 1.65;
  color: var(--blog-slate-800);
  overflow-wrap: anywhere;
  word-break: break-word;
}

.article-body :deep(strong) {
  color: var(--blog-slate-700);
  font-weight: 600;
}

.article-body :deep(a) {
  color: var(--blog-link);
  text-decoration: underline;
  text-decoration-color: var(--blog-link-underline);
  text-underline-offset: 2px;
  transition: color 0.18s ease, text-decoration-color 0.18s ease;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.article-body :deep(a:hover) {
  color: var(--blog-link-hover);
  text-decoration-color: var(--blog-link-underline-hover);
}

.article-body :deep(a:visited) {
  color: var(--blog-link);
}

.article-body :deep(ul),
.article-body :deep(ol) {
  margin: 0.5rem 0 0.5rem 1.25rem;
  line-height: 1.6;
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* 横向滚动只在 .code-scroll 内，复制按钮留在 pre 上避免随滚动漂移 */
.article-body :deep(pre .code-scroll) {
  overflow-x: auto;
  max-width: 100%;
  min-width: 0;
}

/* 无 Shiki 时的普通围栏代码块 */
.article-body :deep(pre:not(.shiki)) {
  margin: 1rem 0;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: var(--blog-code-bg);
  color: var(--blog-slate-200);
  overflow-x: visible;
  max-width: 100%;
  font-size: 0.85rem;
  border: 1px solid var(--blog-slate-900);
}

/* Shiki：与 github-dark 协调的底栏，行号 + 可标注行高亮（fence meta: {2,4-6}） */
.article-body :deep(pre.shiki) {
  margin: 1rem 0;
  padding: 0.85rem 0.75rem 0.85rem 0;
  border-radius: 10px;
  background: var(--blog-code-bg);
  overflow-x: visible;
  max-width: 100%;
  font-size: 0.85rem;
  line-height: 1.55;
  border: 1px solid var(--blog-slate-900);
}

.article-body :deep(pre.shiki code) {
  display: block;
  counter-reset: line;
  padding: 0 0.85rem 0 0;
  font-size: inherit;
  background: transparent !important;
}

.article-body :deep(pre.shiki code .line) {
  position: relative;
  display: block;
  min-height: 1.55em;
  padding-left: 3.15rem;
  padding-right: 0.35rem;
}

.article-body :deep(pre.shiki code .line::before) {
  counter-increment: line;
  content: counter(line);
  position: absolute;
  left: 0;
  top: 0;
  width: 2.35rem;
  text-align: right;
  padding-right: 0.65rem;
  box-sizing: border-box;
  color: var(--blog-slate-500);
  font-variant-numeric: tabular-nums;
  user-select: none;
  border-right: 1px solid var(--blog-slate-800);
  pointer-events: none;
}

.article-body :deep(pre.shiki code .line.highlight) {
  background: var(--blog-code-line-highlight);
}

.article-body :deep(code) {
  font-family: ui-monospace, monospace;
}

.article-body :deep(p code),
.article-body :deep(li code) {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--blog-slate-100);
  font-size: 0.88em;
}

.article-body :deep(blockquote) {
  margin: 1rem 0;
  padding: 0.45rem 0.8rem;
  border-left: 4px solid var(--blog-blue-300);
  background: var(--blog-slate-50);
  border-radius: 6px;
  color: var(--blog-slate-600);
}

.article-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 0.75rem 0;
}

.article-body :deep(table) {
  display: block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 1rem 0;
}

.article-body :deep(table th),
.article-body :deep(table td) {
  border: 1px solid var(--blog-slate-300);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.article-body :deep(table th) {
  background: var(--blog-slate-100);
  font-weight: 600;
  color: var(--blog-slate-900);
}

.toc {
  margin: 0 0 1.25rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid var(--blog-slate-200);
  border-radius: 10px;
  background: var(--blog-slate-50);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  position: sticky;
  top: 1rem;
}

.mobile-toc {
  display: block;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(320px, calc(100vw - 24px));
  max-width: calc(100vw - 24px);
  padding-top: env(safe-area-inset-top, 0);
  padding-bottom: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  margin: 0;
  z-index: 1001;
  box-shadow: 0 18px 40px var(--blog-shadow-lg);
  box-sizing: border-box;
  transform: translateX(100%);
  opacity: 0;
  visibility: hidden;
  transition: transform 0.24s ease, opacity 0.24s ease, visibility 0.24s ease;
  border-radius: 16px 0 0 16px;
  background: var(--blog-slate-50);
  will-change: transform, opacity;
}

.mobile-toc.open {
  transform: translateX(0);
  opacity: 1;
  visibility: visible;
  padding-top: 22px;
}

.toc-overlay {
  position: fixed;
  inset: 0;
  background: var(--blog-overlay-dark);
  z-index: 1000;
  opacity: 1;
  transition: opacity 0.24s ease;
}

.desktop-toc {
  display: none;
}

.toc h2 {
  margin: 0 0 0.45rem;
  font-size: 0.95rem;
}

.toc ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.toc li {
  margin: 0.1rem 0;
  position: relative;
}

.toc a {
  color: var(--blog-slate-700);
  text-decoration: none;
  font-size: 0.86rem;
  display: block;
  padding: 0.28rem 0.45rem;
  border-radius: 6px;
  transition: all 0.18s ease;
  border-left: 2px solid transparent;
}

.toc a:hover {
  color: var(--blog-blue-700);
  background: var(--blog-blue-50);
  border-left-color: var(--blog-blue-300);
}

.toc a.active {
  color: var(--blog-blue-700);
  background: var(--blog-blue-50);
  border-left-color: var(--blog-blue-400);
  font-weight: 600;
}

.toc li.depth-0 a {
  font-weight: 600;
}

.toc li.depth-1 {
  margin-left: 0.7rem;
}

.toc li.depth-1::before {
  content: '';
  position: absolute;
  left: -0.35rem;
  top: 0.3rem;
  bottom: 0.3rem;
  width: 1px;
  background: var(--blog-slate-300);
}

.toc li.depth-2 {
  margin-left: 1.35rem;
}

.toc li.depth-2::before {
  content: '';
  position: absolute;
  left: -0.35rem;
  top: 0.3rem;
  bottom: 0.3rem;
  width: 1px;
  background: var(--blog-slate-200);
}

.neighbors {
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 0.65rem;
  margin-top: 1.6rem;
}

.neighbor {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--blog-blue-100);
  background: var(--blog-blue-50);
  color: var(--blog-blue-800);
  text-decoration: none;
  border-radius: 10px;
  padding: 0.42rem 0.7rem;
  font-size: 0.85rem;
  max-width: calc(50% - 0.35rem);
}

.neighbor.next {
  margin-left: auto;
  text-align: right;
}

.neighbor:hover {
  background: var(--blog-blue-100);
}

.article-body :deep(pre) {
  position: relative;
}

.article-body :deep(.code-copy-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
  border: 1px solid var(--blog-slate-600);
  border-radius: 6px;
  background: var(--blog-code-btn-bg);
  color: var(--blog-slate-200);
  font-size: 0.72rem;
  line-height: 1;
  width: 28px;
  height: 28px;
  padding: 0;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.article-body :deep(.code-copy-btn:hover) {
  background: var(--blog-code-btn-bg-hover);
  border-color: var(--blog-slate-500);
}

.article-body :deep(.code-copy-btn:focus-visible) {
  outline: 2px solid var(--blog-blue-300);
  outline-offset: 1px;
}

.article-body :deep(.code-copy-btn svg) {
  display: block;
}

@media (max-width: 1280px) {
  .blog-article {
    padding-top: 3rem;
  }

  .toc-toggle {
    position: fixed;
    right: var(--toc-toggle-right);
    top: calc(env(safe-area-inset-top, 0px) + 12px);
    margin: 0;
  }

  .neighbors {
    flex-direction: column;
  }

  .neighbor {
    max-width: 100%;
  }

  .neighbor.next {
    margin-left: 0;
    text-align: left;
  }
}

@media (min-width: 1280px) {
  .blog-article {
    padding: 2rem 2rem 3rem;
  }

  .top-bar {
    max-width: 820px;
    margin: 0 auto 1rem;
  }

  .article-shell {
    display: flex;
    align-items: flex-start;
    max-width: 820px;
    margin: 0 auto;
    overflow: visible;
  }

  .article-shell > article {
    flex: 0 0 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  .desktop-toc {
    display: block;
    flex: 0 0 200px;
    margin-left: 1.5rem;
    position: sticky;
    top: 1rem;
    max-height: calc(100vh - 10rem);
    overflow-y: auto;
    overflow-x: hidden;
    align-self: flex-start;
  }

  .toc-toggle {
    display: none;
  }

  .mobile-toc {
    display: none !important;
  }
}

@media (min-width: 980px) and (max-width: 1279px) {
  .blog-article {
    padding: 2rem 1.5rem 3rem;
  }

  .top-bar {
    max-width: 820px;
    margin: 0 auto 1rem;
  }

  .article-shell {
    max-width: 820px;
    margin: 0 auto;
  }
}

.comments {
  margin-top: 2.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--blog-slate-200);
}

.comments.comments-loading-state {
  min-height: 220px;
}

.comments-loading-placeholder {
  padding: 1rem 0;
  color: var(--blog-slate-500);
  font-size: 0.95rem;
}

.comments h2 {
  margin: 0 0 1rem;
  font-size: 1.1rem;
}

.state {
  color: var(--blog-slate-500);
}

.state.error {
  color: var(--blog-danger-700);
}
</style>
