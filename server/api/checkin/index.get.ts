import {
  getTodayDateString,
  loadCheckinData,
} from '../../utils/checkin'

export default defineEventHandler(async () => {
  const { data } = await loadCheckinData()
  const today = getTodayDateString()

  const todayItemIds = data.records[today] || []
  const checkedInToday = data.items.length > 0
    && data.items.every(item => todayItemIds.includes(item.id))

  return {
    items: data.items,
    records: data.records,
    today,
    todayItemIds,
    checkedInToday,
  }
})
