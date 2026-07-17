import { formatBeijingDateTime } from '../../../../utils/beijing-time'
import {
  applyWikiVisitSync,
  type WikiVisitSyncBatch,
} from '../../../../utils/wiki-visit-counts'
import { assertWikiPassword } from '../../../utils/wiki-github'
import { loadWikiVisitsFile, writeWikiVisitsFile } from '../../../utils/wiki-visits'

const MAX_WRITE_ATTEMPTS = 3

function readErrorStatus(error: unknown): number {
  if (!error || typeof error !== 'object')
    return 0
  const value = error as { statusCode?: number, response?: { status?: number } }
  return value.statusCode || value.response?.status || 0
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { password, id, counts } = body || {}

  if (typeof password !== 'string' || !password)
    throw createError({ statusCode: 400, statusMessage: '请输入密码' })

  assertWikiPassword(password)

  const batch = { id, counts } as WikiVisitSyncBatch
  for (let attempt = 0; attempt < MAX_WRITE_ATTEMPTS; attempt += 1) {
    const current = await loadWikiVisitsFile()
    let next

    try {
      next = applyWikiVisitSync(current.data, batch, formatBeijingDateTime())
    }
    catch (error) {
      throw createError({
        statusCode: 400,
        statusMessage: error instanceof Error ? error.message : '访问统计批次无效',
      })
    }

    if (current.data.appliedSyncIds.includes(batch.id)) {
      return {
        counts: current.data.counts,
        updatedAt: current.data.updatedAt,
      }
    }

    try {
      await writeWikiVisitsFile(next, current.sha)
      return {
        counts: next.counts,
        updatedAt: next.updatedAt,
      }
    }
    catch (error) {
      const status = readErrorStatus(error)
      if ((status === 409 || status === 422) && attempt < MAX_WRITE_ATTEMPTS - 1)
        continue
      if (status === 409 || status === 422) {
        throw createError({
          statusCode: 409,
          statusMessage: '访问统计正在被其他设备更新，请重试',
        })
      }
      throw error
    }
  }

  throw createError({
    statusCode: 409,
    statusMessage: '访问统计正在被其他设备更新，请重试',
  })
})
