// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@vant/nuxt', '@nuxt/content'],
  devtools: { enabled: true },
  compatibilityDate: '2024-11-01',
  runtimeConfig: {
    githubToken: process.env.GITHUB_TOKEN || '',
    githubOwner: process.env.GITHUB_OWNER || 'TearKnow',
    githubRepo: process.env.GITHUB_REPO || 'vue3',
    githubBranch: process.env.GITHUB_BRANCH || 'main',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },
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
