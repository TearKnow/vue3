export const CHECKIN_DAY_OPTIONS = [30, 60, 90] as const
export const DEFAULT_CHECKIN_DAYS = 30

export type CheckinDayOption = typeof CHECKIN_DAY_OPTIONS[number]

export interface CheckinItem {
  id: number
  label: string
}

export interface CheckinData {
  items: CheckinItem[]
  records: Record<string, number[]>
}

export interface CheckinSeries {
  id: number
  label: string
  values: number[]
}

export interface CheckinChartData {
  dates: string[]
  series: CheckinSeries[]
}

export function parseCheckinDays(value: unknown, fallback = DEFAULT_CHECKIN_DAYS): CheckinDayOption {
  const days = Number(value)
  return CHECKIN_DAY_OPTIONS.includes(days as CheckinDayOption)
    ? days as CheckinDayOption
    : fallback
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function buildRecentDates(days: CheckinDayOption, endDate = new Date()) {
  const dates: string[] = []
  const cursor = new Date(endDate)
  cursor.setHours(0, 0, 0, 0)

  for (let i = days - 1; i >= 0; i -= 1) {
    const current = new Date(cursor)
    current.setDate(cursor.getDate() - i)
    dates.push(formatDate(current))
  }

  return dates
}

export function buildCumulativeSeries(data: CheckinData, days: CheckinDayOption = DEFAULT_CHECKIN_DAYS): CheckinChartData {
  const dates = buildRecentDates(days)
  const startDate = dates[0]

  const series = data.items.map((item) => {
    let cumulative = 0
    const values = dates.map((date) => {
      if (date < startDate)
        return cumulative

      const checked = (data.records[date] || []).includes(item.id)
      if (checked)
        cumulative += 1
      return cumulative
    })

    return {
      id: item.id,
      label: item.label,
      values,
    }
  })

  return { dates, series }
}
