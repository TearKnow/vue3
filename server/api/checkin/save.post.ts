import {
  getTodayDateString,
  loadCheckinData,
  sanitizeCheckinSave,
  writeCheckinFile,
} from '../../utils/checkin'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { date, itemIds } = body || {}

  if (!Array.isArray(itemIds)) {
    throw createError({ statusCode: 400, statusMessage: 'itemIds 必须为数组' })
  }

  const targetDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : getTodayDateString()

  const { data, sha } = await loadCheckinData()

  if (Object.prototype.hasOwnProperty.call(data.records, targetDate)) {
    throw createError({ statusCode: 409, statusMessage: '今日已签到' })
  }

  const nextData = sanitizeCheckinSave(data, targetDate, itemIds)

  await writeCheckinFile(nextData, sha, `checkin: ${targetDate}`)

  return {
    success: true,
    date: targetDate,
    itemIds: nextData.records[targetDate] || [],
  }
})
