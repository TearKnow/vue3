<template>
  <section
    v-if="selectedPages.length > 0"
    class="wiki-frequent-pages"
    aria-labelledby="wiki-frequent-title"
  >
    <div class="wiki-frequent-heading">
      <div>
        <p class="wiki-frequent-eyebrow">
          Shortcuts
        </p>
        <h2
          id="wiki-frequent-title"
          class="wiki-frequent-title"
        >
          常用页面
        </h2>
      </div>
      <button
        type="button"
        class="wiki-frequent-sync"
        :disabled="syncing"
        :title="pendingTotal > 0 ? `同步 ${pendingTotal} 次本地访问` : '刷新已同步访问排行'"
        @click="requestSync"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
        {{ syncButtonText }}
      </button>
    </div>

    <p
      v-if="syncError || loadError"
      class="wiki-frequent-message wiki-frequent-message--error"
      role="alert"
    >
      {{ syncError || '访问排行加载失败，可点击同步按钮重试' }}
    </p>
    <p
      v-else-if="syncMessage"
      class="wiki-frequent-message"
      aria-live="polite"
    >
      {{ syncMessage }}
    </p>

    <div class="wiki-frequent-list">
      <NuxtLink
        v-for="page in selectedPages"
        :key="page._path"
        :to="page._path"
        no-prefetch
        class="wiki-frequent-item"
      >
        <strong>{{ page.title || '未命名页面' }}</strong>
        <span>
          {{ page.topic }}
          <template v-if="page.date">
            · {{ page.date }}
          </template>
        </span>
      </NuxtLink>
    </div>

    <Teleport to="body">
      <div
        v-if="passwordDialogOpen"
        class="wiki-frequent-mask"
        @pointerdown.self="maskPointerDown = true"
        @pointerup.self="closePasswordFromMask"
        @pointercancel="maskPointerDown = false"
      >
        <form
          class="wiki-frequent-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="wiki-frequent-dialog-title"
          @submit.prevent="submitPassword"
        >
          <div class="wiki-frequent-dialog-heading">
            <div>
              <p>Sync Visits</p>
              <h3 id="wiki-frequent-dialog-title">
                同步访问次数
              </h3>
            </div>
            <button
              type="button"
              aria-label="关闭"
              :disabled="syncing"
              @click="closePasswordDialog"
            >
              ×
            </button>
          </div>
          <label for="wiki-frequent-password">Wiki 编辑密码</label>
          <input
            id="wiki-frequent-password"
            v-model="passwordInput"
            type="password"
            autocomplete="current-password"
            autofocus
          >
          <p
            v-if="passwordError"
            class="wiki-frequent-dialog-error"
            role="alert"
          >
            {{ passwordError }}
          </p>
          <button
            type="submit"
            class="wiki-frequent-submit"
            :disabled="syncing"
          >
            {{ syncing ? '同步中...' : '确认同步' }}
          </button>
        </form>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import {
  completeWikiVisitSyncBatch,
  getPendingWikiVisitTotal,
  prepareWikiVisitSyncBatch,
  selectFrequentWikiPages,
  WIKI_VISIT_COUNTS_STORAGE_KEY,
  WIKI_VISIT_SYNC_BATCH_STORAGE_KEY,
  type WikiVisitsResponse,
} from '~/utils/wiki-visit-counts'
import {
  clearStoredWikiEditPassword,
  getStoredWikiEditPassword,
  setStoredWikiEditPassword,
} from '~/utils/wiki-edit-password'

interface WikiFrequentPage {
  _path: string
  title?: string
  date?: string
  topic: string
}

const props = defineProps<{
  pages: WikiFrequentPage[]
}>()

const { data, error: loadError } = await useFetch<WikiVisitsResponse>('/api/wiki/visits')
const pendingTotal = ref(0)
const syncing = ref(false)
const syncError = ref('')
const syncMessage = ref('')
const passwordDialogOpen = ref(false)
const passwordInput = ref('')
const passwordError = ref('')
const maskPointerDown = ref(false)

