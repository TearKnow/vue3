// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@vant/nuxt'],
  devtools: { enabled: true },
  compatibilityDate: '2024-11-01',
  runtimeConfig: {
    githubToken: process.env.GITHUB_TOKEN || '',
    githubOwner: process.env.GITHUB_OWNER || 'TearKnow',
    githubRepo: process.env.GITHUB_REPO || 'vue3',
    githubBranch: process.env.GITHUB_BRANCH || 'main',
  },
  nitro: {
    // 这种方法直接通过代码层面强行把流量塞进代理端口
    devProxy: {
      '/api': {
        target: 'https://www.jjshouse.com/api',
      },
    },
    routeRules: {
      '/api/**': {
        proxy: 'https://www.jjshouse.com/api/**',
      },
    },
  },
})
