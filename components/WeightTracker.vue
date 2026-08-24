<template>
  <div class="action-group weight-panel">
    <h3 class="action-group-title weight-title">
      <span>体重记录</span>
      <button
        v-if="!locked"
        type="button"
        class="weight-visibility-btn"
        :aria-label="dataVisible ? '隐藏体重数据' : '显示体重数据'"
        :title="dataVisible ? '隐藏' : '显示'"
        @click="toggleDataVisible"
      >
        <svg
          v-if="dataVisible"
          class="weight-visibility-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 5c-5 0-9.27 3.11-11 7.5C2.73 16.89 7 20 12 20s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5Zm0 12.5A5 5 0 1 1 12 7.5a5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
          />
        </svg>
        <svg
          v-else
          class="weight-visibility-icon"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M3.28 2.22 2.22 3.28l3.12 3.12C3.3 8.04 1.84 9.98 1 12.5 2.73 16.89 7 20 12 20c1.82 0 3.53-.41 5.06-1.13l3.66 3.66 1.06-1.06L3.28 2.22ZM12 18.5c-4.2 0-7.74-2.46-9.3-6 1.02-2.3 2.93-4.04 5.24-4.9l1.8 1.8A4.98 4.98 0 0 0 7 12.5a5 5 0 0 0 6.6 4.74l1.55 1.55c-1 .45-2.1.71-3.15.71Zm9.3-6c-.63 1.42-1.65 2.66-2.9 3.6l-1.52-1.52A4.98 4.98 0 0 0 17 12.5c0-.9-.24-1.74-.66-2.46l-4.9-4.9C12.3 5.05 13.1 5 14 5c5 0 9.27 3.11 11 7.5-.42.95-.98 1.82-1.64 2.6l-1.06-1.06c.4-.46.74-.97 1-1.54Z"
          />
        </svg>
      </button>
    </h3>
    <div class="weight-body" :class="{ 'weight-body--hidden': !locked && !dataVisible }">
      <div class="weight-form">
        <div class="weight-form-head">
          <p class="weight-date">
            {{ todayLabel }}
          </p>
          <p v-if="saveMessage" class="weight-message" :class="{ 'weight-message--error': saveError }">
            {{ saveMessage }}
          </p>
        </div>

        <div v-if="pending" class="weight-loading">
          加载中...
        </div>
        <div v-else-if="loadError" class="weight-error">
          {{ loadError }}
        </div>
        <template v-else>
          <div
            v-for="person in people"
            :key="person.id"
            class="weight-person-row"
          >
            <div class="weight-person-head">
              <span class="weight-person-label">{{ person.label }}</span>
              <span
                v-if="todayWeights[person.id] !== undefined"
                class="weight-person-today"
              >
                今日: {{ todayWeights[person.id] }} kg
                <span v-if="todayNotes[person.id]" class="weight-person-note"> 💬{{ todayNotes[person.id] }}</span>
              </span>
            </div>
            <div class="weight-input-row">
              <input
                v-model="inputs[person.id]"
                class="weight-input"
                type="number"
                inputmode="decimal"
                step="0.1"
                min="0"
                max="500"
                placeholder="输入体重"
                :disabled="savingId === person.id || !dataVisible"
                @keyup.enter="saveWeight(person.id)"
              >
              <span class="weight-unit">kg</span>
              <button
                type="button"
                class="weight-save-btn"
                :disabled="savingId === person.id || !canSave(person.id) || !dataVisible"
                @click="saveWeight(person.id)"
              >
                {{ savingId === person.id ? '...' : (todayWeights[person.id] !== undefined ? '更新' : '记录') }}
              </button>
            </div>
            <div class="weight-note-row">
              <input
                v-model="noteInputs[person.id]"
                class="weight-note-input"
                type="text"
                maxlength="50"
                placeholder="添加备注 (选填)"
                :disabled="savingId === person.id || !dataVisible"
                @keyup.enter="saveWeight(person.id)"
              >
            </div>
          </div>
        </template>
      </div>

      <ClientOnly>
        <div class="weight-chart-wrap">
          <div class="weight-chart-toolbar">
            <div
              ref="rangeGroupRef"
              class="weight-range-group"
              :class="{ 'weight-range-group--ready': rangeThumbReady }"
              role="group"
              aria-label="统计范围"
            >
              <span
                class="weight-range-thumb"
                :style="rangeThumbStyle"
                aria-hidden="true"
              />
              <button
                v-for="option in dayOptions"
                :key="option"
                :ref="(el) => setRangeBtnRef(option, el)"
                type="button"
                class="weight-range-btn"
                :class="{ 'weight-range-btn--active': chartDays === option }"
                :aria-pressed="chartDays === option"
                @click="setChartDays(option)"
              >
                {{ option }}天
              </button>
            </div>
          </div>
          <div ref="chartRef" class="weight-chart" />
        </div>
        <template #fallback>
          <div class="weight-chart-wrap weight-chart-wrap--fallback">
            图表加载中...
          </div>
        </template>
      </ClientOnly>
    </div>

    <!-- 密码锁定遮罩 -->
    <div v-if="locked" class="weight-lock-overlay">
      <div class="weight-lock-card">
        <span class="weight-lock-icon">🔒</span>
        <p class="weight-lock-title">请输入密码查看体重记录</p>
        <div class="weight-lock-row">
          <input
            v-model="lockPassword"
            class="weight-lock-input"
            type="password"
            placeholder="输入密码"
            :disabled="lockPending"
            @keyup.enter="unlock"
          >
          <button
            type="button"
            class="weight-save-btn"
            :disabled="lockPending || !lockPassword"
            @click="unlock"
          >
            {{ lockPending ? '验证中...' : '解锁' }}
          </button>
        </div>
        <p v-if="lockError" class="weight-message weight-message--error">{{ lockError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch, type ComponentPublicInstance } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from '~/composables/useTheme'
import {
  getStoredWikiEditPassword,
  setStoredWikiEditPassword,
  clearStoredWikiEditPassword,
} from '~/utils/wiki-edit-password'
import {
  buildWeightSeries,
  WEIGHT_DAY_OPTIONS,
  DEFAULT_WEIGHT_DAYS,
  type WeightDayOption,
  type WeightPerson,
  type WeightSeriesItem,
  parseWeightDays,
} from '~/utils/weight-chart'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const CHART_COLORS = [
  '--blog-blue-600',
  '--blog-pink-600',
  '--blog-green-600',
  '--blog-orange-600',
]

const WEIGHT_DAYS_STORAGE_KEY = 'weight-chart-days'
const WEIGHT_VISIBLE_STORAGE_KEY = 'weight-data-visible'
const dayOptions = [...WEIGHT_DAY_OPTIONS]

interface WeightResponse {
  people: WeightPerson[]
  records: Record<string, Record<string, number>>
  notes: Record<string, Record<string, string>>
  today: string
  todayRecord: Record<string, number>
  todayNotes: Record<string, string>
}

const { isDark } = useTheme()

const locked = ref(true)
const dataVisible = ref(readStoredDataVisible())
const lockPassword = ref('')
const lockPending = ref(false)
const lockError = ref('')
let currentPassword = ''

function readStoredDataVisible() {
  if (typeof localStorage === 'undefined')
    return true

  try {
    const stored = localStorage.getItem(WEIGHT_VISIBLE_STORAGE_KEY)
    if (stored === null)
      return true
    return stored !== '0' && stored !== 'false'
  }
  catch {
    return true
  }
}

function storeDataVisible(visible: boolean) {
  if (typeof localStorage === 'undefined')
    return

  try {
    localStorage.setItem(WEIGHT_VISIBLE_STORAGE_KEY, visible ? '1' : '0')
  }
  catch {
    // ignore
  }
}

function toggleDataVisible() {
  dataVisible.value = !dataVisible.value
  storeDataVisible(dataVisible.value)
}

const chartRef = ref<HTMLElement | null>(null)
const rangeGroupRef = ref<HTMLElement | null>(null)
const rangeThumbReady = ref(false)
const rangeThumbStyle = ref({
  width: '0px',
  transform: 'translateX(0px)',
})
const rangeBtnRefs = new Map<WeightDayOption, HTMLButtonElement>()
const people = ref<WeightPerson[]>([])
const records = ref<Record<string, Record<string, number>>>({})
const notes = ref<Record<string, Record<string, string>>>({})
const inputs = reactive<Record<string, string>>({})
const noteInputs = reactive<Record<string, string>>({})
const todayWeights = reactive<Record<string, number>>({})
const todayNotes = reactive<Record<string, string>>({})
const chartDays = ref<WeightDayOption>(DEFAULT_WEIGHT_DAYS)
const chartDates = ref<string[]>([])
const chartSeries = ref<WeightSeriesItem[]>([])
const today = ref('')
const pending = ref(true)
const savingId = ref<number | null>(null)
const loadError = ref('')
const saveMessage = ref('')
const saveError = ref(false)

let chart: echarts.ECharts | null = null

async function verifyPassword(password: string): Promise<boolean> {
  try {
    await $fetch('/api/wiki/verify', {
      method: 'POST',
      body: { password },
    })
    return true
  }
  catch {
    return false
  }
}

async function unlock() {
  const pw = lockPassword.value.trim()
  if (!pw)
    return

  lockPending.value = true
  lockError.value = ''

  const ok = await verifyPassword(pw)
  if (!ok) {
    lockError.value = '密码错误'
    lockPending.value = false
    return
  }

  setStoredWikiEditPassword(pw)
  currentPassword = pw
  locked.value = false
  lockPassword.value = ''
  lockPending.value = false
  lockError.value = ''

  await loadWeight()
}

function handleUnauthorized() {
  clearStoredWikiEditPassword()
  currentPassword = ''
  locked.value = true
  loadError.value = ''
}

function canSave(personId: number) {
  const val = Number.parseFloat(inputs[personId])
  return Number.isFinite(val) && val > 0 && val <= 500
}

const todayLabel = computed(() => {
  if (!today.value)
    return ''

  const date = new Date(`${today.value}T12:00:00+08:00`)
  if (Number.isNaN(date.getTime()))
    return today.value

  const opts = { timeZone: 'Asia/Shanghai' } as const
  const datePart = date.toLocaleDateString('zh-CN', {
    ...opts,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const weekdayPart = date.toLocaleDateString('zh-CN', {
    ...opts,
    weekday: 'short',
  })
  return `${datePart} ${weekdayPart}`
})

function readCssVar(name: string, fallback: string) {
  if (typeof document === 'undefined')
    return fallback

  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function getChartColors() {
  const fallbacks = ['#2563eb', '#db2777', '#16a34a', '#ea580c']
  return CHART_COLORS.map((name, index) => readCssVar(name, fallbacks[index]))
}

function readStoredChartDays() {
  if (typeof localStorage === 'undefined')
    return DEFAULT_WEIGHT_DAYS

  try {
    return parseWeightDays(localStorage.getItem(WEIGHT_DAYS_STORAGE_KEY))
  }
  catch {
    return DEFAULT_WEIGHT_DAYS
  }
}

function storeChartDays(days: WeightDayOption) {
  if (typeof localStorage === 'undefined')
    return

  try {
    localStorage.setItem(WEIGHT_DAYS_STORAGE_KEY, String(days))
  }
  catch {
    // ignore
  }
}

function setRangeBtnRef(option: WeightDayOption, el: Element | ComponentPublicInstance | null) {
  if (el instanceof HTMLButtonElement)
    rangeBtnRefs.set(option, el)
  else
    rangeBtnRefs.delete(option)
}

function updateRangeThumb() {
  const group = rangeGroupRef.value
  const btn = rangeBtnRefs.get(chartDays.value)
  if (!group || !btn)
    return

  const groupRect = group.getBoundingClientRect()
  const btnRect = btn.getBoundingClientRect()
  const left = btnRect.left - groupRect.left

  rangeThumbStyle.value = {
    width: `${btnRect.width}px`,
    transform: `translateX(${left}px)`,
  }
  rangeThumbReady.value = true
}

function updateChartData() {
  const chart = buildWeightSeries(
    { people: people.value, records: records.value },
    chartDays.value,
  )
  chartDates.value = chart.dates
  chartSeries.value = chart.series
}

function setChartDays(days: WeightDayOption) {
  if (chartDays.value === days)
    return

  chartDays.value = days
  storeChartDays(days)
  updateChartData()
  nextTick(() => {
    updateRangeThumb()
    renderChart()
  })
}

function formatAxisDate(date: string) {
  const [, month, day] = date.split('-')
  return `${month}/${day}`
}

function getAxisLabelInterval(days: number) {
  const targetLabels = 7
  return Math.max(0, Math.ceil(days / targetLabels) - 1)
}

function renderChart() {
  if (!chartRef.value)
    return

  if (!chart)
    chart = echarts.init(chartRef.value)

  const textColor = readCssVar('--blog-slate-600', '#475569')
  const axisLineColor = readCssVar('--blog-slate-200', '#e2e8f0')
  const splitLineColor = readCssVar('--blog-slate-100', '#f1f5f9')
  const colors = getChartColors()

  // Calculate y-axis range from all series
  let yMin = 40
  let yMax = 100
  const allValues: number[] = []
  for (const s of chartSeries.value) {
    for (const v of s.values) {
      if (v !== null)
        allValues.push(v)
    }
  }
  if (allValues.length > 0) {
    yMin = Math.floor(Math.min(...allValues) - 2)
    yMax = Math.ceil(Math.max(...allValues) + 2)
  }

  chart.setOption({
    color: colors,
    tooltip: {
      trigger: 'axis',
      backgroundColor: readCssVar('--blog-white', '#ffffff'),
      borderColor: axisLineColor,
      textStyle: { color: textColor },
      formatter: (params: any) => {
        const items = Array.isArray(params) ? params : [params]
        const idx = items[0]?.dataIndex
        const date = chartDates.value[idx] || ''
        const dayNotes = notes.value[date] || {}
        const lines = items
          .filter((p: any) => p.value != null)
          .map((p: any) => {
            const seriesItem = chartSeries.value[p.seriesIndex]
            const personId = seriesItem ? String(seriesItem.id) : ''
            const note = dayNotes[personId] || ''
            const noteTag = note ? ` 💬${note}` : ''
            return `${p.marker} ${p.seriesName}: <b>${p.value} kg</b>${noteTag}`
          })
        return lines.length ? `${date}<br/>${lines.join('<br/>')}` : date
      },
    },
    legend: {
      top: 0,
      textStyle: { color: textColor },
    },
    grid: {
      top: 36,
      left: 12,
      right: 12,
      bottom: 12,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartDates.value.map(formatAxisDate),
      axisLine: { lineStyle: { color: axisLineColor } },
      axisLabel: {
        color: textColor,
        interval: getAxisLabelInterval(chartDays.value),
        hideOverlap: true,
      },
    },
    yAxis: {
      type: 'value',
      min: yMin,
      max: yMax,
      axisLine: { show: false },
      axisLabel: {
        color: textColor,
        formatter: '{value} kg',
      },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series: chartSeries.value.map((item, index) => ({
      name: item.label,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      connectNulls: false,
      data: item.values,
      color: colors[index % colors.length],
    })),
  }, true)
}

async function loadWeight() {
  pending.value = true
  loadError.value = ''

  try {
    const data = await $fetch<WeightResponse>('/api/weight', {
      query: { password: currentPassword },
    })
    people.value = data.people
    records.value = data.records
    notes.value = data.notes
    today.value = data.today

    // 初始化每个人的输入和今日值
    for (const person of data.people) {
      const pid = String(person.id)
      const todayVal = data.todayRecord[pid]
      if (todayVal !== undefined) {
        todayWeights[person.id] = todayVal
        inputs[person.id] = String(todayVal)
      }
      else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete todayWeights[person.id]
        if (!inputs[person.id])
          inputs[person.id] = ''
      }
      // 备注
      const todayNote = data.todayNotes[pid]
      if (todayNote) {
        todayNotes[person.id] = todayNote
        noteInputs[person.id] = todayNote
      }
      else {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete todayNotes[person.id]
        if (!noteInputs[person.id])
          noteInputs[person.id] = ''
      }
    }

    updateChartData()
    await nextTick()
    renderChart()
    await nextTick()
    updateRangeThumb()
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error && (error as any).statusCode === 401) {
      handleUnauthorized()
      return
    }
    loadError.value = error instanceof Error ? error.message : '加载体重数据失败'
  }
  finally {
    pending.value = false
  }
}

async function saveWeight(personId: number) {
  if (!canSave(personId))
    return

  saveMessage.value = ''
  saveError.value = false
  savingId.value = personId

  try {
    const weight = Number.parseFloat(inputs[personId])
    const note = (noteInputs[personId] || '').trim()
    await $fetch('/api/weight/save', {
      method: 'POST',
      body: { personId, weight, note: note || undefined, password: currentPassword },
    })

    saveMessage.value = '体重已保存'
    setTimeout(() => { saveMessage.value = '' }, 2000)
    await loadWeight()
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error && (error as any).statusCode === 401) {
      handleUnauthorized()
      return
    }
    saveMessage.value = error instanceof Error ? error.message : '保存失败'
    saveError.value = true
  }
  finally {
    savingId.value = null
  }
}

function handleResize() {
  updateRangeThumb()
  chart?.resize()
}

onMounted(async () => {
  chartDays.value = readStoredChartDays()

  // 尝试用已存储的密码静默解锁
  const storedPw = getStoredWikiEditPassword()
  if (storedPw) {
    const ok = await verifyPassword(storedPw)
    if (ok) {
      currentPassword = storedPw
      locked.value = false
      loadWeight()
    }
    else {
      clearStoredWikiEditPassword()
    }
  }

  window.addEventListener('resize', handleResize)
  nextTick(() => updateRangeThumb())
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  chart?.dispose()
  chart = null
  rangeBtnRefs.clear()
})

watch(isDark, () => {
  renderChart()
  nextTick(() => updateRangeThumb())
})

watch(chartDays, () => {
  nextTick(() => updateRangeThumb())
})

watch([chartDates, chartSeries], () => {
  renderChart()
}, { deep: true })
</script>

<style scoped>
.weight-panel {
  margin-top: 16px;
  position: relative;
  min-width: 0;
  max-width: 100%;
}

.weight-title {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
}

.weight-visibility-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--blog-slate-500);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.weight-visibility-btn:hover {
  color: var(--blog-slate-700);
  background: var(--blog-slate-100);
}

.weight-visibility-icon {
  width: 18px;
  height: 18px;
}

.weight-body {
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  gap: 0;
  min-width: 0;
}

.weight-body--hidden {
  filter: blur(8px);
  user-select: none;
  pointer-events: none;
}

.weight-form {
  padding: 16px;
  border-right: 1px solid var(--blog-slate-200);
  min-width: 0;
  box-sizing: border-box;
}

.weight-form-head {
  margin-bottom: 12px;
}

.weight-date {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--blog-slate-800);
}

