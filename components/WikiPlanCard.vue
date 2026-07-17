<template>
  <section
    class="wiki-plan-card"
    aria-labelledby="wiki-plans-title"
  >
    <div class="wiki-plan-heading">
      <div>
        <p class="wiki-plan-eyebrow">
          Up Next
        </p>
        <h2
          id="wiki-plans-title"
          class="wiki-plan-title"
        >
          近期计划
        </h2>
      </div>
      <button
        v-if="!editing && !pending"
        type="button"
        class="wiki-plan-edit-btn"
        :disabled="authenticating"
        aria-label="编辑近期计划"
        @click="requestEditing"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
        <span>{{ authenticating ? '验证中' : '编辑' }}</span>
      </button>
    </div>

    <p
      v-if="pending"
      class="wiki-plan-state"
    >
      正在读取计划...
    </p>
    <div
      v-else-if="loadError"
      class="wiki-plan-state wiki-plan-state--error"
    >
      <span>计划读取失败</span>
      <button
        type="button"
        @click="refresh()"
      >
        重试
      </button>
    </div>

    <template v-else-if="!editing">
      <ul
        v-if="activePlans.length > 0"
        class="wiki-plan-list"
      >
        <li
          v-for="plan in activePlans"
          :key="plan.id"
        >
          <span
            class="wiki-plan-dot"
            aria-hidden="true"
          />
          <span>{{ plan.text }}</span>
        </li>
      </ul>
      <p
        v-else
        class="wiki-plan-state"
      >
        近期计划已全部完成
      </p>
    </template>

    <div
      v-else
      class="wiki-plan-editor"
    >
      <p
        v-if="saveError"
        class="wiki-plan-error"
        role="alert"
      >
        {{ saveError }}
      </p>

      <div class="wiki-plan-edit-list">
        <div
          v-for="(plan, index) in draftActivePlans"
          :key="plan.id"
          class="wiki-plan-edit-row"
          :class="{ 'wiki-plan-edit-row--dragging': draggedPlanId === plan.id }"
          @dragover.prevent
          @drop="dropPlan(plan.id)"
        >
          <span
            class="wiki-plan-drag"
            title="拖动排序"
            aria-hidden="true"
            draggable="true"
            @dragstart="draggedPlanId = plan.id"
            @dragend="draggedPlanId = ''"
          >⋮⋮</span>
          <input
            v-model="plan.text"
            type="text"
            maxlength="200"
            :aria-label="`计划 ${index + 1}`"
          >
          <div class="wiki-plan-row-actions">
            <button
              type="button"
              class="wiki-plan-square-btn"
              :disabled="index === 0"
              aria-label="上移"
              @click="movePlan(index, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              class="wiki-plan-square-btn"
              :disabled="index === draftActivePlans.length - 1"
              aria-label="下移"
              @click="movePlan(index, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              class="wiki-plan-complete-btn"
              @click="completePlan(index)"
            >
              完成
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="wiki-plan-add-btn"
        @click="addPlan"
      >
        <span aria-hidden="true">＋</span>
        新增计划
      </button>

      <div
        v-if="draftCompletedPlans.length > 0"
        class="wiki-plan-history"
      >
        <button
          type="button"
          class="wiki-plan-history-toggle"
          :aria-expanded="historyOpen"
          @click="historyOpen = !historyOpen"
        >
          <span>已完成历史</span>
          <span>{{ draftCompletedPlans.length }} 项</span>
        </button>
        <div
          v-if="historyOpen"
          class="wiki-plan-history-list"
        >
          <div
            v-for="(plan, index) in draftCompletedPlans"
            :key="plan.id"
            class="wiki-plan-history-row"
          >
            <div>
              <strong>{{ plan.text }}</strong>
              <time
                v-if="plan.completedAt"
                :datetime="plan.completedAt"
              >
                {{ formatCompletedAt(plan.completedAt) }}
              </time>
            </div>
            <button
              type="button"
              @click="restorePlan(index)"
            >
              恢复
            </button>
          </div>
        </div>
      </div>

      <div class="wiki-plan-editor-actions">
        <button
          type="button"
          class="wiki-plan-secondary-btn"
          :disabled="saving"
          @click="cancelEditing"
        >
          取消
        </button>
        <button
          type="button"
          class="wiki-plan-primary-btn"
          :disabled="saving"
          @click="savePlans"
        >
          {{ saving ? '保存中...' : '保存计划' }}
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="passwordDialogOpen"
        class="wiki-plan-mask"
        @pointerdown.self="maskPointerDown = true"
        @pointerup.self="closePasswordFromMask"
        @pointercancel="maskPointerDown = false"
      >
        <form
          class="wiki-plan-dialog"
          @submit.prevent="unlockWithInput"
        >
          <div class="wiki-plan-dialog-heading">
            <div>
              <p>Protected</p>
              <h3>验证 Wiki 密码</h3>
            </div>
            <button
              type="button"
              aria-label="关闭"
              @click="closePasswordDialog"
            >
              ×
            </button>
          </div>
          <label for="wiki-plan-password">编辑密码</label>
          <input
            id="wiki-plan-password"
            v-model="passwordInput"
            type="password"
            autocomplete="current-password"
            autofocus
            placeholder="输入 Wiki 编辑密码"
          >
          <p
            v-if="passwordError"
            class="wiki-plan-dialog-error"
            role="alert"
          >
            {{ passwordError }}
          </p>
          <button
            type="submit"
            class="wiki-plan-primary-btn"
            :disabled="authenticating"
          >
            {{ authenticating ? '验证中...' : '进入编辑' }}
          </button>
        </form>
      </div>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import {
  mergeMissingWikiPlanInputs,
  type WikiPlanInput,
  type WikiPlansResponse,
} from '~/utils/wiki-plans'
import {
  clearStoredWikiEditPassword,
  getStoredWikiEditPassword,
  setStoredWikiEditPassword,
} from '~/utils/wiki-edit-password'

