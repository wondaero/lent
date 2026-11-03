// 데이터 접근 레이어.
// 화면은 이 모듈만 호출한다. Supabase 연동 시 이 파일의 구현만 교체하면 되도록
// 함수 시그니처와 반환 형태({ rows, total } 등)를 유지할 것.
import { db, nextId, CATALOG } from './mockDb'
import { parseCallQuery, hasCallTokens, matchCall, callSortKey, normalizeAuthorMark } from '@/lib/callNumber'
import { fmtDate } from '@/lib/format'

const LATENCY = 80
const DAY = 86400000
const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), LATENCY))
const fail = (message) => new Promise((_, rej) => setTimeout(() => rej(new Error(message)), LATENCY))
const nowIso = () => new Date().toISOString()
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime() }

function paginate(rows, page = 1, perPage = 20) {
  const start = (page - 1) * perPage
  return { rows: rows.slice(start, start + perPage), total: rows.length }
}
const has = (v, kw) => v != null && String(v).toLowerCase().includes(kw)

const isOverdue = (loan) => !loan.returned_at && new Date(loan.due_at).getTime() < startOfToday()

/* ───────────── 인증 ───────────── */
const SESSION_KEY = 'lent.session'

export const auth = {
  getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
  },
  async signIn(email, password) {
    if (email !== 'admin@lib.local' || password !== 'admin1234') return fail('이메일 또는 비밀번호가 올바르지 않습니다.')
    const session = { user: { email, name: '관리자' }, at: nowIso() }
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
    return wait(session)
  },
  async signOut() {
    try { localStorage.removeItem(SESSION_KEY) } catch {}
  },
}

/* ───────────── 도서 ───────────── */
const bookById = (id) => db.books.find((b) => b.id === +id)
const memberById = (id) => db.members.find((m) => m.id === +id)

function activeLoanOf(bookId) {
  return db.loans.find((l) => l.book_id === bookId && !l.returned_at)
}