.weight-message {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: var(--blog-blue-600);
}

.weight-message--error {
  color: var(--blog-danger-700);
}

.weight-loading,
.weight-error {
  font-size: 0.9rem;
  color: var(--blog-slate-500);
}

.weight-error {
  color: var(--blog-danger-700);
}

.weight-person-row {
  margin-bottom: 14px;
}

.weight-person-row:last-child {
  margin-bottom: 0;
}

.weight-person-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.weight-person-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--blog-slate-700);
}

.weight-person-today {
  font-size: 0.78rem;
  color: var(--blog-slate-500);
}

.weight-input-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.weight-input {
  flex: 1 1 0;
  width: 0;
  min-width: 0;
  padding: 8px 10px;
  border: 1px solid var(--blog-slate-300);
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--blog-slate-800);
  background: var(--blog-white);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  -moz-appearance: textfield;
  box-sizing: border-box;
}

.weight-input::-webkit-outer-spin-button,
.weight-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.weight-input:focus {
  border-color: var(--blog-blue-400);
  box-shadow: 0 0 0 3px var(--blog-blue-100);
}

.weight-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.weight-unit {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--blog-slate-500);
  white-space: nowrap;
}

.weight-save-btn {
  flex-shrink: 0;
  padding: 8px 12px;
  border: 1px solid var(--blog-blue-200);
  border-radius: 10px;
  background: var(--blog-blue-50);
  color: var(--blog-blue-700);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.weight-save-btn:hover:not(:disabled) {
  background: var(--blog-blue-100);
  border-color: var(--blog-blue-300);
}

.weight-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.weight-chart-wrap {
  min-height: 280px;
  min-width: 0;
  padding: 12px 16px 16px;
  box-sizing: border-box;
  overflow: hidden;
}

.weight-chart-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 10px;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.weight-chart-toolbar::-webkit-scrollbar {
  display: none;
}

.weight-range-group {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 10px;
  background: var(--blog-slate-100);
  flex-shrink: 0;
}

.weight-range-thumb {
  position: absolute;
  top: 4px;
  left: 0;
  height: 30px;
  border-radius: 7px;
  background: var(--blog-white);
  box-shadow: 0 1px 2px var(--blog-shadow-xs);
  opacity: 0;
  transition: transform 0.22s ease, width 0.22s ease, opacity 0.15s ease;
  pointer-events: none;
  z-index: 0;
}

.weight-range-group--ready .weight-range-thumb {
  opacity: 1;
}

.weight-range-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 56px;
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--blog-slate-500);
  font-size: 0.88rem;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: color 0.15s ease;
}

