const pad = (n) => String(n).padStart(2, '0')

export function fmtDate(v) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d)) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fmtDateTime(v) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d)) return ''
  return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function addDays(days, from = new Date()) {
  const d = new Date(from)
  d.setDate(d.getDate() + days)
  return fmtDate(d)
}

// 반납함 소급 기준일. 오늘이 토요일이면 지난주 토요일
export function lastSaturday() {
  return addDays(-((new Date().getDay() + 1) % 7 || 7))
}

// 실제 반납 기한:연장했으면 연장 반납일, 아니면 처음 반납 예정일
export const dueOf = (loan) => loan.extended_due_at || loan.due_at

// 연체일수(오늘 기준, 반납 완료면 반납일 기준)
export function overdueDays(dueAt, returnedAt) {
  const end = returnedAt ? new Date(returnedAt) : new Date()
  end.setHours(0, 0, 0, 0)
  const due = new Date(dueAt)
  due.setHours(0, 0, 0, 0)
  return Math.max(0, Math.round((end - due) / 86400000))
}

export const num = (n) => Number(n || 0).toLocaleString('ko-KR')

// 청구기호: 분류기호 / 저자기호 / 권차 / 복본
export function callNumberLines(b) {
  const extra = [b.volume && `v.${b.volume}`, b.copy_no && `c.${b.copy_no}`].filter(Boolean).join(' ')
  return [b.class_no, b.author_mark, extra].filter(Boolean)
}

export function debounce(fn, ms = 250) {
  let t
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}
