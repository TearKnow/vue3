import {
  getNewCheckinItemIds,
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
  const newItemIds = getNewCheckinItemIds(data, targetDate, itemIds)

  if (newItemIds.length === 0) {
    const existing = data.records[targetDate] || []
    const allDone = data.items.length > 0 && data.items.every(item => existing.includes(item.id))
    throw createError({
      statusCode: 409,
      statusMessage: allDone ? '今日项目已全部签到' : '请选择尚未签到的项目',
    })
  }

  const nextData = sanitizeCheckinSave(data, targetDate, itemIds)

  await writeCheckinFile(nextData, sha, `checkin: ${targetDate}`)

  return {
    success: true,
    date: targetDate,
    itemIds: nextData.records[targetDate] || [],
  }
})