const { data, pending, error: loadError, refresh } = await useFetch<WikiPlansResponse>('/api/wiki/plans')

const editing = ref(false)
const saving = ref(false)
const saveError = ref('')
const authenticating = ref(false)
const passwordDialogOpen = ref(false)
const passwordInput = ref('')
const passwordError = ref('')
const password = ref('')
const maskPointerDown = ref(false)
const historyOpen = ref(false)
const draggedPlanId = ref('')
const draftActivePlans = ref<WikiPlanInput[]>([])
const draftCompletedPlans = ref<WikiPlanInput[]>([])

const activePlans = computed(() =>
  (data.value?.plans || []).filter(plan => plan.status === 'active'),
)

function clonePlan(plan: WikiPlanInput): WikiPlanInput {
  return { ...plan }
}

function openEditor() {
  draftActivePlans.value = (data.value?.plans || [])
    .filter(plan => plan.status === 'active')
    .map(clonePlan)
  draftCompletedPlans.value = (data.value?.plans || [])
    .filter(plan => plan.status === 'completed')
    .map(clonePlan)
  saveError.value = ''
  historyOpen.value = false
  editing.value = true
}

async function verifyPassword(value: string) {
  const response = await fetch('/api/wiki/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: value }),
  })
  return response.ok
}

async function requestEditing() {
  const stored = getStoredWikiEditPassword()
  if (!stored) {
    passwordDialogOpen.value = true
    return
  }

  authenticating.value = true
  try {
    if (await verifyPassword(stored)) {
      password.value = stored
      openEditor()
      return
    }
    clearStoredWikiEditPassword()
  }
  catch {
    passwordError.value = '网络错误，请稍后重试'
  }
  finally {
    authenticating.value = false
  }

  passwordDialogOpen.value = true
}

