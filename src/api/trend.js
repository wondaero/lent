// 기간별 대출 그래프 구간(브라우저 시간 기준). 목업·Supabase 두 구현이 같이 쓴다.
//   unit: 'day' | 'week'(월요일 시작) | 'month'
//   range 없음 = 최근(일별 30일, 주별 12주, 월별 12개월)
//   range = { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } = 그 기간(대시보드 "기간" 선택, 사용자 결정 2026-11-13).
//     양 끝에 걸친 주·달은 기간 안의 날짜만 센다 → 막대 합계 = 기간 합계. 각 구간의 실제 날짜는 from/to로 돌려준다
const DAY = 86400000
const pad = (n) => String(n).padStart(2, '0')
const ymd = (t) => { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).getTime() }

// 단위별 최대 구간 수: 이보다 많으면 막대가 너무 가늘어 읽을 수 없다(일별 약 3개월, 주별 약 2년)
export const TREND_MAX = { day: 92, week: 104, month: 120 }

// 기간 안의 구간 수(상한 판단용). from > to면 0
export function trendCount(unit, { from, to }) {
  const a = parse(from), b = parse(to)
  if (a > b) return 0
  if (unit === 'day') return Math.round((b - a) / DAY) + 1
  if (unit === 'week') {
    const monday = (t) => t - ((new Date(t).getDay() + 6) % 7) * DAY
    return Math.round((monday(b) - monday(a)) / (7 * DAY)) + 1
  }
  const da = new Date(a), db = new Date(b)
  return (db.getFullYear() - da.getFullYear()) * 12 + db.getMonth() - da.getMonth() + 1
}

// 구간 = { label(그래프 축), start·end(ms, end는 다음 구간 시작), from·to(실제로 센 첫날·마지막 날), partial(양 끝이 잘림) }
export function trendBuckets(unit = 'day', range = null) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = range ? parse(range.to) + DAY : today.getTime() + DAY
  let first
  if (range) first = parse(range.from)
  else if (unit === 'day') first = today.getTime() - 29 * DAY
  else if (unit === 'week') first = today.getTime() - ((today.getDay() + 6) % 7) * DAY - 11 * 7 * DAY
  else first = new Date(today.getFullYear(), today.getMonth() - 11, 1).getTime()

  const buckets = []
  let s = first
  while (s < end) {
    const d = new Date(s)
    // 이 구간이 원래 끝나는 시각(주는 다음 월요일, 달은 다음 달 1일)
    let next
    if (unit === 'day') next = s + DAY
    else if (unit === 'week') next = s - ((d.getDay() + 6) % 7) * DAY + 7 * DAY
    else next = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime()
    const e = Math.min(next, end)
    const fullStart = unit === 'week' ? s - ((d.getDay() + 6) % 7) * DAY : unit === 'month' ? new Date(d.getFullYear(), d.getMonth(), 1).getTime() : s
    const partial = unit !== 'day' && (s !== fullStart || e !== next)
    const label = unit === 'day' ? `${d.getMonth() + 1}/${d.getDate()}`
      : unit === 'week' ? `${d.getMonth() + 1}/${d.getDate()}~`
      : `${d.getFullYear() % 100}.${d.getMonth() + 1}`
    buckets.push({ label, start: s, end: e, from: ymd(s), to: ymd(e - DAY), partial })
    s = e
  }
  return buckets
}

// 시각(ms) → 구간 번호. 범위 밖이면 -1
export function bucketIndex(buckets, t) {
  if (!buckets.length || t < buckets[0].start) return -1
  for (let i = buckets.length - 1; i >= 0; i--) if (t >= buckets[i].start) return t < buckets[i].end ? i : -1
  return -1
}
