/** 当前前端构建 ID（build 时写入，用于 ?v= 穿透 CDN / 浏览器缓存） */
export function useAppBuildId() {
  const { public: cfg } = useRuntimeConfig()
  return computed(() => String(cfg.appBuildId || 'dev'))
}