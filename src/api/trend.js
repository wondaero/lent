// 기간별 대출 그래프 구간(브라우저 시간 기준). unit: 'day'(최근 30일) | 'week'(최근 12주, 월요일 시작) | 'month'(최근 12개월)
const DAY = 86400000

export function trendBuckets(unit = 'day') {
  const buckets = []
  const d = new Date(); d.setHours(0, 0, 0, 0)
  if (unit === 'day') {
    for (let i = 29; i >= 0; i--) {
      const s = new Date(d.getTime() - i * DAY)
      buckets.push({ label: `${s.getMonth() + 1}/${s.getDate()}`, start: s.getTime(), end: s.getTime() + DAY })
    }
  } else if (unit === 'week') {
    const monday = d.getTime() - ((d.getDay() + 6) % 7) * DAY
    for (let i = 11; i >= 0; i--) {
      const s = new Date(monday - i * 7 * DAY)
      buckets.push({ label: `${s.getMonth() + 1}/${s.getDate()}~`, start: s.getTime(), end: s.getTime() + 7 * DAY })
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const s = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const e = new Date(d.getFullYear(), d.getMonth() - i + 1, 1)
      buckets.push({ label: `${s.getFullYear() % 100}.${s.getMonth() + 1}`, start: s.getTime(), end: e.getTime() })
    }
  }
  return buckets
}

// 시각(ms) → 구간 번호. 범위 밖이면 -1
export function bucketIndex(buckets, t) {
  if (t < buckets[0].start) return -1
  for (let i = buckets.length - 1; i >= 0; i--) if (t >= buckets[i].start) return t < buckets[i].end ? i : -1
  return -1
}
