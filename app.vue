<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <BackToTopFab
    :show="showBackToTop"
    @click="scrollToTop"
  />
  <ClientOnly>
    <WikiAiPanel />
  </ClientOnly>
  <button
    class="quick-entry-fab"
    type="button"
    aria-label="打开快捷操作"
    @click="showQuickEntry = true"
  >
    ⋯
  </button>
  <div
    v-if="showQuickEntry"
    class="quick-entry-mask"
    @pointerdown.self="quickEntryMaskDown = true"
    @pointerup.self="closeQuickEntryFromMask"
    @pointercancel="quickEntryMaskDown = false"
  >
    <div
      class="quick-entry-panel"
      role="dialog"
      aria-modal="true"
      aria-label="快捷入口"
      @click.stop
    >
      <div class="quick-entry-header">
        <span class="quick-entry-title">快捷操作</span>
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

      <div class="quick-entry-actions">
        <button type="button" class="quick-entry-action" @click="handleRandomBlog">
          <span class="quick-entry-action-icon" aria-hidden="true">🎲</span>
          <span>随机文章</span>
        </button>
        <template v-if="isMobile">
          <button type="button" class="quick-entry-action" @click="handleOpenAi">
            <span class="quick-entry-action-icon" aria-hidden="true">✦</span>
            <span>AI 助教</span>
          </button>
          <button
            v-if="showBackToTop"
            type="button"
            class="quick-entry-action"
            @click="handleScrollToTop"
          >
            <span class="quick-entry-action-icon" aria-hidden="true">↑</span>
            <span>回到顶部</span>
          </button>
          <button
            v-if="isWikiPage"
            type="button"
            class="quick-entry-action"
            @click="handleOpenWikiSidebar"
          >
            <span class="quick-entry-action-icon" aria-hidden="true">☰</span>
            <span>Wiki 目录</span>
          </button>
        </template>
      </div>

      <p class="quick-entry-section-label">
        站点导航
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
import { useMobileFabActions, useMobileViewport } from '~/composables/useMobileFabActions'
import { useRandomBlogPost } from '~/composables/useRandomBlogPost'
import { quickEntryLinks } from '~/constants/quick-entry-links'
import { useTheme } from '~/composables/useTheme'

useSeoMeta({
  title: 'vue3',
  description: 'vue3，你的选择',
})

useBlogNavigationLoading()

const { isDark: themeIsDark, init: initTheme, toggle: toggleTheme } = useTheme()
const { openAiPanel, openWikiSidebar, isWikiPage } = useMobileFabActions()
const { isMobile } = useMobileViewport()
const { goToRandomBlog } = useRandomBlogPost()

const showQuickEntry = ref(false)
const showBackToTop = ref(false)
const quickEntryMaskDown = ref(false)

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
    closeQuickEntry()
  }
}

const onGlobalScroll = () => {
  showBackToTop.value = window.scrollY > 300
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function closeQuickEntry() {
  quickEntryMaskDown.value = false
  showQuickEntry.value = false
}

function closeQuickEntryFromMask() {
  if (!quickEntryMaskDown.value)
    return

  closeQuickEntry()
}

function handleOpenAi() {
  closeQuickEntry()
  openAiPanel()
}

function handleScrollToTop() {
  closeQuickEntry()
  scrollToTop()
}

function handleOpenWikiSidebar() {
  closeQuickEntry()
  openWikiSidebar()
}

async function handleRandomBlog() {
  closeQuickEntry()
  await goToRandomBlog()
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

body {
  margin: 0;
}

.quick-entry-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  background: var(--blog-overlay-dark);
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
  .quick-entry-header{
    padding-bottom: 10px;
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

.quick-entry-actions {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.quick-entry-action {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 8px;
  background: var(--blog-slate-50);
  color: var(--blog-slate-800);
  font-size: 14px;
  cursor: pointer;
  box-sizing: border-box;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.quick-entry-action:hover {
  border-color: var(--blog-blue-200);
  background: var(--blog-blue-50);
  color: var(--blog-slate-900);
}

.quick-entry-action-icon {
  width: 18px;
  text-align: center;
  color: var(--blog-blue-600);
  font-size: 15px;
  line-height: 1;
}

.quick-entry-section-label {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--blog-slate-500);
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
  background: var(--blog-code-btn-bg);
  color: var(--blog-white);
  font-size: 22px;
  font-weight: 500;
  line-height: 1;
  box-shadow: 0 4px 10px var(--blog-shadow-sm);
  backdrop-filter: blur(2px);
}

.quick-entry-fab:active {
  background: var(--blog-slate-700);
}

@media (min-width: 900px) {
  .quick-entry-fab {
    display: none;
  }
}
</style>
