import {
  getTodayDateString,
  loadWeightData,
} from '../../utils/weight'

export default defineEventHandler(async () => {
  const { data } = await loadWeightData()
  const today = getTodayDateString()
  const todayWeight = data.records[today] ?? null

  return {
    records: data.records,
    today,
    todayWeight,
  }
})
