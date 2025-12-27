// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@vant/nuxt'],
  nitro: {
    //这种方法直接通过代码层面强行把流量塞进代理端口
    devProxy: {
      '/api': {
        target: 'https://www.jjshouse.com/api',
      }
    },
    routeRules: {
      '/api/**': {
        proxy: 'https://www.jjshouse.com/api/**',
      }
    }
  }
})