const selectedPages = computed(() => {
  const frequentPages = selectFrequentWikiPages(
    props.pages,
    data.value?.counts || {},
    2,
  )
  return frequentPages.length > 0
    ? frequentPages
    : [...props.pages]
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 2)
})

const syncButtonText = computed(() => {
  if (syncing.value)
    return '同步中...'
  return pendingTotal.value > 0 ? `同步 ${pendingTotal.value}` : '同步'
})

function updatePendingTotal() {
  pendingTotal.value = getPendingWikiVisitTotal()
}

function readErrorStatus(error: unknown): number {
  if (!error || typeof error !== 'object')
    return 0
  const value = error as { statusCode?: number, response?: { status?: number } }
  return value.statusCode || value.response?.status || 0
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message)
    return error.message
  if (!error || typeof error !== 'object')
    return '同步失败，请稍后重试'
  const value = error as {
    statusMessage?: string
    data?: { statusMessage?: string, message?: string }
  }
  return value.data?.statusMessage || value.data?.message || value.statusMessage || '同步失败，请稍后重试'
}

async function refreshRemoteVisits() {
  data.value = await $fetch<WikiVisitsResponse>('/api/wiki/visits')
  syncMessage.value = '已刷新访问排行'
}

async function syncVisits(password: string): Promise<boolean> {
  syncing.value = true
  syncError.value = ''
  syncMessage.value = ''

  try {
    const pendingBefore = getPendingWikiVisitTotal()
    const batch = prepareWikiVisitSyncBatch(crypto.randomUUID())
    if (!batch) {
      if (pendingBefore > 0)
        throw new Error('无法准备本地访问数据，请检查浏览器存储权限')
      await refreshRemoteVisits()
      return true
    }

    data.value = await $fetch<WikiVisitsResponse>('/api/wiki/visits/sync', {
      method: 'POST',
      body: {
        password,
        id: batch.id,
        counts: batch.counts,
      },
    })
    completeWikiVisitSyncBatch(batch.id)
    setStoredWikiEditPassword(password)
    syncMessage.value = '本地访问次数已同步'
    return true
  }
  catch (error) {
    if (readErrorStatus(error) === 401) {
      clearStoredWikiEditPassword()
      passwordDialogOpen.value = true
      passwordError.value = '密码错误，请重新输入'
    }
    else if (passwordDialogOpen.value) {
      passwordError.value = readErrorMessage(error)
    }
    else {
      syncError.value = readErrorMessage(error)
    }
    return false
  }
  finally {
    updatePendingTotal()
    syncing.value = false
  }
}

async function requestSync() {
  if (syncing.value)
    return

  updatePendingTotal()
  if (pendingTotal.value === 0) {
    syncing.value = true
    syncError.value = ''
    syncMessage.value = ''
    try {
      await refreshRemoteVisits()
    }
    catch (error) {
      syncError.value = readErrorMessage(error)
    }
    finally {
      syncing.value = false
    }
    return
  }

  const storedPassword = getStoredWikiEditPassword()
  if (storedPassword) {
    await syncVisits(storedPassword)
    return
  }
  passwordDialogOpen.value = true
}

async function submitPassword() {
  const input = passwordInput.value.trim()
  if (!input) {
    passwordError.value = '请输入密码'
    return
  }

  passwordError.value = ''
  if (await syncVisits(input))
    closePasswordDialog()
}

function closePasswordDialog() {
  if (syncing.value)
    return
  passwordDialogOpen.value = false
  passwordInput.value = ''
  passwordError.value = ''
  maskPointerDown.value = false
}

function closePasswordFromMask() {
  if (maskPointerDown.value)
    closePasswordDialog()
  maskPointerDown.value = false
}

