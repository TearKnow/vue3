import { buildBeijingRecentDateKeys } from './beijing-time'

export const WEIGHT_DAY_OPTIONS = [30, 60, 90] as const
export const DEFAULT_WEIGHT_DAYS = 30

export type WeightDayOption = typeof WEIGHT_DAY_OPTIONS[number]

export interface WeightPerson {
  id: number
  label: string
}

export interface WeightData {
  people: WeightPerson[]
  records: Record<string, Record<string, number>> // date -> { personId: weight }
}

export interface WeightSeriesItem {
  id: number
  label: string
  values: (number | null)[]
}

export interface WeightChartData {
  dates: string[]
  series: WeightSeriesItem[]
}

export function parseWeightDays(value: unknown, fallback = DEFAULT_WEIGHT_DAYS): WeightDayOption {
  const days = Number(value)
  return WEIGHT_DAY_OPTIONS.includes(days as WeightDayOption)
    ? days as WeightDayOption
    : fallback
}

export function buildWeightSeries(data: WeightData, days: WeightDayOption = DEFAULT_WEIGHT_DAYS): WeightChartData {
  const dates = buildBeijingRecentDateKeys(days)

  const series = data.people.map((person) => {
    const values = dates.map(date => {
      const dayRecord = data.records[date]
      if (!dayRecord)
        return null
      const val = dayRecord[String(person.id)]
      return val !== undefined && Number.isFinite(val) ? val : null
    })

    // forward fill：空缺日期取最近一次有效值向右填充，让曲线连续
    let lastValid: number | null = null
    for (let i = 0; i < values.length; i++) {
      if (values[i] !== null) {
        lastValid = values[i]
      }
      else if (lastValid !== null) {
        values[i] = lastValid
      }
    }

    return {
      id: person.id,
      label: person.label,
      values,
    }
  })

  return { dates, series }
}
