import { getTodayDateString } from '../../../utils/beijing-time'
import { calculateEnglishStudyStats } from '../../../utils/english-study-streak'
import { loadEnglishStudyData } from '../../utils/english-study'

export default defineEventHandler(async () => {
  const { data } = await loadEnglishStudyData()
  const today = getTodayDateString()
  const stats = calculateEnglishStudyStats(data.records, today)

  return {
    records: data.records,
    today,
    checkedInToday: stats.checkedInToday,
    currentStreak: stats.currentStreak,
    bestStreak: stats.bestStreak,
  }
})
