<template>
  <div class="wiki-ai-root">
    <button
      v-if="!open"
      type="button"
      class="wiki-ai-fab"
      aria-label="打开 AI 助教"
      @click="openPanel"
    >
      <svg class="wiki-ai-fab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        <path d="M20 3v4M22 5h-4" />
      </svg>
      <span>AI 助教</span>
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        class="wiki-ai-overlay"
        @pointerdown.self="maskPointerDown = true"
        @pointerup.self="closePanelFromMask"
        @pointercancel="maskPointerDown = false"
      >
        <section class="wiki-ai-panel" role="dialog" aria-labelledby="wiki-ai-title" @click.stop>
          <header class="wiki-ai-header">
            <div class="wiki-ai-header-title">
              <h2 id="wiki-ai-title">
                AI 助教
              </h2>
            </div>
            <div class="wiki-ai-header-actions">
              <button type="button" class="wiki-ai-icon-btn" title="新对话" :disabled="!unlocked" @click="startNewChat">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 20h9" stroke-linecap="round" />
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </button>
              <button type="button" class="wiki-ai-icon-btn" title="关闭" @click="closePanel">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
                </svg>
              </button>
            </div>
          </header>

          <div v-if="checkingAuth" class="wiki-ai-lock">
            <p>验证已保存的密码...</p>
          </div>

          <div v-else-if="!unlocked" class="wiki-ai-lock">
            <p class="wiki-ai-lock-title">
              输入密码以使用 AI 助教
            </p>
            <input
              v-model="passwordInput"
              type="password"
              class="wiki-ai-password-input"
              placeholder="编辑密码"
              :disabled="unlocking"
              @keyup.enter="unlock"
            >
            <button type="button" class="wiki-ai-unlock-btn" :disabled="unlocking" @click="unlock">
              {{ unlocking ? '验证中...' : '解锁' }}
            </button>
            <p v-if="lockError" class="wiki-ai-error">
              {{ lockError }}
            </p>
          </div>

          <template v-else>
            <div ref="messagesRef" class="wiki-ai-messages">
              <p v-if="messages.length === 0" class="wiki-ai-empty">
                暂无历史对话
              </p>
              <article
                v-for="(msg, index) in messages"
                :key="index"
                class="wiki-ai-message"
                :class="`wiki-ai-message--${msg.role}`"
              >
                <div
                  v-if="msg.role === 'assistant'"
                  class="wiki-ai-message-content wiki-ai-markdown"
                  v-html="renderMarkdown(msg.content)"
                />
                <p v-else class="wiki-ai-message-content">
                  {{ msg.content }}
                </p>
              </article>
              <p v-if="sending" class="wiki-ai-typing">
                思考中...
              </p>
              <p v-if="chatError" class="wiki-ai-error wiki-ai-error--inline">
                {{ chatError }}
              </p>
            </div>

            <div class="wiki-ai-quick-actions">
              <button type="button" class="wiki-ai-chip" :disabled="sending" @click="sendQuizPrompt">
                考考我
              </button>
              <button type="button" class="wiki-ai-chip" :disabled="sending" @click="sendQuickPrompt('请用三句话总结这篇页面的核心要点。')">
                总结要点
              </button>
            </div>

            <footer class="wiki-ai-footer">
              <div class="wiki-ai-input-wrap">
                <textarea
                  v-model="inputText"
                  class="wiki-ai-input"
                  rows="1"
                  placeholder="输入你的问题..."
                  :disabled="sending"
                  @keydown.enter.exact.prevent="sendMessage"
                />
                <button
                  type="button"
                  class="wiki-ai-send-btn"
                  :disabled="sending || !inputText.trim()"
                  title="发送"
                  @click="sendMessage"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="m22 2-7 20-4-9-9-4Z" stroke-linecap="round" stroke-linejoin="round" />
                    <path d="M22 2 11 13" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
              <label class="wiki-ai-deep-think">
                <input v-model="deepThink" type="checkbox" class="wiki-ai-deep-think-input">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 3l1.4 4.3H18l-3.6 2.6 1.4 4.3L12 11.6 8.2 14.2l1.4-4.3L6 7.3h4.6L12 3z" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                深度思考
              </label>
            </footer>
          </template>
        </section>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import _markdownit from 'markdown-it'
