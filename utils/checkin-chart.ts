import { buildBeijingRecentDateKeys } from './beijing-time'

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

export function buildRecentDates(days: CheckinDayOption, endDate = new Date()) {
  return buildBeijingRecentDateKeys(days, endDate)
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
