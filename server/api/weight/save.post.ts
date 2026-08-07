import {
  getTodayDateString,
  loadWeightData,
  writeWeightFile,
} from '../../utils/weight'
import { assertWikiPassword } from '../../utils/wiki-github'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { weight, personId, date, password } = body || {}

  assertWikiPassword(password || '')

  const weightNum = Number(weight)
  if (!Number.isFinite(weightNum) || weightNum <= 0 || weightNum > 500) {
    throw createError({ statusCode: 400, statusMessage: '请输入有效的体重值（0-500 kg）' })
  }

  const pid = Number(personId)
  if (!Number.isInteger(pid) || pid <= 0) {
    throw createError({ statusCode: 400, statusMessage: '请指定有效的成员' })
  }

  const targetDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? date
    : getTodayDateString()

  const { data, sha } = await loadWeightData()

  const validIds = new Set(data.people.map(p => p.id))
  if (!validIds.has(pid)) {
    throw createError({ statusCode: 400, statusMessage: `成员 ID ${pid} 不存在` })
  }

  const roundedWeight = Math.round(weightNum * 10) / 10
  const personLabel = data.people.find(p => p.id === pid)?.label || `ID:${pid}`

  const nextData = {
    people: data.people,
    records: {
      ...data.records,
      [targetDate]: {
        ...(data.records[targetDate] || {}),
        [String(pid)]: roundedWeight,
      },
    },
  }

  await writeWeightFile(nextData, sha, `weight: ${targetDate} ${personLabel} ${roundedWeight}kg`)

  return {
    success: true,
    date: targetDate,
    personId: pid,
    weight: roundedWeight,
  }
})
