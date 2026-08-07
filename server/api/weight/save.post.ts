import {
  getTodayDateString,
  loadWeightData,
  writeWeightFile,
} from '../../utils/weight'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { weight, date } = body || {}

  const weightNum = Number(weight)
  if (!Number.isFinite(weightNum) || weightNum <= 0 || weightNum > 500) {
    throw createError({ statusCode: 400, statusMessage: '请输入有效的体重值（0-500 kg）' })
  }

  const targetDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : getTodayDateString()

  const { data, sha } = await loadWeightData()

  const nextData = {
    records: {
      ...data.records,
      [targetDate]: Math.round(weightNum * 10) / 10, // 保留一位小数
    },
  }

  await writeWeightFile(nextData, sha, `weight: ${targetDate} ${nextData.records[targetDate]}kg`)

  return {
    success: true,
    date: targetDate,
    weight: nextData.records[targetDate],
  }
})