import { useAiPageContext } from '~/composables/useAiPageContext'
import {
  clearStoredWikiEditPassword,
  getStoredWikiEditPassword,
  setStoredWikiEditPassword,
} from '~/utils/wiki-edit-password'
import {
  clearAiSession,
  loadAiSession,
  saveAiSession,
  type AiMessage,
} from '~/utils/ai-session'
import { useRegisterMobileAiOpener } from '~/composables/useMobileFabActions'

const MarkdownIt = ((_markdownit as any).default || _markdownit) as typeof _markdownit
const md = MarkdownIt({ html: false, breaks: true, linkify: true })

const pageContext = useAiPageContext()
const sessionTitle = ref('')

const open = ref(false)
const unlocked = ref(false)
const unlocking = ref(false)
const checkingAuth = ref(false)
const passwordInput = ref('')
const lockError = ref('')

const messages = ref<AiMessage[]>([])
const inputText = ref('')
const sending = ref(false)
const chatError = ref('')
const deepThink = ref(false)
const messagesRef = ref<HTMLElement | null>(null)
const maskPointerDown = ref(false)

function renderMarkdown(content: string) {
  try {
    return md.render(content)
  }
  catch {
    return '<p>渲染失败</p>'
  }
}

async function verifyPassword(password: string) {
  const res = await fetch('/api/wiki/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  return res.ok
}

async function unlockWithPassword(password: string) {
  const ok = await verifyPassword(password)
  if (!ok)
    return false

  passwordInput.value = password
  unlocked.value = true
  setStoredWikiEditPassword(password)
  return true
}

async function unlock() {
  if (!passwordInput.value.trim()) {
    lockError.value = '请输入密码'
    return
  }

  unlocking.value = true
  lockError.value = ''

  try {
    const ok = await unlockWithPassword(passwordInput.value)
    if (!ok) {
      clearStoredWikiEditPassword()
      lockError.value = '密码错误'
    }
  }
  catch {
    lockError.value = '网络错误，请稍后重试'
  }
  finally {
    unlocking.value = false
  }
}

function loadSession() {
  const { pageKey } = pageContext.value
  if (!pageKey) {
    messages.value = []
    return
  }

  const session = loadAiSession(pageKey)
  messages.value = session?.messages || []
  sessionTitle.value = session?.title || pageContext.value.title
}

function persistSession() {
  const { pageKey, title } = pageContext.value
  if (!pageKey)
    return

  saveAiSession({
    pageKey,
    title: sessionTitle.value || title,
    updatedAt: Date.now(),
    messages: messages.value,
  })
}

function startNewChat() {
  messages.value = []
  chatError.value = ''
  clearAiSession(pageContext.value.pageKey)
}

async function scrollToBottom() {
  await nextTick()
  const el = messagesRef.value
  if (el)
    el.scrollTop = el.scrollHeight
}

async function sendChatRequest(userText: string) {
  const { pagePath } = pageContext.value
  if (!pagePath || sending.value)
    return

  const text = userText.trim()
  if (!text)
    return

  chatError.value = ''
  sending.value = true

  const userMessage: AiMessage = { role: 'user', content: text }
  messages.value.push(userMessage)
  persistSession()
  inputText.value = ''
  await scrollToBottom()

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: passwordInput.value,
        pagePath,
        messages: messages.value,
        deepThink: deepThink.value,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ statusMessage: res.statusText }))
      if (res.status === 401) {
        unlocked.value = false
        passwordInput.value = ''
        clearStoredWikiEditPassword()
        lockError.value = '密码已失效，请重新输入'
        messages.value.pop()
        persistSession()
        return
      }
      throw new Error((err as { statusMessage?: string }).statusMessage || '请求失败')
    }

    const data = await res.json() as { reply: string; title?: string }
    if (data.title)
      sessionTitle.value = data.title
    messages.value.push({ role: 'assistant', content: data.reply })
    persistSession()
    await scrollToBottom()
  }
  catch (e: any) {
    messages.value.pop()
    persistSession()
    chatError.value = e.message || '发送失败，请重试'
  }
  finally {
    sending.value = false
  }
}

