<template>
  <div class="action-group checkin-panel">
    <h3 class="action-group-title">
      每日签到
    </h3>
    <div class="checkin-body">
      <div class="checkin-form">
        <div class="checkin-form-head">
          <p class="checkin-date">
            {{ todayLabel }}
          </p>
          <p v-if="saveMessage" class="checkin-message" :class="{ 'checkin-message--error': saveError }">
            {{ saveMessage }}
          </p>
        </div>

        <div v-if="pending" class="checkin-loading">
          加载中...
        </div>
        <div v-else-if="loadError" class="checkin-error">
          {{ loadError }}
        </div>
        <template v-else>
          <div class="checkin-items">
            <label
              v-for="item in items"
              :key="item.id"
              class="checkin-item"
              :class="{ 'checkin-item--locked': isCheckedIn(item.id) }"
            >
              <input
                v-model="selectedIds"
                class="checkin-checkbox"
                type="checkbox"
                :value="item.id"
                :disabled="isCheckedIn(item.id)"
              >
              <span>{{ item.label }}</span>
            </label>
          </div>

          <div class="checkin-actions">
            <button
              type="button"
              class="checkin-save-btn"
              :disabled="saving || checkedInToday || !hasNewSelection"
              @click="saveCheckin"
            >
              {{ saveButtonLabel }}
            </button>
          </div>
        </template>
      </div>

      <ClientOnly>
        <div class="checkin-chart-wrap">
          <div class="checkin-chart-toolbar">
            <div
              ref="rangeGroupRef"
              class="checkin-range-group"
              :class="{ 'checkin-range-group--ready': rangeThumbReady }"
              role="group"
              aria-label="统计范围"
            >
              <span
                class="checkin-range-thumb"
                :style="rangeThumbStyle"
                aria-hidden="true"
              />
              <button
                v-for="option in dayOptions"
                :key="option"
                :ref="(el) => setRangeBtnRef(option, el)"
                type="button"
                class="checkin-range-btn"
                :class="{ 'checkin-range-btn--active': chartDays === option }"
                :aria-pressed="chartDays === option"
                @click="setChartDays(option)"
              >
                {{ option }}天
              </button>
            </div>
          </div>
          <div ref="chartRef" class="checkin-chart" />
        </div>
        <template #fallback>
          <div class="checkin-chart-wrap checkin-chart-wrap--fallback">
            图表加载中...
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
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
  buildCumulativeSeries,
  CHECKIN_DAY_OPTIONS,
  DEFAULT_CHECKIN_DAYS,
  type CheckinDayOption,
  type CheckinItem,
  parseCheckinDays,
} from '~/utils/checkin-chart'