export const books = {
  // sort: 'recent'(최신 등록) | 'call'(청구기호 = 서가 순서) | 'title'
  // keyword는 청구기호 요소를 패턴으로 분리하고 나머지는 일반 키워드로 검색.
  // Supabase: class_no LIKE 'prefix%' AND author_mark ILIKE 'mark%' ... ORDER BY call_sort_key
  async list({ page = 1, perPage = 20, keyword = '', status = '', label = '', category = '', sort = 'recent' } = {}) {
    const q = parseCallQuery(keyword)
    const kw = q.rest.toLowerCase()
    let rows = db.books
    if (hasCallTokens(q)) rows = rows.filter((b) => matchCall(b, q))
    if (kw) rows = rows.filter((b) => b.reg_no.toLowerCase() === kw || has(b.title, kw) || has(b.series_title, kw) || has(b.author, kw) || has(b.publisher, kw) || has(b.isbn, kw))
    if (status) rows = rows.filter((b) => b.status === status)
    if (label === 'unprinted') rows = rows.filter((b) => !b.label_printed)
    if (category !== '') rows = rows.filter((b) => b.class_no[0] === String(category))
    const cmp = {
      recent: (a, b) => b.id - a.id,
      call: (a, b) => (a.call_sort_key < b.call_sort_key ? -1 : a.call_sort_key > b.call_sort_key ? 1 : a.id - b.id),
      title: (a, b) => a.title.localeCompare(b.title, 'ko'),
    }[sort] || ((a, b) => b.id - a.id)
    rows = [...rows].sort(cmp)
    const result = paginate(rows, page, perPage)
    result.rows = result.rows.map((b) => {
      const loan = b.status === 'loaned' ? activeLoanOf(b.id) : null
      return loan ? { ...b, loan: { due_at: loan.due_at, member_name: memberById(loan.member_id)?.name } } : b
    })
    return wait(result)
  },
  async get(id) {
    const b = bookById(id)
    return b ? wait(b) : fail('도서를 찾을 수 없습니다.')
  },
  async getByRegNo(regNo) {
    const b = db.books.find((x) => x.reg_no.toLowerCase() === regNo.trim().toLowerCase())
    return b ? wait(b) : fail(`등록번호 "${regNo}" 도서를 찾을 수 없습니다.`)
  },
  async nextRegNo() {
    return wait(`EM${String(nextId.books).padStart(6, '0')}`)
  },
  async create(data) {
    if (db.books.some((b) => b.reg_no === data.reg_no)) return fail('이미 사용 중인 등록번호입니다.')
    const row = { ...data, id: nextId.books++, status: data.status || 'available', label_printed: false, created_at: nowIso() }
    row.author_mark = normalizeAuthorMark(row.author_mark)
    row.call_sort_key = callSortKey(row)
    db.books.push(row)
    return wait(row)
  },
  async update(id, data) {
    const b = bookById(id)
    if (!b) return fail('도서를 찾을 수 없습니다.')
    if (data.reg_no && db.books.some((x) => x.reg_no === data.reg_no && x.id !== b.id)) return fail('이미 사용 중인 등록번호입니다.')
    Object.assign(b, data)
    b.author_mark = normalizeAuthorMark(b.author_mark)
    b.call_sort_key = callSortKey(b)
    return wait(b)
  },
  async remove(id) {
    const b = bookById(id)
    if (!b) return fail('도서를 찾을 수 없습니다.')
    if (b.status === 'loaned') return fail('대여 중인 도서는 삭제할 수 없습니다.')
    db.books.splice(db.books.indexOf(b), 1)
    return wait(true)
  },
  // ISBN 서지 조회 → 후보 배열. ISBN 하나에 여러 건이 나올 수 있음
  //   (세트 ISBN의 각 권, 판/쇄 차이, KOLIS-NET 참여 도서관마다 다른 분류)
  // 추후 Supabase Edge Function(KOLIS-NET 프록시)으로 교체. 반환 형태는 유지할 것
  async lookupIsbn(isbn) {
    const code = isbn.replace(/-/g, '').trim()
    // 목업: 외부 서지 목록(CATALOG) 우선, 없으면 소장 도서에서 찾아 후보를 흉내 냄
    const ext = CATALOG.filter((c) => c.isbn === code)
    if (ext.length) return wait(ext)
    const found = db.books.find((b) => b.isbn === code)
    if (!found) return fail('검색 결과가 없습니다.')
    const pick = (b, extra = {}) => ({
      isbn: code, title: b.title, series_title: b.series_title, volume: b.volume,
      author: b.author, publisher: b.publisher, pub_year: b.pub_year, class_no: b.class_no, ...extra,
    })
    let rows = [pick(found)]
    // 목업: 세트 → 같은 총서명의 다른 권도 결과에 포함 / 단행본 → 일부는 분류가 다른 기록을 하나 더
    if (found.series_title) {
      const seen = new Set([found.title])
      for (const b of db.books) {
        if (b.series_title === found.series_title && !seen.has(b.title)) { seen.add(b.title); rows.push(pick(b)) }
      }
      rows.sort((a, b) => (+a.volume || 0) - (+b.volume || 0))
    } else if (+code.slice(-1) % 2 === 0) {
      const alt = found.class_no.includes('.') ? found.class_no.split('.')[0] : `${found.class_no}.1`
      rows.push(pick(found, { class_no: alt, pub_year: String(+found.pub_year + 3) }))
    }
    return wait(rows)
  },
  async markLabelPrinted(ids) {
    const set = new Set(ids)
    db.books.forEach((b) => { if (set.has(b.id)) b.label_printed = true })
    return wait(true)
  },
  async byIds(ids) {
    const set = new Set(ids.map(Number))
    return wait(db.books.filter((b) => set.has(b.id)))
  },
}

/* ───────────── 회원 ───────────── */
function memberStats(memberId) {
  let active = 0, overdue = 0
  for (const l of db.loans) {
    if (l.member_id !== memberId || l.returned_at) continue
    active++
    if (isOverdue(l)) overdue++
  }
  return { active_loans: active, overdue_count: overdue }
}

