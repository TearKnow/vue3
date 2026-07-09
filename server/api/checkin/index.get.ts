import {
  getTodayDateString,
  loadCheckinData,
} from '../../utils/checkin'

export default defineEventHandler(async () => {
  const { data } = await loadCheckinData()
  const today = getTodayDateString()

  return {
    items: data.items,
    records: data.records,
    today,
    todayItemIds: data.records[today] || [],
    checkedInToday: Object.prototype.hasOwnProperty.call(data.records, today),
  }
})