function sendMessage() {
  sendChatRequest(inputText.value)
}

function sendQuizPrompt() {
  sendChatRequest('请根据当前页面内容给我出 3 道选择题，标明选项、正确答案和简要解析。')
}

function sendQuickPrompt(text: string) {
  sendChatRequest(text)
}

async function openPanel() {
  open.value = true
  checkingAuth.value = true
  lockError.value = ''

  try {
    const stored = getStoredWikiEditPassword()
    if (stored) {
      const ok = await unlockWithPassword(stored)
      if (!ok)
        clearStoredWikiEditPassword()
    }
    loadSession()
  }
  finally {
    checkingAuth.value = false
  }
}

function closePanel() {
  maskPointerDown.value = false
  open.value = false
}

function closePanelFromMask() {
  if (!maskPointerDown.value)
    return

  maskPointerDown.value = false
  open.value = false
}

useRegisterMobileAiOpener(openPanel)

watch(() => pageContext.value.pageKey, () => {
  if (open.value)
    loadSession()
})
</script>

<style scoped>
.wiki-ai-fab {
  position: fixed;
  right: 24px;
  bottom: calc(24px + env(safe-area-inset-bottom));
  z-index: 9997;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 10px 14px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 999px;
  background: var(--blog-white);
  color: var(--blog-slate-700);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 8px 24px var(--blog-shadow-sm);
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
}

.wiki-ai-fab:hover {
  color: var(--blog-blue-800);
  border-color: var(--blog-blue-200);
  background: var(--blog-blue-50);
  box-shadow: 0 10px 28px var(--blog-shadow-md);
}

.wiki-ai-fab-icon {
  width: 18px;
  height: 18px;
  color: var(--blog-blue-600);
  flex-shrink: 0;
}

.wiki-ai-overlay {
  position: fixed;
  inset: 0;
  z-index: 10002;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 16px 20px 88px;
  background: var(--blog-overlay-dark);
}

.wiki-ai-panel {
  display: flex;
  flex-direction: column;
  width: min(400px, calc(100vw - 32px));
  height: min(620px, calc(100vh - 40px));
  border: 1px solid var(--blog-slate-200);
  border-radius: 16px;
  background: var(--blog-white);
  box-shadow: 0 20px 48px var(--blog-shadow-lg);
  overflow: hidden;
}

.wiki-ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--blog-slate-200);
  background: var(--blog-white);
}

.wiki-ai-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.wiki-ai-header-title h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--blog-slate-800);
}

.wiki-ai-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.wiki-ai-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--blog-slate-500);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}

.wiki-ai-icon-btn:hover:not(:disabled) {
  color: var(--blog-slate-800);
  background: var(--blog-slate-100);
}