export const members = {
  async list({ page = 1, perPage = 20, keyword = '', status = '' } = {}) {
    const kw = keyword.trim().toLowerCase()
    let rows = db.members.filter((m) => !m.deleted_at)
    if (kw) rows = rows.filter((m) => has(m.name, kw) || has(m.phone, kw) || has(m.member_no, kw))
    rows = rows.map((m) => ({ ...m, ...memberStats(m.id) }))
    if (status === 'overdue') rows = rows.filter((m) => m.overdue_count > 0)
    else if (status === 'loaning') rows = rows.filter((m) => m.active_loans > 0)
    else if (status) rows = rows.filter((m) => m.status === status)
    rows.sort((a, b) => b.id - a.id)
    return wait(paginate(rows, page, perPage))
  },
  async search(keyword) {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return wait([])
    const rows = db.members
      .filter((m) => !m.deleted_at && (has(m.name, kw) || has(m.phone, kw) || m.member_no.toLowerCase() === kw))
      .slice(0, 30)
      .map((m) => ({ ...m, ...memberStats(m.id) }))
    return wait(rows)
  },
  async get(id) {
    const m = memberById(id)
    return m && !m.deleted_at ? wait({ ...m, ...memberStats(m.id) }) : fail('회원을 찾을 수 없습니다.')
  },
  async create(data) {
    const id = nextId.members++
    const row = { ...data, id, member_no: `M${String(id).padStart(5, '0')}`, created_at: nowIso(), deleted_at: null }
    db.members.push(row)
    return wait(row)
  },
  async update(id, data) {
    const m = memberById(id)
    if (!m) return fail('회원을 찾을 수 없습니다.')
    Object.assign(m, data)
    return wait(m)
  },
  async remove(id) {
    const m = memberById(id)
    if (!m) return fail('회원을 찾을 수 없습니다.')
    if (memberStats(m.id).active_loans > 0) return fail('대여 중인 도서가 있는 회원은 삭제할 수 없습니다.')
    m.deleted_at = nowIso()
    return wait(true)
  },
}

/* ───────────── 대여/반납 ───────────── */
function withJoin(l) {
  const b = bookById(l.book_id)
  const m = memberById(l.member_id)
  return {
    ...l,
    overdue: isOverdue(l),
    book: b ? { id: b.id, reg_no: b.reg_no, title: b.title, author: b.author, class_no: b.class_no, author_mark: b.author_mark } : null,
    member: m ? { id: m.id, name: m.name, phone: m.phone, member_no: m.member_no } : null,
  }
}