async function unlockWithInput() {
  const input = passwordInput.value.trim()
  if (!input) {
    passwordError.value = '请输入密码'
    return
  }

  authenticating.value = true
  passwordError.value = ''
  try {
    if (!await verifyPassword(input)) {
      clearStoredWikiEditPassword()
      passwordError.value = '密码错误'
      return
    }
    password.value = input
    setStoredWikiEditPassword(input)
    closePasswordDialog()
    if (!editing.value)
      openEditor()
  }
  catch {
    passwordError.value = '网络错误，请稍后重试'
  }
  finally {
    authenticating.value = false
  }
}

function closePasswordDialog() {
  passwordDialogOpen.value = false
  passwordInput.value = ''
  passwordError.value = ''
  maskPointerDown.value = false
}

function closePasswordFromMask() {
  if (!maskPointerDown.value)
    return
  closePasswordDialog()
}

function addPlan() {
  draftActivePlans.value.push({
    id: crypto.randomUUID(),
    text: '',
    status: 'active',
  })
}

function movePlan(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= draftActivePlans.value.length)
    return
  const [plan] = draftActivePlans.value.splice(index, 1)
  draftActivePlans.value.splice(target, 0, plan)
}

function dropPlan(targetId: string) {
  const from = draftActivePlans.value.findIndex(plan => plan.id === draggedPlanId.value)
  const to = draftActivePlans.value.findIndex(plan => plan.id === targetId)
  if (from === -1 || to === -1 || from === to)
    return
  const [plan] = draftActivePlans.value.splice(from, 1)
  draftActivePlans.value.splice(to, 0, plan)
  draggedPlanId.value = ''
}

function completePlan(index: number) {
  const [plan] = draftActivePlans.value.splice(index, 1)
  draftCompletedPlans.value.unshift({
    ...plan,
    status: 'completed',
    completedAt: undefined,
  })
}

function restorePlan(index: number) {
  const [plan] = draftCompletedPlans.value.splice(index, 1)
  draftActivePlans.value.push({
    ...plan,
    status: 'active',
    completedAt: undefined,
  })
}

function cancelEditing() {
  editing.value = false
  saveError.value = ''
}

function readErrorStatus(error: unknown): number {
  if (!error || typeof error !== 'object')
    return 0
  const value = error as { statusCode?: number, response?: { status?: number } }
  return value.statusCode || value.response?.status || 0
}

function readErrorMessage(error: unknown): string {
  if (!error || typeof error !== 'object')
    return '保存失败，请稍后重试'
  const value = error as {
    statusMessage?: string
    data?: { statusMessage?: string, message?: string }
  }
  return value.data?.statusMessage || value.data?.message || value.statusMessage || '保存失败，请稍后重试'
}

async function refreshAfterConflict() {
  await refresh()
  if (loadError.value)
    throw new Error('计划重新加载失败')

  const merged = mergeMissingWikiPlanInputs(
    [...draftActivePlans.value, ...draftCompletedPlans.value],
    data.value?.plans || [],
  )
  draftActivePlans.value = merged.filter(plan => plan.status === 'active')
  draftCompletedPlans.value = merged.filter(plan => plan.status === 'completed')
}

async function savePlans() {
  saveError.value = ''
  const plans = [...draftActivePlans.value, ...draftCompletedPlans.value]
  if (plans.some(plan => !plan.text.trim())) {
    saveError.value = '计划内容不能为空'
    return
  }

  saving.value = true
  try {
    data.value = await $fetch<WikiPlansResponse>('/api/wiki/plans/save', {
      method: 'POST',
      body: {
        password: password.value,
        plans,
        version: data.value?.version || '',
      },
    })
    setStoredWikiEditPassword(password.value)
    editing.value = false
  }
  catch (error) {
    const status = readErrorStatus(error)
    if (status === 401) {
      clearStoredWikiEditPassword()
      password.value = ''
      passwordDialogOpen.value = true
      saveError.value = '密码已失效，验证后请再次保存'
    }
    else if (status === 409) {
      try {
        await refreshAfterConflict()
        saveError.value = '已加载其他设备的最新计划，请检查后再次保存'
      }
      catch {
        saveError.value = '计划版本冲突，重新加载失败，请刷新页面后再试'
      }
    }
    else {
      saveError.value = readErrorMessage(error)
    }
  }
  finally {
    saving.value = false
  }
}

