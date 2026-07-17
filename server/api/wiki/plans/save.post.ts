import { formatBeijingDateTime } from '../../../../utils/beijing-time'
import { prepareWikiPlansSave } from '../../../../utils/wiki-plans'
import { assertWikiPassword } from '../../../utils/wiki-github'
import { loadWikiPlansFile, writeWikiPlansFile } from '../../../utils/wiki-plans'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { password, plans, version } = body || {}

  if (typeof password !== 'string' || !password) {
    throw createError({ statusCode: 400, statusMessage: '请输入密码' })
  }
  if (!Array.isArray(plans)) {
    throw createError({ statusCode: 400, statusMessage: '计划列表必须为数组' })
  }

  assertWikiPassword(password)

  const current = await loadWikiPlansFile()
  if (String(version || '') !== current.sha) {
    throw createError({
      statusCode: 409,
      statusMessage: '计划已在其他设备更新，请重新加载',
    })
  }

  let next
  try {
    next = prepareWikiPlansSave(
      current.data,
      plans,
      formatBeijingDateTime(),
    )
  }
  catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : '计划内容无效',
    })
  }

  const nextVersion = await writeWikiPlansFile(next, current.sha)
  return {
    ...next,
    version: nextVersion,
  }
})
