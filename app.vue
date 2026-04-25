<template>
  <NuxtPage />
  <BackToTopFab
    :show="showBackToTop"
    @click="scrollToTop"
  />
  <button
    class="quick-entry-fab"
    type="button"
    aria-label="打开快捷入口"
    @click="showQuickEntry = true"
  >
    ⌘
  </button>
  <div
    v-if="showQuickEntry"
    class="quick-entry-mask"
    @click="showQuickEntry = false"
  >
    <div
      class="quick-entry-panel"
      role="dialog"
      aria-modal="true"
      aria-label="快捷入口"
      @click.stop
    >
      <div class="quick-entry-header">
        <span class="quick-entry-title">快捷入口</span>
        <button
          class="quick-entry-theme-btn"
          type="button"
          :aria-label="themeIsDark ? '切换到亮色模式' : '切换到暗色模式'"
          @click="toggleTheme(); showQuickEntry = false"
        >
          <span>{{ themeIsDark ? '☀️' : '🌙' }}</span>
        </button>
      </div>
      <p class="quick-entry-desc quick-entry-desc-desktop">
        按 <code>Ctrl + Z</code> 打开，按 <code>Esc</code> 关闭
      </p>
      <NuxtLink
        v-for="item in quickEntryItems"
        :key="item.to"
        class="quick-entry-link"
        :to="item.to"
        :target="item.openInNewTab ? '_blank' : undefined"
        :rel="item.openInNewTab ? 'noopener noreferrer' : undefined"
        @click="showQuickEntry = false"
      >
        <span class="quick-entry-link-icon">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </NuxtLink>
    </div>
  </div>
  <!-- <br><br><br></br>

  <van-button type="primary">主要按钮</van-button>
  <van-button type="success">成功按钮</van-button>
  <van-button type="default">默认按钮</van-button>
  <van-button type="danger">危险按钮</van-button>
  <van-button type="warning">警告按钮</van-button> -->
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import BackToTopFab from '~/components/BackToTopFab.vue'
import { useBlogNavigationLoading } from '~/composables/useBlogNavigationLoading'
import { quickEntryLinks } from '~/constants/quick-entry-links'
import { useTheme } from '~/composables/useTheme'

useSeoMeta({
  title: 'vue3',
  description: 'vue3，你的选择',
})

useBlogNavigationLoading()

const { isDark: themeIsDark, init: initTheme, toggle: toggleTheme } = useTheme()

const showQuickEntry = ref(false)
const showBackToTop = ref(false)

const quickEntryItems = [
  { label: '首页', to: '/', icon: '🏠', openInNewTab: false },
  ...quickEntryLinks,
]

const onGlobalKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    showQuickEntry.value = !showQuickEntry.value
    return
  }

  if (event.key === 'Escape' && showQuickEntry.value) {
    showQuickEntry.value = false
  }
}

const onGlobalScroll = () => {
  showBackToTop.value = window.scrollY > 300
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  initTheme()
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('scroll', onGlobalScroll, { passive: true })
  onGlobalScroll()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('scroll', onGlobalScroll)
})

// showSuccessToast('成功文案');

// const {data} = await useFetch('/api/channel')
// console.log(data.value)
</script>

<style>
@keyframes blog-page-loading-spin {
  to {
    transform: rotate(360deg);
  }
}

.quick-entry-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.35);
}

.quick-entry-panel {
  width: min(92vw, 360px);
  border-radius: 12px;
  padding: 16px;
  background: var(--blog-white);
  box-shadow: 0 12px 36px var(--blog-shadow-lg);
}

.quick-entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quick-entry-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--blog-slate-900);
}

.quick-entry-desc {
  margin: 8px 0 14px;
  color: var(--blog-slate-600);
  font-size: 14px;
}

@media (max-width: 899px) {
  .quick-entry-desc-desktop {
    display: none;
  }
}

.quick-entry-theme-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 8px;
  background: var(--blog-slate-50);
  color: var(--blog-slate-700);
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  line-height: 1;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.quick-entry-theme-btn:hover {
  background: var(--blog-blue-50);
  border-color: var(--blog-blue-200);
}

.quick-entry-link {
  width: 100%;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  text-decoration: none;
  border: 1px solid var(--blog-slate-200);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--blog-slate-50);
  color: var(--blog-slate-800);
  font-size: 14px;
  cursor: pointer;
}

.quick-entry-link:hover {
  border-color: var(--blog-blue-200);
  background: var(--blog-blue-50);
}

.quick-entry-link-icon {
  width: 18px;
  text-align: center;
}

.quick-entry-link:first-of-type {
  margin-top: 0;
}

.quick-entry-fab {
  position: fixed;
  right: 24px;
  bottom: calc(24px + env(safe-area-inset-bottom));
  z-index: 9998;
  border: 0;
  border-radius: 999px;
  width: 43px;
  height: 43px;
  display: grid;
  place-items: center;
  padding: 0;
  background: rgba(15, 23, 42, 0.58);
  color: rgba(255, 255, 255, 0.92);
  font-size: 18px;
  font-weight: 500;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(2px);
}

.quick-entry-fab:active {
  transform: scale(0.96);
}

@media (min-width: 900px) {
  .quick-entry-fab {
    display: none;
  }
}

</style>
