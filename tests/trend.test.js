// 대시보드 기간별 대출 구간(src/api/trend.js). 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trendBuckets, trendCount, bucketIndex, TREND_MAX } from '../src/api/trend.js'

const t = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime() }

test('최근(기간 없음): 일 30 · 주 12 · 월 12개', () => {
  assert.equal(trendBuckets('day').length, 30)
  assert.equal(trendBuckets('week').length, 12)
  assert.equal(trendBuckets('month').length, 12)
})

test('일별 기간: 하루 하나씩, 양 끝 포함', () => {
  const b = trendBuckets('day', { from: '2026-01-30', to: '2026-02-02' })
  assert.deepEqual(b.map((x) => x.from), ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'])
  assert.equal(trendCount('day', { from: '2026-01-30', to: '2026-02-02' }), 4)
})

test('주별 기간: 월요일로 끊고 양 끝 주는 기간 안의 날짜만', () => {
  // 2026-01-14(수) ~ 2026-01-27(화): [14~18] [19~25] [26~27]
  const b = trendBuckets('week', { from: '2026-01-14', to: '2026-01-27' })
  assert.deepEqual(b.map((x) => [x.from, x.to, x.partial]), [
    ['2026-01-14', '2026-01-18', true],
    ['2026-01-19', '2026-01-25', false],
    ['2026-01-26', '2026-01-27', true],
  ])
  assert.equal(b[0].label, '1/14~')
  assert.equal(trendCount('week', { from: '2026-01-14', to: '2026-01-27' }), 3)
})

test('월별 기간: 달로 끊고 양 끝 달은 기간 안의 날짜만', () => {
  const b = trendBuckets('month', { from: '2025-12-15', to: '2026-02-10' })
  assert.deepEqual(b.map((x) => [x.label, x.from, x.to, x.partial]), [
    ['25.12', '2025-12-15', '2025-12-31', true],
    ['26.1', '2026-01-01', '2026-01-31', false],
    ['26.2', '2026-02-01', '2026-02-10', true],
  ])
  assert.equal(trendCount('month', { from: '2025-12-15', to: '2026-02-10' }), 3)
})

test('구간 번호: 기간 밖은 -1, 마지막 날 밤도 포함', () => {
  const b = trendBuckets('month', { from: '2025-12-15', to: '2026-02-10' })
  assert.equal(bucketIndex(b, t('2025-12-14')), -1)
  assert.equal(bucketIndex(b, t('2025-12-15')), 0)
  assert.equal(bucketIndex(b, t('2026-01-31') + 23 * 3600000), 1)
  assert.equal(bucketIndex(b, t('2026-02-10') + 23 * 3600000), 2)
  assert.equal(bucketIndex(b, t('2026-02-11')), -1)
})

test('상한: 일별 1년은 넘고 주별·월별은 됨', () => {
  const year = { from: '2025-01-01', to: '2025-12-31' }
  assert.ok(trendCount('day', year) > TREND_MAX.day)
  assert.ok(trendCount('week', year) <= TREND_MAX.week)
  assert.ok(trendCount('month', year) <= TREND_MAX.month)
  assert.equal(trendCount('day', { from: '2026-02-01', to: '2026-01-01' }), 0)
})
