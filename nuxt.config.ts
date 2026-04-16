// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  // Nuxt 3.20+ / Vite 7：dev 首次预转换仍会解析 manifest.js 里死分支中的 import("#app-manifest")，
  // 触发红色 Pre-transform error（与业务代码无关）。关闭 app manifest 为官方常用规避，见 nuxt/nuxt#30461、#33606。

  modules: ['@vant/nuxt', '@nuxt/content'],
  devtools: { enabled: true }, app: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
        },
      ],
    },
  },
  runtimeConfig: {
    githubToken: process.env.GITHUB_TOKEN || process.env.NUXT_GITHUB_TOKEN || '',
    githubOwner: process.env.GITHUB_OWNER || 'TearKnow',
    githubRepo: process.env.GITHUB_REPO || 'vue3',
    githubBranch: process.env.GITHUB_BRANCH || 'main',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
      comments: {
        provider: process.env.NUXT_PUBLIC_COMMENT_PROVIDER || 'giscus', // giscus utterances
        /** 为 true 时进入文章详情页即异步挂载评论（仍不阻塞首屏）；为 false 时仅滚动接近评论区再加载 */
        eagerLoad: true,
        utterances: {
          repo: process.env.NUXT_PUBLIC_UTTERANCES_REPO || 'TearKnow/comments',
          issueTerm: process.env.NUXT_PUBLIC_UTTERANCES_ISSUE_TERM || 'pathname',
          theme: process.env.NUXT_PUBLIC_UTTERANCES_THEME || 'github-light',
        },
        giscus: {
          repo: process.env.NUXT_PUBLIC_GISCUS_REPO || 'TearKnow/comments',
          repoId: process.env.NUXT_PUBLIC_GISCUS_REPO_ID || 'R_kgDOR-vTnQ',
          category: process.env.NUXT_PUBLIC_GISCUS_CATEGORY || 'General',
          categoryId: process.env.NUXT_PUBLIC_GISCUS_CATEGORY_ID || 'DIC_kwDOR-vTnc4C66XP',
          /** data-mapping 为 number / specific 时与 data-term 一致（Discussion 编号或固定 term） */
          term: process.env.NUXT_PUBLIC_GISCUS_TERM || '',
          mapping: process.env.NUXT_PUBLIC_GISCUS_MAPPING || 'pathname',
          strict: process.env.NUXT_PUBLIC_GISCUS_STRICT || '0',
          reactionsEnabled: process.env.NUXT_PUBLIC_GISCUS_REACTIONS_ENABLED || '1',
          emitMetadata: process.env.NUXT_PUBLIC_GISCUS_EMIT_METADATA || '0',
          inputPosition: process.env.NUXT_PUBLIC_GISCUS_INPUT_POSITION || 'top',
          lang: process.env.NUXT_PUBLIC_GISCUS_LANG || 'zh-CN',
          theme: process.env.NUXT_PUBLIC_GISCUS_THEME || 'light',
        },
      },
    },
  }, experimental: {
    appManifest: false,
  },
  compatibilityDate: '2024-11-01',
  nitro: {
    // 注意：不要代理 /api/_content/**，否则会影响 @nuxt/content 的文章查询接口
    devProxy: {
      '/api/jjshouse': {
        target: 'https://www.jjshouse.com/api',
      },
    },
    routeRules: {
      '/api/jjshouse/**': {
        proxy: 'https://www.jjshouse.com/api/**',
      },
    },
  },
})
