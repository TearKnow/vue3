/** 项目统一业务时区：北京时间（无夏令时） */
export const BEIJING_TIME_ZONE = 'Asia/Shanghai'

export interface BeijingDateParts {
  year: number
  /** 0–11，与 `Date#getMonth` 一致 */
  month: number
  date: number
}

export function getBeijingDateParts(date: Date = new Date()): BeijingDateParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find(part => part.type === type)?.value)

  return {
    year: read('year'),
    month: read('month') - 1,
    date: read('day'),
  }
}

/** 北京日历日，格式 YYYY-MM-DD */
export function formatBeijingDate(date: Date = new Date()): string {
  const { year, month, date: day } = getBeijingDateParts(date)
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getTodayDateString(date: Date = new Date()): string {
  return formatBeijingDate(date)
}

/** 北京时间戳，格式 YYYY-MM-DDTHH:mm:ss+08:00 */
export function formatBeijingDateTime(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value || ''

  return `${read('year')}-${read('month')}-${read('day')}T${read('hour')}:${read('minute')}:${read('second')}+08:00`
}

/**
 * 以北京日历日为终点，向前生成连续日期键（YYYY-MM-DD）。
 * 中国无夏令时，按固定 24h 步进日历日安全。
 */
export function buildBeijingRecentDateKeys(days: number, endDate: Date = new Date()): string[] {
  const endKey = formatBeijingDate(endDate)
  const [y, m, d] = endKey.split('-').map(Number)
  const endUtc = Date.UTC(y, m - 1, d)
  const keys: string[] = []

  for (let i = days - 1; i >= 0; i -= 1) {
    const current = new Date(endUtc - i * 24 * 60 * 60 * 1000)
    const year = current.getUTCFullYear()
    const month = String(current.getUTCMonth() + 1).padStart(2, '0')
    const day = String(current.getUTCDate()).padStart(2, '0')
    keys.push(`${year}-${month}-${day}`)
  }

  return keys
}