.weight-range-btn:hover:not(.weight-range-btn--active) {
  color: var(--blog-slate-700);
}

.weight-range-btn--active {
  color: var(--blog-slate-800);
  font-weight: 600;
}

.weight-range-btn:focus-visible {
  outline: 2px solid var(--blog-blue-200);
  outline-offset: 1px;
}

.weight-chart-wrap--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--blog-slate-500);
  font-size: 0.9rem;
}

.weight-chart {
  width: 100%;
  height: 280px;
}

@media (max-width: 900px) {
  .weight-body {
    grid-template-columns: minmax(0, 1fr);
  }

  .weight-form {
    border-right: 0;
    border-bottom: 1px solid var(--blog-slate-200);
    padding: 12px;
  }

  .weight-input-row {
    gap: 4px;
  }

  .weight-input {
    padding: 8px;
    font-size: 0.95rem;
  }

  .weight-unit {
    font-size: 0.8rem;
  }

  .weight-save-btn {
    padding: 8px 10px;
    font-size: 0.8rem;
  }

  .weight-chart-wrap {
    min-height: 240px;
    padding: 12px;
  }

  .weight-chart-toolbar {
    justify-content: flex-start;
  }

  .weight-range-btn {
    min-width: 44px;
    padding: 0 8px;
    font-size: 0.78rem;
  }

  .weight-chart {
    height: 240px;
  }
}

