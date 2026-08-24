import { getTodayDateString } from '../../../utils/beijing-time'
import { loadEnglishStudyData, markEnglishStudyDone, writeEnglishStudyFile } from '../../utils/english-study'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { date } = body || {}
  const targetDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : getTodayDateString()

  const { data, sha } = await loadEnglishStudyData({ needRemoteSha: true })
  if (data.records[targetDate]) {
    throw createError({ statusCode: 409, statusMessage: '今天已经打卡了，继续保持！' })
  }

  const nextData = markEnglishStudyDone(data, targetDate)
  await writeEnglishStudyFile(nextData, sha, `english-study: ${targetDate}`)

  return {
    success: true,
    date: targetDate,
    checked: true,
  }
})
