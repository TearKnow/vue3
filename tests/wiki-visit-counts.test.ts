import assert from 'node:assert/strict'
import test from 'node:test'
import {
  applyWikiVisitSync,
  completeWikiVisitSyncBatch,
  incrementWikiVisitCount,
  parseWikiVisitCounts,
  prepareWikiVisitSyncBatch,
  readWikiVisitCounts,
  recordWikiVisit,
  selectFrequentWikiPages,
  serializeWikiVisitsFile,
  type WikiVisitsFile,
} from '../utils/wiki-visit-counts.ts'

const pages = [
  { _path: '/wiki/algorithm/start', title: '目标', date: '2026-07-01' },
  { _path: '/wiki/algorithm/cycle-array', title: '环形数组', date: '2026-07-16' },
  { _path: '/wiki/vue/reactivity', title: '响应式', date: '2026-07-10' },
]

test('parseWikiVisitCounts returns empty data for invalid JSON', () => {
  assert.deepEqual(parseWikiVisitCounts('{invalid'), {})
})

test('parseWikiVisitCounts keeps only wiki paths with non-negative integer counts', () => {
  assert.deepEqual(parseWikiVisitCounts(JSON.stringify({
    '/wiki/algorithm/start': 3,
    '/wiki/algorithm/cycle-array': -1,
    '/wiki/vue/reactivity': 1.5,
    '/blog/post': 8,
  })), {
    '/wiki/algorithm/start': 3,
  })
})

test('incrementWikiVisitCount adds one without mutating the input', () => {
  const current = { '/wiki/algorithm/start': 2 }
  const next = incrementWikiVisitCount(current, '/wiki/algorithm/start')

  assert.equal(current['/wiki/algorithm/start'], 2)
  assert.equal(next['/wiki/algorithm/start'], 3)
})

test('selectFrequentWikiPages sorts by count then newer date', () => {
  const selected = selectFrequentWikiPages(pages, {
    '/wiki/algorithm/start': 4,
    '/wiki/algorithm/cycle-array': 4,
    '/wiki/vue/reactivity': 2,
  }, 2)

  assert.deepEqual(
    selected.map(page => page._path),
    ['/wiki/algorithm/cycle-array', '/wiki/algorithm/start'],
  )
})

test('selectFrequentWikiPages ignores stale paths and zero counts', () => {
  const selected = selectFrequentWikiPages(pages, {
    '/wiki/missing': 10,
    '/wiki/algorithm/start': 0,
    '/wiki/vue/reactivity': 1,
  }, 2)

  assert.deepEqual(selected.map(page => page._path), ['/wiki/vue/reactivity'])
})

function createMemoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null
    },
    get length() {
      return store.size
    },
  } as Storage
}

const NOW = '2026-07-17T12:00:00.000Z'
const ID_A = 'sync-batch-A-20260717'
const ID_B = 'sync-batch-B-20260717'

test('applyWikiVisitSync adds increments from different batches', () => {
  const empty: WikiVisitsFile = { counts: {}, appliedSyncIds: [], updatedAt: NOW }
  const first = applyWikiVisitSync(empty, { id: ID_A, counts: { '/wiki/a': 2 } }, NOW)
  const second = applyWikiVisitSync(first, { id: ID_B, counts: { '/wiki/a': 3 } }, NOW)
  assert.equal(second.counts['/wiki/a'], 5)
})

test('applyWikiVisitSync is idempotent for the same batch id', () => {
  const empty: WikiVisitsFile = { counts: {}, appliedSyncIds: [], updatedAt: NOW }
  const batch = { id: ID_A, counts: { '/wiki/a': 2 } }
  const once = applyWikiVisitSync(empty, batch, NOW)
  const twice = applyWikiVisitSync(once, batch, NOW)
  assert.equal(twice.counts['/wiki/a'], once.counts['/wiki/a'])
})

test('completing a batch preserves visits recorded during sync', () => {
  const localStorageMock = createMemoryStorage()
  const originalStorage = globalThis.localStorage
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    configurable: true,
  })

  try {
    const batch = prepareWikiVisitSyncBatch(ID_A)
    assert.ok(batch)
    recordWikiVisit('/wiki/new-during-sync')
    completeWikiVisitSyncBatch(batch.id)
    assert.equal(readWikiVisitCounts()['/wiki/new-during-sync'], 1)
  }
  finally {
    if (originalStorage === undefined) {
      delete (globalThis as Record<string, unknown>).localStorage
    }
    else {
      Object.defineProperty(globalThis, 'localStorage', {
        value: originalStorage,
        configurable: true,
      })
    }
  }
})

test('prepareWikiVisitSyncBatch validates batch id length', () => {
  assert.throws(() => prepareWikiVisitSyncBatch('short'), /8-80/)
  assert.throws(() => prepareWikiVisitSyncBatch('a'.repeat(81)), /8-80/)
})

test('applyWikiVisitSync rejects overflow beyond MAX_SAFE_INTEGER', () => {
  const start: WikiVisitsFile = {
    counts: { '/wiki/a': Number.MAX_SAFE_INTEGER },
    appliedSyncIds: [],
    updatedAt: NOW,
  }
  assert.throws(
    () => applyWikiVisitSync(start, { id: ID_A, counts: { '/wiki/a': 1 } }, NOW),
    /MAX_SAFE_INTEGER/,
  )
})

test('serializeWikiVisitsFile uses two-space indent and trailing newline', () => {
  const json = serializeWikiVisitsFile({
    counts: { '/wiki/a': 1 },
    appliedSyncIds: [ID_A],
    updatedAt: NOW,
  })
  assert.match(json, /\n$/)
  assert.match(json, /\n {2}"counts":/)
})
