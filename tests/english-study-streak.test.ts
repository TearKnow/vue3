import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateEnglishStudyStats } from '../utils/english-study-streak.ts'

test('returns zero streaks for empty records', () => {
  const stats = calculateEnglishStudyStats({}, '2026-08-24')
  assert.deepEqual(stats, {
    checkedInToday: false,
    currentStreak: 0,
    bestStreak: 0,
  })
})

test('counts current streak including today', () => {
  const stats = calculateEnglishStudyStats({
    '2026-08-22': true,
    '2026-08-23': true,
    '2026-08-24': true,
  }, '2026-08-24')

  assert.equal(stats.checkedInToday, true)
  assert.equal(stats.currentStreak, 3)
  assert.equal(stats.bestStreak, 3)
})

test('keeps streak when today missing but yesterday checked', () => {
  const stats = calculateEnglishStudyStats({
    '2026-08-20': true,
    '2026-08-21': true,
    '2026-08-22': true,
    '2026-08-23': true,
  }, '2026-08-24')

  assert.equal(stats.checkedInToday, false)
  assert.equal(stats.currentStreak, 4)
  assert.equal(stats.bestStreak, 4)
})

test('resets current streak to zero when a day is missed', () => {
  const stats = calculateEnglishStudyStats({
    '2026-08-20': true,
    '2026-08-22': true,
  }, '2026-08-24')

  assert.equal(stats.checkedInToday, false)
  assert.equal(stats.currentStreak, 0)
  assert.equal(stats.bestStreak, 1)
})

test('tracks best streak across separated segments', () => {
  const stats = calculateEnglishStudyStats({
    '2026-08-10': true,
    '2026-08-11': true,
    '2026-08-12': true,
    '2026-08-14': true,
    '2026-08-15': true,
  }, '2026-08-16')

  assert.equal(stats.currentStreak, 2)
  assert.equal(stats.bestStreak, 3)
})
