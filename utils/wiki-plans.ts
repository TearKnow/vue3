export type WikiPlanStatus = 'active' | 'completed'

export interface WikiPlan {
  id: string
  text: string
  status: WikiPlanStatus
  createdAt: string
  completedAt?: string
}

export interface WikiPlanInput {
  id: string
  text: string
  status: WikiPlanStatus
  createdAt?: string
  completedAt?: string
}

export interface WikiPlansFile {
  plans: WikiPlan[]
  updatedAt: string
}

export interface WikiPlansResponse extends WikiPlansFile {
  version: string
}

const MAX_PLANS = 200
const MAX_TEXT_LENGTH = 200
const PLAN_ID_PATTERN = /^[\w-]{8,80}$/
const BEIJING_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isPlanStatus(value: unknown): value is WikiPlanStatus {
  return value === 'active' || value === 'completed'
}

function isBeijingTimestamp(value: unknown): value is string {
  return typeof value === 'string' && BEIJING_TIMESTAMP_PATTERN.test(value)
}

function readPlanInput(value: unknown): WikiPlanInput | null {
  if (!isRecord(value))
    return null

  const id = typeof value.id === 'string' ? value.id.trim() : ''
  const text = typeof value.text === 'string' ? value.text.trim() : ''
  if (!PLAN_ID_PATTERN.test(id) || !text || text.length > MAX_TEXT_LENGTH || !isPlanStatus(value.status))
    return null

  return {
    id,
    text,
    status: value.status,
    createdAt: isBeijingTimestamp(value.createdAt) ? value.createdAt : undefined,
    completedAt: isBeijingTimestamp(value.completedAt) ? value.completedAt : undefined,
  }
}

export function normalizeWikiPlansFile(value: unknown): WikiPlansFile {
  if (!isRecord(value))
    return { plans: [], updatedAt: '' }

  const seen = new Set<string>()
  const plans: WikiPlan[] = []
  const candidates = Array.isArray(value.plans) ? value.plans : []

  for (const candidate of candidates.slice(0, MAX_PLANS)) {
    const plan = readPlanInput(candidate)
    if (!plan?.createdAt || seen.has(plan.id))
      continue
    if (plan.status === 'completed' && !plan.completedAt)
      continue

    seen.add(plan.id)
    plans.push({
      id: plan.id,
      text: plan.text,
      status: plan.status,
      createdAt: plan.createdAt,
      ...(plan.status === 'completed' ? { completedAt: plan.completedAt } : {}),
    })
  }

  return {
    plans,
    updatedAt: isBeijingTimestamp(value.updatedAt) ? value.updatedAt : '',
  }
}

export function prepareWikiPlansSave(
  existing: WikiPlansFile,
  incoming: unknown,
  now: string,
): WikiPlansFile {
  if (!isBeijingTimestamp(now))
    throw new Error('计划更新时间无效')
  if (!Array.isArray(incoming))
    throw new Error('计划列表必须为数组')
  if (incoming.length > MAX_PLANS)
    throw new Error(`计划数量不能超过 ${MAX_PLANS} 项`)

  const parsed: WikiPlanInput[] = []
  const seen = new Set<string>()
  for (const candidate of incoming) {
    const plan = readPlanInput(candidate)
    if (!plan)
      throw new Error(`计划内容无效，文本不能为空且不能超过 ${MAX_TEXT_LENGTH} 字`)
    if (seen.has(plan.id))
      throw new Error('计划 ID 不能重复')
    seen.add(plan.id)
    parsed.push(plan)
  }

  const incomingIds = new Set(parsed.map(plan => plan.id))
  if (existing.plans.some(plan => !incomingIds.has(plan.id)))
    throw new Error('不能删除已有计划，请将其标记为已完成')

  const existingById = new Map(existing.plans.map(plan => [plan.id, plan]))
  const plans: WikiPlan[] = parsed.map((input) => {
    const previous = existingById.get(input.id)
    const createdAt = previous?.createdAt || now

    if (input.status === 'completed') {
      return {
        id: input.id,
        text: input.text,
        status: 'completed',
        createdAt,
        completedAt: previous?.status === 'completed' && previous.completedAt
          ? previous.completedAt
          : now,
      }
    }

    return {
      id: input.id,
      text: input.text,
      status: 'active',
      createdAt,
    }
  })

  return { plans, updatedAt: now }
}

export function mergeMissingWikiPlanInputs(
  local: WikiPlanInput[],
  remote: WikiPlan[],
): WikiPlanInput[] {
  const localIds = new Set(local.map(plan => plan.id))
  return [
    ...local.map(plan => ({ ...plan })),
    ...remote
      .filter(plan => !localIds.has(plan.id))
      .map(plan => ({ ...plan })),
  ]
}

export function serializeWikiPlansFile(data: WikiPlansFile): string {
  return `${JSON.stringify(data, null, 2)}\n`
}
