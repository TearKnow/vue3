<template>
  <div class="action-group weight-panel">
    <h3 class="action-group-title">
      体重记录
    </h3>
    <div class="weight-body">
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
          <div class="weight-input-row">
            <input
              v-model="weightInput"
              class="weight-input"
              type="number"
              inputmode="decimal"
              step="0.1"
              min="0"
              max="500"
              placeholder="输入体重"
              :disabled="saving"
              @keyup.enter="saveWeight"
            >
            <span class="weight-unit">kg</span>
          </div>

          <div class="weight-actions">
            <button
              type="button"
              class="weight-save-btn"
              :disabled="saving || !canSave"
              @click="saveWeight"
            >
              {{ saveButtonLabel }}
            </button>
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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComponentPublicInstance } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useTheme } from '~/composables/useTheme'
import {
  buildWeightSeries,
  WEIGHT_DAY_OPTIONS,
  DEFAULT_WEIGHT_DAYS,
  type WeightDayOption,
  type WeightChartData,
  parseWeightDays,
} from '~/utils/weight-chart'

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])

const WEIGHT_DAYS_STORAGE_KEY = 'weight-chart-days'
const dayOptions = [...WEIGHT_DAY_OPTIONS]

interface WeightResponse {
  records: Record<string, number>
  today: string
  todayWeight: number | null
}

const { isDark } = useTheme()

const chartRef = ref<HTMLElement | null>(null)
const rangeGroupRef = ref<HTMLElement | null>(null)
const rangeThumbReady = ref(false)
const rangeThumbStyle = ref({
  width: '0px',
  transform: 'translateX(0px)',
})
const rangeBtnRefs = new Map<WeightDayOption, HTMLButtonElement>()
const records = ref<Record<string, number>>({})
const weightInput = ref('')
const chartDays = ref<WeightDayOption>(DEFAULT_WEIGHT_DAYS)
const chartDates = ref<string[]>([])
const chartValues = ref<(number | null)[]>([])
const today = ref('')
const todayWeight = ref<number | null>(null)
const pending = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveMessage = ref('')
const saveError = ref(false)

let chart: echarts.ECharts | null = null

const canSave = computed(() => {
  const val = Number.parseFloat(weightInput.value)
  return Number.isFinite(val) && val > 0 && val <= 500
})

const saveButtonLabel = computed(() => {
  if (saving.value)
    return '保存中...'
  if (todayWeight.value !== null)
    return '更新体重'
  return '记录体重'
})

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
  const chart = buildWeightSeries({ records: records.value }, chartDays.value)
  chartDates.value = chart.dates
  chartValues.value = chart.values
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
  const lineColor = readCssVar('--blog-blue-600', '#2563eb')
  const areaColorTop = readCssVar('--blog-blue-200', '#bfdbfe')
  const areaColorBottom = readCssVar('--blog-white', '#ffffff')

  // Filter out null values for min/max calculation
  const validValues = chartValues.value.filter((v): v is number => v !== null)
  const yMin = validValues.length > 0 ? Math.floor(Math.min(...validValues) - 2) : 40
  const yMax = validValues.length > 0 ? Math.ceil(Math.max(...validValues) + 2) : 100

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      backgroundColor: readCssVar('--blog-white', '#ffffff'),
      borderColor: axisLineColor,
      textStyle: { color: textColor },
      formatter: (params: any) => {
        const item = Array.isArray(params) ? params[0] : params
        if (!item || item.value == null)
          return ''
        const date = chartDates.value[item.dataIndex]
        return `${date}<br/>体重: <b>${item.value} kg</b>`
      },
    },
    grid: {
      top: 16,
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
    series: [{
      name: '体重',
      type: 'line',
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: lineColor },
      itemStyle: { color: lineColor },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: areaColorTop },
          { offset: 1, color: areaColorBottom },
        ]),
      },
      connectNulls: false,
      data: chartValues.value,
    }],
  }, true)
}

async function loadWeight() {
  pending.value = true
  loadError.value = ''

  try {
    const data = await $fetch<WeightResponse>('/api/weight')
    records.value = data.records
    today.value = data.today
    todayWeight.value = data.todayWeight

    if (data.todayWeight !== null) {
      weightInput.value = String(data.todayWeight)
    }

    updateChartData()
    await nextTick()
    renderChart()
    await nextTick()
    updateRangeThumb()
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载体重数据失败'
  }
  finally {
    pending.value = false
  }
}

async function saveWeight() {
  if (!canSave.value)
    return

  saveMessage.value = ''
  saveError.value = false
  saving.value = true

  try {
    const weight = Number.parseFloat(weightInput.value)
    await $fetch('/api/weight/save', {
      method: 'POST',
      body: { weight },
    })

    saveMessage.value = '体重已保存'
    await loadWeight()
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
  loadWeight()
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

watch([chartDates, chartValues], () => {
  renderChart()
}, { deep: true })
</script>

<style scoped>
.weight-panel {
  margin-top: 16px;
}

.weight-body {
  display: grid;
  grid-template-columns: minmax(200px, 260px) minmax(0, 1fr);
  gap: 0;
}

.weight-form {
  padding: 16px;
  border-right: 1px solid var(--blog-slate-200);
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

.weight-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weight-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--blog-slate-300);
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--blog-slate-800);
  background: var(--blog-white);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  -moz-appearance: textfield;
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
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--blog-slate-500);
  white-space: nowrap;
}

.weight-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.weight-save-btn {
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
  padding: 12px 16px 16px;
}

.weight-chart-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 10px;
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
    grid-template-columns: 1fr;
  }

  .weight-form {
    border-right: 0;
    border-bottom: 1px solid var(--blog-slate-200);
  }
}
</style>