function formatCompletedAt(value: string) {
  return value.replace('T', ' ').replace('+08:00', '')
}
</script>

<style scoped>
.wiki-plan-card {
  min-width: 0;
}

.wiki-plan-heading,
.wiki-plan-dialog-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.wiki-plan-heading {
  margin-bottom: 18px;
}

.wiki-plan-eyebrow,
.wiki-plan-dialog-heading p {
  margin: 0 0 4px;
  color: var(--blog-blue-700);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.wiki-plan-title,
.wiki-plan-dialog-heading h3 {
  margin: 0;
  color: var(--blog-slate-900);
}

.wiki-plan-title {
  font-size: 16px;
  line-height: 1.35;
}

.wiki-plan-edit-btn,
.wiki-plan-add-btn,
.wiki-plan-secondary-btn,
.wiki-plan-primary-btn,
.wiki-plan-complete-btn,
.wiki-plan-square-btn,
.wiki-plan-history-toggle,
.wiki-plan-history-row button,
.wiki-plan-dialog-heading button,
.wiki-plan-state button {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.wiki-plan-edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border-radius: 8px;
  color: var(--blog-blue-700);
  background: var(--blog-blue-50);
  font-size: 12px;
  font-weight: 600;
}

.wiki-plan-edit-btn svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

.wiki-plan-edit-btn:hover,
.wiki-plan-add-btn:hover,
.wiki-plan-history-row button:hover,
.wiki-plan-state button:hover {
  color: var(--blog-blue-800);
  background: var(--blog-blue-100);
}

.wiki-plan-list {
  display: grid;
  gap: 13px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wiki-plan-list li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--blog-slate-600);
  font-size: 13px;
  line-height: 1.55;
}

.wiki-plan-dot {
  flex: none;
  width: 7px;
  height: 7px;
  margin-top: 7px;
  border-radius: 50%;
  background: var(--blog-blue-600);
  box-shadow: 0 0 0 4px var(--blog-blue-50);
}

.wiki-plan-state {
  margin: 0;
  color: var(--blog-slate-500);
  font-size: 13px;
  line-height: 1.6;
}

.wiki-plan-state--error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--blog-danger-700);
}

.wiki-plan-state button {
  padding: 6px 9px;
  border-radius: 8px;
  color: var(--blog-blue-700);
  background: var(--blog-blue-50);
}

.wiki-plan-editor,
.wiki-plan-edit-list {
  display: grid;
  gap: 10px;
}

.wiki-plan-error,
.wiki-plan-dialog-error {
  margin: 0;
  color: var(--blog-danger-700);
  font-size: 12px;
  line-height: 1.5;
}

.wiki-plan-edit-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 10px;
  background: var(--blog-slate-50);
}

.wiki-plan-edit-row--dragging {
  border-color: var(--blog-blue-400);
  box-shadow: 0 8px 18px var(--blog-shadow-sm);
}

.wiki-plan-drag {
  align-self: center;
  color: var(--blog-slate-400);
  cursor: grab;
  font-size: 15px;
  letter-spacing: -4px;
}

.wiki-plan-edit-row input,
.wiki-plan-dialog input {
  min-width: 0;
  border: 1px solid var(--blog-slate-200);
  color: var(--blog-slate-800);
  background: var(--blog-white);
  outline: none;
  font: inherit;
}

.wiki-plan-edit-row input {
  padding: 8px 9px;
  border-radius: 8px;
  font-size: 12px;
}

.wiki-plan-edit-row input:focus,
.wiki-plan-dialog input:focus {
  border-color: var(--blog-blue-400);
  box-shadow: 0 0 0 3px var(--blog-blue-200-rgb);
}

