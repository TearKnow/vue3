import { getTodayDateString } from '../../../utils/beijing-time'
import type { WeightData } from '../../../utils/weight-chart'
import {
  loadWeightData,
  writeWeightFile,
} from '../../utils/weight'
import { assertWikiPassword } from '../../utils/wiki-github'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { weight, personId, date, note, password } = body || {}

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

  const { data, sha } = await loadWeightData({ needRemoteSha: true })

  const validIds = new Set(data.people.map(p => p.id))
  if (!validIds.has(pid)) {
    throw createError({ statusCode: 400, statusMessage: `成员 ID ${pid} 不存在` })
  }

  const roundedWeight = Math.round(weightNum * 10) / 10
  const personLabel = data.people.find(p => p.id === pid)?.label || `ID:${pid}`
  const trimmedNote = typeof note === 'string' ? note.trim() : ''

  const nextData: WeightData = {
    people: data.people,
    records: {
      ...data.records,
      [targetDate]: {
        ...(data.records[targetDate] || {}),
        [String(pid)]: roundedWeight,
      },
    },
    notes: {
      ...data.notes,
    },
  }

  // 更新备注
  if (trimmedNote) {
    nextData.notes[targetDate] = {
      ...(data.notes[targetDate] || {}),
      [String(pid)]: trimmedNote,
    }
  }
  else if (data.notes[targetDate]) {
    // 空备注则删除该人当天的备注
    const dayNotes = { ...data.notes[targetDate] }
    const pidStr = String(pid)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete dayNotes[pidStr]
    if (Object.keys(dayNotes).length > 0) {
      nextData.notes[targetDate] = dayNotes
    }
    else {
      const { [targetDate]: _remove, ...restNotes } = nextData.notes
      nextData.notes = restNotes as Record<string, Record<string, string>>
    }
  }

  const commitNote = trimmedNote ? ` (${trimmedNote})` : ''
  await writeWeightFile(nextData, sha, `weight: ${targetDate} ${personLabel} ${roundedWeight}kg${commitNote}`)

  return {
    success: true,
    date: targetDate,
    personId: pid,
    weight: roundedWeight,
    note: trimmedNote || undefined,
  }
})
