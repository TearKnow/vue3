<template>
  <div class="action-group english-study-panel">
    <h3 class="action-group-title">
      英文学习打卡
    </h3>
    <div class="english-study-body">
      <div class="english-study-head">
        <p class="english-study-date">
          {{ todayLabel }}
        </p>
        <p class="english-study-quote">
          Whether you do it or not — the choice is yours.
        </p>
      </div>

      <div v-if="loadError" class="english-study-error">
        {{ loadError }}
      </div>
      <template v-else>
        <div class="english-study-main" :aria-busy="pending">
          <div class="english-study-stats-grid">
            <div class="english-study-stat-card">
              <p class="english-study-stat-label">
                当前连续
              </p>
              <p class="english-study-stat-value">
                <span class="english-study-streak-icon">🔥</span>{{ currentStreak }} 天
              </p>
            </div>
            <div class="english-study-stat-card">
              <p class="english-study-stat-label">
                历史最长
              </p>
              <p class="english-study-stat-value">
                {{ bestStreak }} 天
              </p>
            </div>
          </div>

          <div class="english-study-week">
            <p class="english-study-week-title">
              本周
            </p>
            <div class="english-study-week-list">
              <div
                v-for="item in recentWeek"
                :key="item.date"
                class="english-study-day"
                :class="{
                  'english-study-day--checked': item.checked,
                  'english-study-day--missed': item.missed,
                  'english-study-day--today': item.isToday,
                }"
              >
                <span class="english-study-day-week">{{ item.weekday }}</span>
                <span class="english-study-day-dot" />
                <span class="english-study-day-date">{{ item.shortDate }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="english-study-actions">
          <button
            type="button"
            class="english-study-save-btn"
            :disabled="pending || saving || checkedInToday"
            @click="saveCheckin"
          >
            {{ saveButtonLabel }}
          </button>
        </div>
      </template>

      <p v-if="saveMessage" class="english-study-message" :class="{ 'english-study-message--error': saveError }">
        {{ saveMessage }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { getTodayDateString } from '~/utils/beijing-time'

interface EnglishStudyResponse {
  records: Record<string, boolean>
  today: string
  checkedInToday: boolean
  currentStreak: number
  bestStreak: number
}

function emptyEnglishStudy(): EnglishStudyResponse {
  return {
    records: {},
    today: getTodayDateString(),
    checkedInToday: false,
    currentStreak: 0,
    bestStreak: 0,
  }
}

// lazy 会先空态再填数，线上首屏容易「闪一下」；首页用阻塞拉取保证 SSR 带真实数据
const {
  data,
  pending,
  error,
  refresh,
} = await useAsyncData('home-english-study', () => $fetch<EnglishStudyResponse>('/api/english-study'), {
  default: emptyEnglishStudy,
})

const study = computed(() => data.value || emptyEnglishStudy())
const today = computed(() => study.value.today || getTodayDateString())
const records = computed(() => study.value.records || {})
const checkedInToday = computed(() => Boolean(study.value.checkedInToday))
const currentStreak = computed(() => study.value.currentStreak || 0)
const bestStreak = computed(() => study.value.bestStreak || 0)
const loadError = computed(() => {
  if (!error.value)
    return ''
  return error.value instanceof Error ? error.value.message : '加载英文打卡失败'
})

const saving = ref(false)
const saveMessage = ref('')
const saveError = ref(false)

const saveButtonLabel = computed(() => {
  if (pending.value)
    return '加载中...'
  if (saving.value)
    return '打卡中...'
  if (checkedInToday.value)
    return '今日已打卡'
  return '今日打卡'
})

function shiftDateKey(dateKey: string, deltaDays: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day)
  const next = new Date(utc + deltaDays * 24 * 60 * 60 * 1000)
  const y = next.getUTCFullYear()
  const m = String(next.getUTCMonth() + 1).padStart(2, '0')
  const d = String(next.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const recentWeek = computed(() => {
  if (!today.value)
    return []

  const todayDate = new Date(`${today.value}T12:00:00+08:00`)
  // 周日为一周起点：日 一 二 三 四 五 六
  const sundayOffset = todayDate.getUTCDay()
  const sundayKey = shiftDateKey(today.value, -sundayOffset)

  const keys = Array.from({ length: 7 }, (_, index) => shiftDateKey(sundayKey, index))
  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']

  return keys.map((dateKey) => {
    const date = new Date(`${dateKey}T12:00:00+08:00`)
    const shortDate = dateKey.slice(5)
    const weekday = weekdayLabels[date.getUTCDay()]
    const checked = Boolean(records.value[dateKey])
    const isToday = dateKey === today.value
    const isPast = dateKey < today.value
    return {
      date: dateKey,
      weekday,
      shortDate,
      checked,
      missed: isPast && !checked,
      isToday,
    }
  })
})

const todayLabel = computed(() => {
  if (!today.value)
    return ''

  const [year, month, day] = today.value.split('-').map(Number)
  if (!year || !month || !day)
    return today.value

  const weekdayLabels = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdayLabels[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${year}年${month}月${day}日 周${weekday}`
})

async function saveCheckin() {
  if (checkedInToday.value || pending.value)
    return

  saveMessage.value = ''
  saveError.value = false
  saving.value = true
  try {
    await $fetch('/api/english-study/save', { method: 'POST' })
    saveMessage.value = '今天打卡成功，继续加油！'
    await refresh()
  }
  catch (err) {
    saveMessage.value = err instanceof Error ? err.message : '保存失败'
    saveError.value = true
  }
  finally {
    saving.value = false
  }
}
</script>

<style scoped>
.english-study-panel {
  margin-top: 18px;
  width: 100%;
}

.english-study-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px 14px;
  min-height: 220px;
  box-sizing: border-box;
}

.english-study-main {
  display: grid;
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 12px;
  align-items: stretch;
}

.english-study-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 2.6em;
}

.english-study-date {
  margin: 0;
  min-height: 1.35em;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--blog-slate-800);
}

.english-study-quote {
  margin: 4px 0 0;
  font-size: 0.8rem;
  font-style: italic;
  color: var(--blog-slate-400);
  line-height: 1.4;
}

.english-study-loading,
.english-study-error {
  font-size: 0.9rem;
  color: var(--blog-slate-500);
}

.english-study-error {
  color: var(--blog-danger-700);
}

.english-study-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.english-study-stat-card {
  border-radius: 10px;
  background: var(--blog-blue-50);
  padding: 10px 12px;
}

.english-study-stat-label,
.english-study-stat-value {
  margin: 0;
}

.english-study-stat-label {
  font-size: 0.8rem;
  color: var(--blog-slate-500);
}

.english-study-stat-value {
  margin-top: 4px;
  font-size: 1rem;
  font-weight: 700;
  color: var(--blog-blue-700);
}

.english-study-week {
  border-radius: 10px;
  background: var(--blog-slate-50);
  padding: 10px 12px;
}

.english-study-week-title {
  margin: 0;
  font-size: 0.8rem;
  color: var(--blog-slate-500);
}

.english-study-week-list {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  margin-top: 8px;
}

.english-study-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  border-radius: 8px;
  padding: 5px 1px;
  background: var(--blog-white);
  color: var(--blog-slate-500);
}

.english-study-day--checked {
  background: var(--blog-green-50);
  color: var(--blog-green-700);
}

.english-study-day--missed {
  background: var(--blog-danger-50);
  color: var(--blog-danger-700);
}

.english-study-day--today {
  box-shadow: inset 0 0 0 1px var(--blog-blue-300);
}

.english-study-day-week {
  font-size: 0.68rem;
}

.english-study-day-week::before {
  content: '周';
}

.english-study-day-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--blog-slate-300);
}

.english-study-day--checked .english-study-day-dot {
  background: var(--blog-green-500);
}

.english-study-day--missed .english-study-day-dot {
  background: var(--blog-danger-700);
}

.english-study-day-date {
  font-size: 0.66rem;
}

.english-study-actions {
  display: flex;
  justify-content: center;
}

.english-study-streak-icon {
  margin-right: 4px;
}

.english-study-save-btn {
  min-width: 130px;
  padding: 8px 14px;
  border: 0;
  border-radius: 10px;
  background: var(--blog-blue-600);
  color: var(--blog-white);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, box-shadow 0.15s ease;
}

.english-study-save-btn:hover:not(:disabled) {
  background: var(--blog-blue-700);
  box-shadow: 0 4px 10px var(--blog-shadow-sm);
}

.english-study-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.english-study-message {
  margin: 0;
  font-size: 0.86rem;
  color: var(--blog-blue-600);
}

.english-study-message--error {
  color: var(--blog-danger-700);
}

@media (max-width: 900px) {
  .english-study-main {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .english-study-body {
    gap: 10px;
    padding: 12px;
  }
}

@media (max-width: 640px) {
  .english-study-week-list {
    gap: 4px;
  }

  .english-study-day {
    padding: 6px 0;
  }

  .english-study-day-week::before {
    content: none;
  }
}
</style>
