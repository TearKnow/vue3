import { getQuery } from 'h3'
import {
  buildCumulativeSeries,
  getTodayDateString,
  loadCheckinData,
  parseCheckinDays,
} from '../../utils/checkin'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const days = parseCheckinDays(query.days)
  const { data } = await loadCheckinData()
  const today = getTodayDateString()

  return {
    items: data.items,
    records: data.records,
    today,
    todayItemIds: data.records[today] || [],
    checkedInToday: Object.prototype.hasOwnProperty.call(data.records, today),
    chart: buildCumulativeSeries(data, days),
    days,
  }
})
