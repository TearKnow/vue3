<script setup>
// 使用 useFetch 请求
// 这里的 '/api/user' 实际上会被转发到 'https://external-api.com/user'
const { data, pending, error, refresh } = await useFetch('/api/user', {
  // 即使在 config 里配了，这里也可以手动再传一次关键 Header
  headers: {
    'Accept-Language': 'en-US,en;q=0.9',
  },
  // 确保在服务器端执行时也能正确处理代理
  onRequest({ request, options }) {
    console.log('正在请求:', request)
  },
  onResponseError({ response }) {
    if (response.status === 403) {
      console.error('依然被 Cloudflare 拦截，请检查 IP 代理是否开启全局模式')
    }
  }
})
</script>

<template>
  <div>
    <div v-if="pending">加载中...</div>
    <div v-else-if="error">错误：{{ error.message }}</div>
    <pre v-else>{{ data }}</pre>
  </div>
</template>


import { HttpsProxyAgent } from 'https-proxy-agent'

export default defineNuxtConfig({
compatibilityDate: '2024-11-01',
devtools: { enabled: true },
modules: ['@vant/nuxt'],
nitro: {
// 这种方法直接通过代码层面强行把流量塞进代理端口
devProxy: {
'/api': {
target: 'https://www.jjshouse.com/api',
agent: new HttpsProxyAgent('http://127.0.0.1:7897') // 你的 Clash 端口
}
}
}
})