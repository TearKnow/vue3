export const WEIGHT_DAY_OPTIONS = [30, 60, 90] as const
export const DEFAULT_WEIGHT_DAYS = 30

export type WeightDayOption = typeof WEIGHT_DAY_OPTIONS[number]

export interface WeightData {
  records: Record<string, number>
}

export interface WeightChartData {
  dates: string[]
  values: (number | null)[]
}

export function parseWeightDays(value: unknown, fallback = DEFAULT_WEIGHT_DAYS): WeightDayOption {
  const days = Number(value)
  return WEIGHT_DAY_OPTIONS.includes(days as WeightDayOption)
    ? days as WeightDayOption
    : fallback
}

import { buildBeijingRecentDateKeys } from './beijing-time'

export function buildWeightSeries(data: WeightData, days: WeightDayOption = DEFAULT_WEIGHT_DAYS): WeightChartData {
  const dates = buildBeijingRecentDateKeys(days)
  const values = dates.map(date => {
    const val = data.records[date]
    return val !== undefined ? val : null
  })

  return { dates, values }
}