/* 密码锁遮罩 */
.weight-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--blog-overlay-light);
  backdrop-filter: blur(4px);
  border-radius: 14px;
  z-index: 10;
}

.weight-lock-card {
  text-align: center;
  padding: 28px 24px;
  background: var(--blog-white);
  border: 1px solid var(--blog-slate-200);
  border-radius: 14px;
  box-shadow: 0 8px 24px var(--blog-shadow-md);
  max-width: 300px;
  width: 90%;
}

.weight-lock-icon {
  font-size: 2rem;
  display: block;
  margin-bottom: 8px;
}

.weight-lock-title {
  margin: 0 0 16px;
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--blog-slate-700);
}

.weight-lock-row {
  display: flex;
  gap: 8px;
}

.weight-lock-input {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid var(--blog-slate-300);
  border-radius: 10px;
  font-size: 0.95rem;
  color: var(--blog-slate-800);
  background: var(--blog-white);
  outline: none;
  transition: border-color 0.15s ease;
}

.weight-lock-input:focus {
  border-color: var(--blog-blue-400);
  box-shadow: 0 0 0 3px var(--blog-blue-100);
}

/* 备注 */
.weight-person-note {
  font-size: 0.75rem;
  color: var(--blog-orange-600);
  margin-left: 2px;
}

.weight-note-row {
  margin-top: 6px;
}

.weight-note-input {
  width: 100%;
  box-sizing: border-box;
  padding: 6px 10px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 8px;
  font-size: 0.82rem;
  color: var(--blog-slate-700);
  background: var(--blog-slate-50);
  outline: none;
  transition: border-color 0.15s ease;
}

.weight-note-input:focus {
  border-color: var(--blog-orange-300);
  background: var(--blog-white);
}

.weight-note-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.weight-note-input::placeholder {
  color: var(--blog-slate-400);
}
</style>
