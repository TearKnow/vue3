import { getTodayDateString } from './beijing-time.ts'

export interface EnglishStudyStats {
  checkedInToday: boolean
  currentStreak: number
  bestStreak: number
}

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function shiftDateKey(dateKey: string, deltaDays: number) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day)
  const next = new Date(utc + deltaDays * 24 * 60 * 60 * 1000)
  const y = next.getUTCFullYear()
  const m = String(next.getUTCMonth() + 1).padStart(2, '0')
  const d = String(next.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getCheckedDateSet(records: Record<string, unknown>) {
  const checkedDates = new Set<string>()
  for (const [date, checked] of Object.entries(records || {})) {
    if (isValidDateKey(date) && checked === true)
      checkedDates.add(date)
  }
  return checkedDates
}

function countBackwardConsecutiveDays(checkedDates: Set<string>, anchorDate: string) {
  let streak = 0
  let cursor = anchorDate
  while (checkedDates.has(cursor)) {
    streak += 1
    cursor = shiftDateKey(cursor, -1)
  }
  return streak
}

function getBestStreak(checkedDates: Set<string>) {
  if (checkedDates.size === 0)
    return 0

  const sorted = [...checkedDates].sort()
  let best = 1
  let current = 1
  for (let i = 1; i < sorted.length; i += 1) {
    const expected = shiftDateKey(sorted[i - 1], 1)
    if (sorted[i] === expected)
      current += 1
    else
      current = 1

    if (current > best)
      best = current
  }
  return best
}

export function calculateEnglishStudyStats(records: Record<string, unknown>, today = getTodayDateString()): EnglishStudyStats {
  const checkedDates = getCheckedDateSet(records)
  const checkedInToday = checkedDates.has(today)
  const yesterday = shiftDateKey(today, -1)

  const currentStreak = checkedInToday
    ? countBackwardConsecutiveDays(checkedDates, today)
    : (checkedDates.has(yesterday) ? countBackwardConsecutiveDays(checkedDates, yesterday) : 0)

  return {
    checkedInToday,
    currentStreak,
    bestStreak: getBestStreak(checkedDates),
  }
}
