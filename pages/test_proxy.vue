<script setup>
// 使用 useFetch 请求
// 这里的 '/api/user' 实际上会被转发到 'https://external-api.com/user'
const { data, pending, error, refresh } = await useFetch('/api/v2/common/nav/header', {
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