export const loans = {
  async list({ page = 1, perPage = 20, keyword = '', state = '' } = {}) {
    const kw = keyword.trim().toLowerCase()
    let rows = db.loans
    if (state === 'active') rows = rows.filter((l) => !l.returned_at)
    else if (state === 'overdue') rows = rows.filter(isOverdue)
    else if (state === 'returned') rows = rows.filter((l) => l.returned_at)
    rows = rows.map(withJoin)
    if (kw) rows = rows.filter((l) => has(l.book?.title, kw) || l.book?.reg_no.toLowerCase() === kw || has(l.member?.name, kw))
    rows.sort((a, b) => b.id - a.id)
    return wait(paginate(rows, page, perPage))
  },
  async byMember(memberId, { from, to } = {}) {
    const f = from ? new Date(from).getTime() : 0
    const t = to ? new Date(to).getTime() + DAY : Infinity
    const rows = db.loans
      .filter((l) => l.member_id === +memberId)
      .filter((l) => { const x = new Date(l.loaned_at).getTime(); return x >= f && x < t })
      .map(withJoin)
      .sort((a, b) => b.id - a.id)
    return wait(rows)
  },
  async activeByMember(memberId) {
    return wait(db.loans.filter((l) => l.member_id === +memberId && !l.returned_at).map(withJoin))
  },
  // 스캔한 등록번호의 도서 + 현재 대여 정보(없으면 null) → 화면에서 대여/반납 자동 판별
  async lookup(regNo) {
    const b = db.books.find((x) => x.reg_no.toLowerCase() === regNo.trim().toLowerCase())
    if (!b) return fail(`등록번호 "${regNo}" 도서를 찾을 수 없습니다.`)
    const l = activeLoanOf(b.id)
    return wait({ book: b, loan: l ? withJoin(l) : null })
  },
  // 반납 + 대여 일괄 처리. 반납을 먼저 반영해 비워진 한도를 대여에 사용.
  // 검증을 모두 끝낸 뒤에 반영하므로 일부만 처리되는 일이 없음.
  // Supabase에서는 단일 RPC(Postgres 함수, 트랜잭션)로 구현할 것
  // returnDate: 반납 처리일(YYYY-MM-DD). 주말 반납함 도서를 월요일에 처리할 때 실제 반납일로 소급. 생략 시 현재 시각
  async process({ memberId = null, returnIds = [], bookIds = [], dueAt = null, returnDate = null }) {
    const returning = returnIds.map((id) => db.loans.find((l) => l.id === id && !l.returned_at)).filter(Boolean)
    let m = null
    let targets = []
    if (bookIds.length) {
      m = memberById(memberId)
      if (!m || m.deleted_at) return fail('대여할 회원을 선택해주세요.')
      if (m.status !== 'active') return fail('대여가 정지된 회원입니다.')
      const freed = returning.filter((l) => l.member_id === m.id).length
      if (memberStats(m.id).active_loans - freed + bookIds.length > m.loan_limit) return fail(`대여 한도(${m.loan_limit}권)를 초과합니다.`)
      targets = bookIds.map(bookById)
      const bad = targets.find((b) => !b || b.status !== 'available')
      if (bad) return fail(`"${bad?.title ?? '알 수 없음'}"은(는) 대여할 수 없는 상태입니다.`)
      if (!dueAt) return fail('반납 예정일을 지정해주세요.')
    }
    const at = nowIso()
    let retAt = at
    if (returnDate && returnDate !== fmtDate(new Date())) {
      if (new Date(returnDate) > new Date()) return fail('반납 처리일은 미래일 수 없습니다.')
      retAt = new Date(`${returnDate}T12:00:00`).toISOString()
    }
    for (const l of returning) {
      // 소급일이 대여일보다 앞서면 대여일로 보정
      l.returned_at = retAt < l.loaned_at ? l.loaned_at : retAt
      const b = bookById(l.book_id)
      if (b) b.status = 'available'
    }
    for (const b of targets) {
      b.status = 'loaned'
      db.loans.push({ id: nextId.loans++, book_id: b.id, member_id: m.id, loaned_at: at, due_at: new Date(dueAt).toISOString(), returned_at: null })
    }
    return wait({ returned: returning.length, loaned: targets.length })
  },
  async extend(loanId, dueAt) {
    const l = db.loans.find((x) => x.id === loanId)
    if (!l || l.returned_at) return fail('연장할 수 없는 대여입니다.')
    l.due_at = new Date(dueAt).toISOString()
    return wait(withJoin(l))
  },
}

/* ───────────── 통계 ───────────── */
export const stats = {
  async dashboard() {
    const today = startOfToday()
    const category = Array(10).fill(0)
    let loaned = 0, unprinted = 0
    for (const b of db.books) {
      category[+b.class_no[0]]++
      if (b.status === 'loaned') loaned++
      if (!b.label_printed) unprinted++
    }
    let overdue = 0, todayLoans = 0, todayReturns = 0
    for (const l of db.loans) {
      if (isOverdue(l)) overdue++
      if (new Date(l.loaned_at).getTime() >= today) todayLoans++
      if (l.returned_at && new Date(l.returned_at).getTime() >= today) todayReturns++
    }
    return wait({
      totalBooks: db.books.length,
      loanedBooks: loaned,
      overdueLoans: overdue,
      unprintedLabels: unprinted,
      totalMembers: db.members.filter((m) => !m.deleted_at).length,
      todayLoans,
      todayReturns,
      category,
    })
  },
  // unit: 'day'(최근 30일) | 'week'(최근 12주) | 'month'(최근 12개월)
  async loanTrend(unit = 'day') {
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
    const loanCnt = Array(buckets.length).fill(0)
    const returnCnt = Array(buckets.length).fill(0)
    const first = buckets[0].start
    const idx = (t) => {
      if (t < first) return -1
      // 버킷 수가 작으므로 선형 탐색으로 충분
      for (let i = buckets.length - 1; i >= 0; i--) if (t >= buckets[i].start) return t < buckets[i].end ? i : -1
      return -1
    }
    for (const l of db.loans) {
      const a = idx(new Date(l.loaned_at).getTime())
      if (a >= 0) loanCnt[a]++
      if (l.returned_at) {
        const r = idx(new Date(l.returned_at).getTime())
        if (r >= 0) returnCnt[r]++
      }
    }
    return wait({ labels: buckets.map((b) => b.label), loans: loanCnt, returns: returnCnt })
  },
}
