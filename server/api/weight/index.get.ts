import {
  getTodayDateString,
  loadWeightData,
} from '../../utils/weight'
import { assertWikiPassword } from '../../utils/wiki-github'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const password = typeof query.password === 'string' ? query.password : ''

  assertWikiPassword(password)

  const { data } = await loadWeightData()
  const today = getTodayDateString()
  const todayRecord = data.records[today] || {}

  return {
    people: data.people,
    records: data.records,
    today,
    todayRecord,
  }
})