.wiki-ai-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.wiki-ai-lock {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.wiki-ai-lock-title {
  margin: 0;
  font-size: 14px;
  color: var(--blog-slate-700);
}

.wiki-ai-password-input {
  width: 100%;
  max-width: 280px;
  padding: 10px 12px;
  border: 1px solid var(--blog-slate-300);
  border-radius: 8px;
  font-size: 14px;
  background: var(--blog-white);
  color: var(--blog-slate-800);
  box-sizing: border-box;
}

.wiki-ai-password-input:focus {
  outline: none;
  border-color: var(--blog-blue-400);
  box-shadow: 0 0 0 3px var(--blog-blue-200-rgb);
}

.wiki-ai-unlock-btn {
  padding: 8px 18px;
  border: 0;
  border-radius: 8px;
  background: var(--blog-slate-800);
  color: var(--blog-white);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.wiki-ai-unlock-btn:hover:not(:disabled) {
  background: var(--blog-slate-700);
}

.wiki-ai-unlock-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.wiki-ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.wiki-ai-empty {
  margin: 40px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--blog-slate-400);
}

.wiki-ai-message {
  margin-bottom: 14px;
}

.wiki-ai-message--user .wiki-ai-message-content {
  margin-left: auto;
  max-width: 88%;
  padding: 10px 12px;
  border-radius: 12px 12px 4px 12px;
  background: var(--blog-blue-50);
  color: var(--blog-slate-800);
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
}

.wiki-ai-message--assistant .wiki-ai-message-content {
  font-size: 14px;
  line-height: 1.65;
  color: var(--blog-slate-800);
}

.wiki-ai-markdown :deep(p) {
  margin: 0 0 10px;
}

.wiki-ai-markdown :deep(p:last-child) {
  margin-bottom: 0;
}

.wiki-ai-markdown :deep(ul),
.wiki-ai-markdown :deep(ol) {
  margin: 0 0 10px;
  padding-left: 1.25rem;
}

.wiki-ai-markdown :deep(code) {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: var(--blog-slate-100);
  font-size: 0.92em;
}

.wiki-ai-markdown :deep(pre) {
  margin: 0 0 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--blog-code-bg);
  color: var(--blog-slate-100);
  overflow-x: auto;
}

.wiki-ai-markdown :deep(pre code) {
  padding: 0;
  background: transparent;
}

.wiki-ai-typing {
  margin: 0;
  font-size: 13px;
  color: var(--blog-slate-400);
}

.wiki-ai-error {
  margin: 0;
  font-size: 13px;
  color: var(--blog-danger-700);
}

.wiki-ai-error--inline {
  margin-top: 8px;
}

.wiki-ai-quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 0 16px 10px;
}

.wiki-ai-chip {
  padding: 5px 12px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 999px;
  background: var(--blog-slate-50);
  color: var(--blog-slate-700);
  font-size: 12px;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
}

.wiki-ai-chip:hover:not(:disabled) {
  color: var(--blog-blue-800);
  background: var(--blog-blue-50);
  border-color: var(--blog-blue-200);
}

.wiki-ai-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.wiki-ai-footer {
  padding: 0 16px 14px;
}

.wiki-ai-input-wrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 10px 8px 14px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 14px;
  background: var(--blog-slate-50);
}

.wiki-ai-input {
  flex: 1;
  min-height: 24px;
  max-height: 120px;
  padding: 4px 0;
  border: 0;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--blog-slate-800);
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
}

.wiki-ai-send-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--blog-blue-600);
  color: var(--blog-white);
  cursor: pointer;
  transition: background 0.15s ease;
}

.wiki-ai-send-btn:hover:not(:disabled) {
  background: var(--blog-blue-700);
}

.wiki-ai-send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.wiki-ai-deep-think {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  margin-left: auto;
  float: right;
  font-size: 11px;
  color: var(--blog-slate-500);
  cursor: pointer;
  user-select: none;
}

.wiki-ai-deep-think-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.wiki-ai-deep-think:has(.wiki-ai-deep-think-input:checked) {
  color: var(--blog-blue-700);
}

@media (max-width: 899px) {
  .wiki-ai-fab {
    display: none;
  }
}

@media (max-width: 768px) {
  .wiki-ai-overlay {
    padding: 0;
    align-items: stretch;
    justify-content: stretch;
  }

  .wiki-ai-panel {
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: 0;
    border: 0;
  }
}
</style>