function handleStorage(event: StorageEvent) {
  if (
    event.key === WIKI_VISIT_COUNTS_STORAGE_KEY
    || event.key === WIKI_VISIT_SYNC_BATCH_STORAGE_KEY
  ) {
    updatePendingTotal()
  }
}

onMounted(() => {
  updatePendingTotal()
  window.addEventListener('storage', handleStorage)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorage)
})
</script>

<style scoped>
.wiki-frequent-pages {
  min-width: 0;
}

.wiki-frequent-heading,
.wiki-frequent-dialog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.wiki-frequent-heading {
  margin-bottom: 18px;
}

.wiki-frequent-eyebrow,
.wiki-frequent-dialog-heading p {
  margin: 0 0 4px;
  color: var(--blog-blue-700);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.wiki-frequent-title,
.wiki-frequent-dialog-heading h3 {
  margin: 0;
  color: var(--blog-slate-900);
}

.wiki-frequent-title {
  font-size: 16px;
  line-height: 1.35;
}

.wiki-frequent-sync,
.wiki-frequent-dialog-heading button,
.wiki-frequent-submit {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.wiki-frequent-sync {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 8px;
  color: var(--blog-blue-700);
  background: var(--blog-blue-50);
  font-size: 12px;
  font-weight: 600;
}

.wiki-frequent-sync:hover:not(:disabled) {
  color: var(--blog-blue-800);
  background: var(--blog-blue-100);
}

.wiki-frequent-sync:disabled,
.wiki-frequent-submit:disabled,
.wiki-frequent-dialog-heading button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.wiki-frequent-sync svg {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.wiki-frequent-message {
  margin: -8px 0 12px;
  color: var(--blog-slate-500);
  font-size: 11px;
  line-height: 1.5;
}

.wiki-frequent-message--error,
.wiki-frequent-dialog-error {
  color: var(--blog-danger-700);
}

.wiki-frequent-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.wiki-frequent-item {
  display: grid;
  gap: 5px;
  padding: 13px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 11px;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s;
}

.wiki-frequent-item:hover {
  border-color: var(--blog-blue-300);
  background: var(--blog-blue-50);
  box-shadow: 0 8px 18px var(--blog-shadow-xs);
}

.wiki-frequent-item strong {
  color: var(--blog-slate-800);
  font-size: 13px;
}

.wiki-frequent-item span {
  color: var(--blog-slate-500);
  font-size: 12px;
  line-height: 1.5;
}

.wiki-frequent-mask {
  position: fixed;
  z-index: 12000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--blog-overlay-dark);
  backdrop-filter: blur(8px);
}

.wiki-frequent-dialog {
  box-sizing: border-box;
  display: grid;
  width: min(100%, 380px);
  gap: 14px;
  padding: 22px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 16px;
  background: var(--blog-white);
  box-shadow: 0 24px 60px var(--blog-shadow-lg);
}

.wiki-frequent-dialog-heading {
  align-items: center;
}

.wiki-frequent-dialog-heading h3 {
  font-size: 18px;
}

.wiki-frequent-dialog-heading button {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
  color: var(--blog-slate-500);
  background: var(--blog-slate-100);
  font-size: 20px;
  line-height: 1;
}

.wiki-frequent-dialog label {
  color: var(--blog-slate-700);
  font-size: 12px;
  font-weight: 600;
}

.wiki-frequent-dialog input {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 11px;
  border: 1px solid var(--blog-slate-300);
  border-radius: 9px;
  color: var(--blog-slate-900);
  background: var(--blog-white);
  font: inherit;
}

.wiki-frequent-dialog-error {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.wiki-frequent-submit {
  padding: 9px 13px;
  border-radius: 9px;
  color: var(--blog-white);
  background: var(--blog-blue-600);
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 7px 16px var(--blog-shadow-brand);
}

.wiki-frequent-submit:hover:not(:disabled) {
  background: var(--blog-blue-800);
  box-shadow: 0 9px 20px var(--blog-shadow-brand);
}
</style>