.wiki-plan-row-actions {
  grid-column: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.wiki-plan-square-btn,
.wiki-plan-complete-btn {
  min-height: 28px;
  border-radius: 7px;
  color: var(--blog-slate-600);
  background: var(--blog-slate-100);
  font-size: 11px;
}

.wiki-plan-square-btn {
  width: 30px;
}

.wiki-plan-complete-btn {
  margin-left: auto;
  padding: 0 10px;
  color: var(--blog-blue-700);
  background: var(--blog-blue-50);
  font-weight: 600;
}

.wiki-plan-square-btn:hover:not(:disabled),
.wiki-plan-complete-btn:hover {
  color: var(--blog-blue-800);
  background: var(--blog-blue-100);
}

.wiki-plan-edit-btn:disabled,
.wiki-plan-square-btn:disabled,
.wiki-plan-secondary-btn:disabled,
.wiki-plan-primary-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.wiki-plan-add-btn {
  justify-self: start;
  padding: 7px 10px;
  border-radius: 8px;
  color: var(--blog-blue-700);
  background: var(--blog-blue-50);
  font-size: 12px;
  font-weight: 600;
}

.wiki-plan-history {
  overflow: hidden;
  border-radius: 10px;
  background: var(--blog-slate-50);
}

.wiki-plan-history-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  color: var(--blog-slate-600);
  background: transparent;
  font-size: 12px;
  font-weight: 600;
}

.wiki-plan-history-list {
  display: grid;
  gap: 1px;
  padding: 0 8px 8px;
}

.wiki-plan-history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px;
  border-radius: 8px;
  background: var(--blog-white);
}

.wiki-plan-history-row div {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.wiki-plan-history-row strong {
  overflow: hidden;
  color: var(--blog-slate-600);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wiki-plan-history-row time {
  color: var(--blog-slate-400);
  font-size: 10px;
}

.wiki-plan-history-row button {
  flex: none;
  padding: 6px 9px;
  border-radius: 7px;
  color: var(--blog-blue-700);
  background: var(--blog-blue-50);
  font-size: 11px;
  font-weight: 600;
}

.wiki-plan-editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

.wiki-plan-secondary-btn,
.wiki-plan-primary-btn {
  padding: 9px 13px;
  border-radius: 9px;
  font-size: 12px;
  font-weight: 600;
}

.wiki-plan-secondary-btn {
  color: var(--blog-slate-700);
  background: var(--blog-slate-100);
}

.wiki-plan-primary-btn {
  color: var(--blog-white);
  background: var(--blog-blue-600);
  box-shadow: 0 7px 16px var(--blog-shadow-brand);
}

.wiki-plan-secondary-btn:hover {
  background: var(--blog-slate-200);
}

.wiki-plan-primary-btn:hover:not(:disabled) {
  background: var(--blog-blue-800);
  box-shadow: 0 9px 20px var(--blog-shadow-brand);
}

.wiki-plan-mask {
  position: fixed;
  z-index: 12000;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  background: var(--blog-overlay-dark);
  backdrop-filter: blur(8px);
}

.wiki-plan-dialog {
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

.wiki-plan-dialog-heading {
  align-items: center;
}

.wiki-plan-dialog-heading h3 {
  font-size: 18px;
}

.wiki-plan-dialog-heading button {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 8px;
  color: var(--blog-slate-500);
  background: var(--blog-slate-100);
  font-size: 20px;
  line-height: 1;
}

.wiki-plan-dialog label {
  color: var(--blog-slate-700);
  font-size: 12px;
  font-weight: 600;
}

.wiki-plan-dialog input {
  box-sizing: border-box;
  width: 100%;
  padding: 10px 11px;
  border-radius: 9px;
  font-size: 14px;
}

@media (max-width: 480px) {
  .wiki-plan-edit-row {
    grid-template-columns: 1fr;
  }

  .wiki-plan-drag {
    display: none;
  }

  .wiki-plan-row-actions {
    grid-column: 1;
  }

  .wiki-plan-primary-btn,
  .wiki-plan-secondary-btn {
    flex: 1;
  }
}
</style>
