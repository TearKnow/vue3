import assert from 'node:assert/strict'
import test from 'node:test'
import { formatBeijingDateTime } from '../utils/beijing-time.ts'
import {
  mergeMissingWikiPlanInputs,
  normalizeWikiPlansFile,
  prepareWikiPlansSave,
  type WikiPlansFile,
} from '../utils/wiki-plans.ts'

const NOW = '2026-07-17T14:30:45+08:00'

function activeFile(): WikiPlansFile {
  return {
    plans: [{
      id: 'plan_existing',
      text: '完成数组与链表基础整理',
      status: 'active',
      createdAt: '2026-07-16T10:00:00+08:00',
    }],
    updatedAt: '2026-07-16T10:00:00+08:00',
  }
}

test('formatBeijingDateTime formats a UTC instant in Asia/Shanghai', () => {
  assert.equal(
    formatBeijingDateTime(new Date('2026-07-17T06:30:45.000Z')),
    NOW,
  )
})

test('prepareWikiPlansSave rejects removal of an existing plan', () => {
  assert.throws(
    () => prepareWikiPlansSave(activeFile(), [], NOW),
    /不能删除已有计划/,
  )
})

test('prepareWikiPlansSave stamps completion and preserves history', () => {
  const existing = activeFile()
  const saved = prepareWikiPlansSave(existing, [{
    ...existing.plans[0],
    status: 'completed',
  }], NOW)

  assert.equal(saved.plans[0].status, 'completed')
  assert.equal(saved.plans[0].completedAt, NOW)
  assert.equal(saved.updatedAt, NOW)
})

test('prepareWikiPlansSave restores a completed plan', () => {
  const existing: WikiPlansFile = {
    plans: [{
      ...activeFile().plans[0],
      status: 'completed',
      completedAt: '2026-07-17T12:00:00+08:00',
    }],
    updatedAt: '2026-07-17T12:00:00+08:00',
  }
  const saved = prepareWikiPlansSave(existing, [{
    ...existing.plans[0],
    status: 'active',
  }], NOW)

  assert.equal(saved.plans[0].status, 'active')
  assert.equal(saved.plans[0].completedAt, undefined)
})

test('prepareWikiPlansSave stamps new plans and keeps request order', () => {
  const existing = activeFile()
  const saved = prepareWikiPlansSave(existing, [
    {
      id: 'plan_new_item',
      text: '  补充双指针笔记  ',
      status: 'active',
    },
    existing.plans[0],
  ], NOW)

  assert.deepEqual(saved.plans.map(plan => plan.id), ['plan_new_item', 'plan_existing'])
  assert.equal(saved.plans[0].text, '补充双指针笔记')
  assert.equal(saved.plans[0].createdAt, NOW)
})

test('normalizeWikiPlansFile filters invalid and duplicate records', () => {
  const normalized = normalizeWikiPlansFile({
    plans: [
      activeFile().plans[0],
      { ...activeFile().plans[0], text: '重复项' },
      { id: '', text: '无效项', status: 'active' },
    ],
    updatedAt: NOW,
  })

  assert.equal(normalized.plans.length, 1)
  assert.equal(normalized.plans[0].id, 'plan_existing')
})

test('mergeMissingWikiPlanInputs keeps local edits and appends remote additions', () => {
  const existing = activeFile().plans[0]
  const merged = mergeMissingWikiPlanInputs(
    [{ ...existing, text: '本地修改' }],
    [
      existing,
      {
        id: 'plan_remote_new',
        text: '其他设备新增',
        status: 'active',
        createdAt: NOW,
      },
    ],
  )

  assert.deepEqual(merged.map(plan => plan.text), ['本地修改', '其他设备新增'])
})