echarts.use([LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const CHECKIN_DAYS_STORAGE_KEY = 'checkin-chart-days'
const dayOptions = CHECKIN_DAY_OPTIONS

interface CheckinSeries {
  id: number
  label: string
  values: number[]
}

interface CheckinResponse {
  items: CheckinItem[]
  records: Record<string, number[]>
  today: string
  todayItemIds: number[]
  checkedInToday: boolean
  days?: number
}

const CHART_COLORS = [
  '--blog-blue-600',
  '--blog-cyan-500',
  '--blog-blue-400',
  '--blog-blue-700',
  '--blog-warn-800',
]

const { isDark } = useTheme()

const chartRef = ref<HTMLElement | null>(null)
const rangeGroupRef = ref<HTMLElement | null>(null)
const rangeThumbReady = ref(false)
const rangeThumbStyle = ref({
  width: '0px',
  transform: 'translateX(0px)',
})
const rangeBtnRefs = new Map<CheckinDayOption, HTMLButtonElement>()
const items = ref<CheckinItem[]>([])
const records = ref<Record<string, number[]>>({})
const selectedIds = ref<number[]>([])
const chartDays = ref<CheckinDayOption>(DEFAULT_CHECKIN_DAYS)
const chartDates = ref<string[]>([])
const chartSeries = ref<CheckinSeries[]>([])
const today = ref('')
const todayItemIds = ref<number[]>([])
const pending = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveMessage = ref('')
const saveError = ref(false)

let chart: echarts.ECharts | null = null

const checkedInToday = computed(() => {
  return items.value.length > 0
    && items.value.every(item => todayItemIds.value.includes(item.id))
})

const hasNewSelection = computed(() => {
  const locked = new Set(todayItemIds.value)
  return selectedIds.value.some(id => !locked.has(id))
})

const saveButtonLabel = computed(() => {
  if (saving.value)
    return '保存中...'
  if (checkedInToday.value)
    return '已全部签到'
  return '签到'
})

function isCheckedIn(id: number) {
  return todayItemIds.value.includes(id)
}

const todayLabel = computed(() => {
  if (!today.value)
    return ''
  // 日期键已是北京日历日，用 +08:00 锚定后再格式化，避免运行时本地时区影响周几
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
  const weekdayPart = date.toLocaleDateString('en-US', {
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
  const fallbacks = ['#2563eb', '#06b6d4', '#60a5fa', '#4f6ec5', '#92400e']
  return CHART_COLORS.map((name, index) => readCssVar(name, fallbacks[index]))
}

function readStoredChartDays() {
  if (typeof localStorage === 'undefined')
    return DEFAULT_CHECKIN_DAYS

  try {
    return parseCheckinDays(localStorage.getItem(CHECKIN_DAYS_STORAGE_KEY))
  }
  catch {
    return DEFAULT_CHECKIN_DAYS
  }
}

function storeChartDays(days: CheckinDayOption) {
  if (typeof localStorage === 'undefined')
    return

  try {
    localStorage.setItem(CHECKIN_DAYS_STORAGE_KEY, String(days))
  }
  catch {
    // ignore
  }
}

function setRangeBtnRef(option: CheckinDayOption, el: Element | ComponentPublicInstance | null) {
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
  const chart = buildCumulativeSeries({
    items: items.value,
    records: records.value,
  }, chartDays.value)

  chartDates.value = chart.dates
  chartSeries.value = chart.series
}

function setChartDays(days: CheckinDayOption) {
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

  chart.setOption({
    color: colors,
    tooltip: {
      trigger: 'axis',
      backgroundColor: readCssVar('--blog-white', '#ffffff'),
      borderColor: axisLineColor,
      textStyle: { color: textColor },
    },
    legend: {
      top: 0,
      textStyle: { color: textColor },
    },
    grid: {
      top: 48,
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
      minInterval: 1,
      axisLine: { show: false },
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: splitLineColor } },
    },
    series: chartSeries.value.map((item, index) => ({
      name: item.label,
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      data: item.values,
      color: colors[index % colors.length],
    })),
  }, true)
}

async function loadCheckin() {
  pending.value = true
  loadError.value = ''

  try {
    const data = await $fetch<CheckinResponse>('/api/checkin')
    items.value = data.items
    records.value = data.records
    today.value = data.today
    todayItemIds.value = [...data.todayItemIds]
    selectedIds.value = [...data.todayItemIds]
    updateChartData()
    await nextTick()
    renderChart()
    await nextTick()
    updateRangeThumb()
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载签到数据失败'
  }
  finally {
    pending.value = false
  }
}

async function saveCheckin() {
  if (checkedInToday.value || !hasNewSelection.value)
    return

  saveMessage.value = ''
  saveError.value = false
  saving.value = true

  try {
    await $fetch('/api/checkin/save', {
      method: 'POST',
      body: {
        itemIds: selectedIds.value,
      },
    })

    saveMessage.value = '签到已保存'
    await loadCheckin()
  }
  catch (error) {
    saveMessage.value = error instanceof Error ? error.message : '保存失败'
    saveError.value = true
  }
  finally {
    saving.value = false
  }
}

function handleResize() {
  updateRangeThumb()
  chart?.resize()
}

onMounted(() => {
  chartDays.value = readStoredChartDays()
  loadCheckin()
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
.checkin-panel {
  margin-top: 16px;
}

.checkin-body {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 0;
}

.checkin-form {
  padding: 16px;
  border-right: 1px solid var(--blog-slate-200);
}

.checkin-form-head {
  margin-bottom: 12px;
}

.checkin-date {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--blog-slate-800);
}

.checkin-message {
  margin: 8px 0 0;
  font-size: 0.82rem;
  color: var(--blog-blue-600);
}

.checkin-message--error {
  color: var(--blog-danger-700);
}

.checkin-loading,
.checkin-error {
  font-size: 0.9rem;
  color: var(--blog-slate-500);
}

.checkin-error {
  color: var(--blog-danger-700);
}

.checkin-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.checkin-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.92rem;
  color: var(--blog-slate-700);
  cursor: pointer;
}

.checkin-item--locked {
  cursor: default;
  opacity: 0.85;
  color: var(--blog-slate-500);
}

.checkin-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--blog-blue-600);
}

.checkin-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.checkin-save-btn {
  padding: 8px 16px;
  border: 1px solid var(--blog-blue-200);
  border-radius: 10px;
  background: var(--blog-blue-50);
  color: var(--blog-blue-700);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.checkin-save-btn:hover:not(:disabled) {
  background: var(--blog-blue-100);
  border-color: var(--blog-blue-300);
}

.checkin-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.checkin-chart-wrap {
  min-height: 280px;
  padding: 12px 16px 16px;
}

.checkin-chart-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.checkin-range-group {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--blog-slate-200);
  border-radius: 10px;
  background: var(--blog-slate-100);
}

.checkin-range-thumb {
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

.checkin-range-group--ready .checkin-range-thumb {
  opacity: 1;
}

.checkin-range-btn {
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

.checkin-range-btn:hover:not(.checkin-range-btn--active) {
  color: var(--blog-slate-700);
}

.checkin-range-btn--active {
  color: var(--blog-slate-800);
  font-weight: 600;
}

.checkin-range-btn:focus-visible {
  outline: 2px solid var(--blog-blue-200);
  outline-offset: 1px;
}

.checkin-chart-wrap--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--blog-slate-500);
  font-size: 0.9rem;
}

.checkin-chart {
  width: 100%;
  height: 280px;
}

@media (max-width: 900px) {
  .checkin-body {
    grid-template-columns: 1fr;
  }

  .checkin-form {
    border-right: 0;
    border-bottom: 1px solid var(--blog-slate-200);
  }
}
</style>
