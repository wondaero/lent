// 목업 데이터 레이어(.env.local이 없을 때). 반환 형태는 remote.js(Supabase)와 같아야 한다.
import { db, nextId } from './mockDb'
import { CATALOG } from './devCatalog'
import { trendBuckets, bucketIndex } from './trend'
import { callSortKey, normalizeAuthorMark, parseCallQuery, hasCallTokens, matchCall } from '@/lib/callNumber'
import { fmtDate, dueOf } from '@/lib/format'
import { fmtRegNo, normalizeRegNo, parseRegNo } from '@/lib/regNo'
import { POST_CATEGORY, POST_PHOTO } from '@/lib/constants'

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

const isOverdue = (loan) => !loan.returned_at && new Date(dueOf(loan)).getTime() < startOfToday()

/* ───────────── 도서 ───────────── */
const bookById = (id) => db.books.find((b) => b.id === +id)
const memberById = (id) => db.members.find((m) => m.id === +id)

function lastBarcodeNo() {
  return db.books.reduce((m, b) => Math.max(m, parseRegNo(b.reg_no) ?? 0), db.settings.barcode_last_issued_no)
}

const loanInfo = (loan) => ({ due_at: dueOf(loan), member_name: memberById(loan.member_id)?.name, member_id: loan.member_id })

function activeLoanOf(bookId) {
  return db.loans.find((l) => l.book_id === bookId && !l.returned_at)
}

export const books = {
  // sort: 'recent'(최신 등록) | 'call'(청구기호 = 서가 순서) | 'title'
  // keyword는 청구기호 요소를 패턴으로 분리하고 나머지는 일반 키워드로 검색.
  // Supabase: class_no LIKE 'prefix%' AND author_mark ILIKE 'mark%' ... ORDER BY call_sort_key
  async list({ page = 1, perPage = 20, keyword = '', status = '', label = '', category = '', sort = 'recent' } = {}) {
    // 등록번호는 한글 자판으로 찍힌 값("뜨00004055")도 찾는다. 청구기호 해석 전에 변환해야 저자기호로 오인하지 않음
    const asReg = normalizeRegNo(keyword)
    const q = parseCallQuery(parseRegNo(asReg) != null ? asReg : keyword)
    const kw = q.rest.toLowerCase()
    let rows = db.books
    if (hasCallTokens(q)) rows = rows.filter((b) => matchCall(b, q))
    if (kw) rows = rows.filter((b) => b.reg_no.toLowerCase() === kw || has(b.title, kw) || has(b.series_title, kw) || has(b.author, kw) || has(b.publisher, kw) || has(b.isbn, kw))
    if (status) rows = rows.filter((b) => b.status === status)
    if (label === 'unprinted') rows = rows.filter((b) => !b.spine_label_printed)
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
      return loan ? { ...b, loan: loanInfo(loan) } : b
    })
    return wait(result)
  },
  // 대출 중이면 loan = { due_at, member_name, member_id } (도서 상세에서 대출자 표시)
  async get(id) {
    const b = bookById(id)
    if (!b) return fail('도서를 찾을 수 없습니다.')
    const loan = b.status === 'loaned' ? activeLoanOf(b.id) : null
    return wait(loan ? { ...b, loan: loanInfo(loan) } : b)
  },
  async getByRegNo(regNo) {
    const reg = normalizeRegNo(regNo)
    const b = db.books.find((x) => x.reg_no === reg)
    return b ? wait(b) : fail(`등록번호 "${regNo}" 도서를 찾을 수 없습니다.`)
  },
  // 바코드 라벨 출력 상태. 출력 기록보다 큰 번호로 등록된 책이 있으면 그 다음부터(라벨 번호 겹침 방지)
  async barcodeState() {
    const last = lastBarcodeNo()
    return wait({ lastIssued: last, next: fmtRegNo(last + 1) })
  },
  // 바코드 라벨 인쇄: 시작 번호는 직접 입력 가능. 끝 번호가 마지막 번호보다 크면 그 값으로 올리고, 작으면(다시 뽑기) 그대로.
  // expected = 화면이 보고 있던 마지막 번호(그 사이 다른 PC가 출력했으면 거부). Supabase: RPC barcode_issue
  async issueBarcodes(from, count, expected) {
    const last = lastBarcodeNo()
    if (last !== expected) return fail('그 사이 다른 곳에서 바코드를 출력했습니다. 화면을 새로고침한 뒤 다시 확인해주세요.')
    const end = from + count - 1
    if (end > last) db.settings.barcode_last_issued_no = end
    const now = lastBarcodeNo()
    return wait({ lastIssued: now, next: fmtRegNo(now + 1) })
  },
  // 인쇄를 취소했을 때 번호 되돌리기. 그 뒤로 더 출력됐거나 그 번호로 등록된 책이 있으면 되돌리지 않는다
  // (번호가 비는 건 괜찮지만 겹치면 안 됨). Supabase: issueBarcodes와 같은 조건부 갱신 RPC
  // 인쇄 취소: 인쇄 전 마지막 번호(prev)로 되돌림. 그 뒤로 더 출력됐거나 그 번호로 등록된 책이 있으면 되돌리지 않음
  async releaseBarcodes(from, count, prev) {
    const last = from + count - 1
    const used = db.books.some((b) => { const n = parseRegNo(b.reg_no); return n != null && n > prev })
    if (db.settings.barcode_last_issued_no !== last || used) return fail(`이미 다음 번호가 사용되어 되돌리지 않았습니다. ${fmtRegNo(from)} ~ ${fmtRegNo(last)}은(는) 건너뜁니다.`)
    db.settings.barcode_last_issued_no = prev
    const now = lastBarcodeNo()
    return wait({ lastIssued: now, next: fmtRegNo(now + 1) })
  },
  async create(data) {
    const reg = normalizeRegNo(data.reg_no)
    if (parseRegNo(reg) == null) return fail('등록번호 형식이 올바르지 않습니다. (예: EM00005724)')
    if (db.books.some((b) => b.reg_no === reg)) return fail('이미 사용 중인 등록번호입니다.')
    data = { ...data, hold_reason: data.status === 'hold' ? (data.hold_reason || '').trim() : '' }
    if (data.status === 'hold' && !data.hold_reason) return fail('대출보류 사유를 입력해주세요.')
    const row = { ...data, reg_no: reg, id: nextId.books++, status: data.status || 'available', spine_label_printed: false, created_at: nowIso() }
    row.author_mark = normalizeAuthorMark(row.author_mark)
    row.call_sort_key = callSortKey(row)
    db.books.push(row)
    return wait(row)
  },
  async update(id, data) {
    const b = bookById(id)
    if (!b) return fail('도서를 찾을 수 없습니다.')
    if (data.reg_no != null) {
      data = { ...data, reg_no: normalizeRegNo(data.reg_no) }
      if (parseRegNo(data.reg_no) == null) return fail('등록번호 형식이 올바르지 않습니다. (예: EM00005724)')
      if (db.books.some((x) => x.reg_no === data.reg_no && x.id !== b.id)) return fail('이미 사용 중인 등록번호입니다.')
    }
    if (data.status != null) {
      data = { ...data, hold_reason: data.status === 'hold' ? (data.hold_reason || '').trim() : '' }
      if (data.status === 'hold' && !data.hold_reason) return fail('대출보류 사유를 입력해주세요.')
    }
    Object.assign(b, data)
    b.author_mark = normalizeAuthorMark(b.author_mark)
    b.call_sort_key = callSortKey(b)
    return wait(b)
  },
  async remove(id) {
    const b = bookById(id)
    if (!b) return fail('도서를 찾을 수 없습니다.')
    if (b.status === 'loaned') return fail('대출 중인 도서는 삭제할 수 없습니다.')
    db.books.splice(db.books.indexOf(b), 1)
    return wait(true)
  },
  // ISBN 서지 조회 → 후보 배열. ISBN 하나에 여러 건이 나올 수 있음
  //   (세트 ISBN의 각 권, 판/쇄 차이, KOLIS-NET 참여 도서관마다 다른 분류, KOLIS-NET 쪽 데이터 오류)
  // 배열에 total(전체 건수) 속성을 붙여 반환 — KOLIS-NET은 한 번에 10건까지만 줌
  async lookupIsbn(isbn) {
    const code = isbn.replace(/-/g, '').trim()
    // 개발용 예시 ISBN(가상의 책)은 설정과 무관하게 목업 사용
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
    db.books.forEach((b) => { if (set.has(b.id)) b.spine_label_printed = true })
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
      .filter((m) => !m.deleted_at && (has(m.name, kw) || has(m.phone, kw) || String(m.member_no) === kw))
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
    // 회원번호 = 지금까지의 최대 번호 + 1(삭제된 회원 번호도 다시 쓰지 않음 → 회원카드 번호 겹침 방지)
    const memberNo = db.members.reduce((mx, m) => Math.max(mx, m.member_no), 0) + 1
    const row = { ...data, id, member_no: memberNo, created_at: nowIso(), deleted_at: null }
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
    if (memberStats(m.id).active_loans > 0) return fail('대출 중인 도서가 있는 회원은 삭제할 수 없습니다.')
    m.deleted_at = nowIso()
    return wait(true)
  },
}

/* ───────────── 대출/반납 ───────────── */
function withJoin(l) {
  const b = bookById(l.book_id)
  const m = memberById(l.member_id)
  return {
    ...l,
    overdue: isOverdue(l),
    // 책이 삭제됐으면 대출 때 저장해 둔 등록번호·서명으로 보여준다(대출 기록은 지우지 않음)
    book: b ? { id: b.id, reg_no: b.reg_no, title: b.title, author: b.author, class_no: b.class_no, author_mark: b.author_mark }
      : { id: null, deleted: true, reg_no: l.book_reg_no, title: l.book_title ? `${l.book_title} (삭제된 도서)` : '(삭제된 도서)', author: '', class_no: '', author_mark: '' },
    member: m ? { id: m.id, name: m.name, phone: m.phone, member_no: m.member_no, loan_days: m.loan_days } : null,
  }
}

export const loans = {
  // dateBy: 'loaned_at'(대출일) | 'returned_at'(반납일). from/to(YYYY-MM-DD)는 그 날짜 기준, to 포함
  async list({ page = 1, perPage = 20, keyword = '', state = '', dateBy = 'loaned_at', from = '', to = '' } = {}) {
    const kw = keyword.trim().toLowerCase()
    let rows = db.loans
    if (from || to) {
      const f = from ? new Date(`${from}T00:00:00`).getTime() : -Infinity
      const t = to ? new Date(`${to}T00:00:00`).getTime() + DAY : Infinity
      rows = rows.filter((l) => { const x = l[dateBy] && new Date(l[dateBy]).getTime(); return x && x >= f && x < t })
    }
    if (state === 'active') rows = rows.filter((l) => !l.returned_at)
    else if (state === 'overdue') rows = rows.filter(isOverdue)
    else if (state === 'returned') rows = rows.filter((l) => l.returned_at)
    rows = rows.map(withJoin)
    if (kw) rows = rows.filter((l) => has(l.book?.title, kw) || l.book?.reg_no?.toLowerCase() === kw || has(l.member?.name, kw))
    rows.sort((a, b) => (a.loaned_at < b.loaned_at ? 1 : a.loaned_at > b.loaned_at ? -1 : b.id - a.id))
    return wait(paginate(rows, page, perPage))
  },
  async byMember(memberId, { from, to } = {}) {
    const f = from ? new Date(from).getTime() : 0
    const t = to ? new Date(to).getTime() + DAY : Infinity
    const rows = db.loans
      .filter((l) => l.member_id === +memberId)
      .filter((l) => { const x = new Date(l.loaned_at).getTime(); return x >= f && x < t })
      .map(withJoin)
      .sort((a, b) => (a.loaned_at < b.loaned_at ? 1 : a.loaned_at > b.loaned_at ? -1 : b.id - a.id))
    return wait(rows)
  },
  async activeByMember(memberId) {
    return wait(db.loans.filter((l) => l.member_id === +memberId && !l.returned_at).map(withJoin))
  },
  // 스캔한 등록번호의 도서 + 현재 대출 정보(없으면 null) → 화면에서 대출/반납 자동 판별
  async lookup(regNo) {
    const reg = normalizeRegNo(regNo)
    const b = db.books.find((x) => x.reg_no === reg)
    if (!b) return fail(`등록번호 "${regNo}" 도서를 찾을 수 없습니다.`)
    const l = activeLoanOf(b.id)
    return wait({ book: b, loan: l ? withJoin(l) : null })
  },
  // 반납 + 대출 일괄 처리. 반납을 먼저 반영해 비워진 한도를 대출에 사용.
  // 검증을 모두 끝낸 뒤에 반영하므로 일부만 처리되는 일이 없음.
  // Supabase에서는 단일 RPC(Postgres 함수, 트랜잭션)로 구현할 것
  // returnDate: 반납 처리일(YYYY-MM-DD). 주말 반납함 도서를 월요일에 처리할 때 실제 반납일로 소급. 생략 시 현재 시각
  // memo: 이번 처리 전체에 메모 하나 → 대출한 책은 loan_memo, 반납한 책은 return_memo(빈 메모는 저장 안 함)
  async process({ memberId = null, returnIds = [], bookIds = [], dueAt = null, returnDate = null, memo = null }) {
    const note = (memo || '').trim() || null
    const returning = returnIds.map((id) => db.loans.find((l) => l.id === id && !l.returned_at)).filter(Boolean)
    let m = null
    let targets = []
    if (bookIds.length) {
      m = memberById(memberId)
      if (!m || m.deleted_at) return fail('대출할 회원을 선택해주세요.')
      if (m.status !== 'active') return fail('대출이 정지된 회원입니다.')
      const freed = returning.filter((l) => l.member_id === m.id).length
      if (memberStats(m.id).active_loans - freed + bookIds.length > m.loan_limit) return fail(`대출 한도(${m.loan_limit}권)를 초과합니다.`)
      targets = bookIds.map(bookById)
      const bad = targets.find((b) => !b || b.status !== 'available')
      if (bad) return fail(`"${bad?.title ?? '알 수 없음'}"은(는) 대출할 수 없는 상태입니다.`)
      if (!dueAt) return fail('반납 예정일을 지정해주세요.')
    }
    const at = nowIso()
    let retAt = at
    if (returnDate && returnDate !== fmtDate(new Date())) {
      if (new Date(returnDate) > new Date()) return fail('반납 처리일은 미래일 수 없습니다.')
      retAt = new Date(`${returnDate}T12:00:00`).toISOString()
    }
    for (const l of returning) {
      // 소급일이 대출일보다 앞서면 대출일로 보정
      l.returned_at = retAt < l.loaned_at ? l.loaned_at : retAt
      if (note) l.return_memo = note
      const b = bookById(l.book_id)
      if (b) b.status = 'available'
    }
    for (const b of targets) {
      b.status = 'loaned'
      db.loans.push({ id: nextId.loans++, book_id: b.id, book_reg_no: b.reg_no, book_title: b.title, member_id: m.id, loaned_at: at, due_at: new Date(dueAt).toISOString(), extended_due_at: null, returned_at: null, loan_memo: note, return_memo: null })
    }
    return wait({ returned: returning.length, loaned: targets.length })
  },
  // 연장: 횟수 제한 없음, 연체 중에도 가능(운영 결정). 처음 반납 예정일(due_at)은 남기고 연장 반납일만 덮어쓴다
  async extend(loanId, dueAt) {
    const l = db.loans.find((x) => x.id === loanId)
    if (!l || l.returned_at) return fail('연장할 수 없는 대출입니다.')
    if (!dueAt || dueAt < fmtDate(new Date())) return fail('연장 반납일은 오늘 이후여야 합니다.')
    l.extended_due_at = new Date(dueAt).toISOString()
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
      if (!b.spine_label_printed) unprinted++
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
    const buckets = trendBuckets(unit)
    const loanCnt = Array(buckets.length).fill(0)
    const returnCnt = Array(buckets.length).fill(0)
    const idx = (t) => bucketIndex(buckets, t)
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

/* ───────────── 게시판 ───────────── */
// 사진 배열(images)은 화면에 보이는 순서 그대로 넘긴다.
//   기존 사진 = { id }, 새 사진 = { blob, thumbBlob, width, height } (이미 브라우저에서 줄인 것)
// Supabase: 새 사진은 Storage 공개 버킷에 올리고 post_images에 경로를 저장, 빠진 사진은 파일까지 삭제.
//   메인페이지용 공개 조회는 별도(게시된 글만, CLAUDE.md §10)
const postById = (id) => db.posts.find((p) => p.id === +id)
const imagesOf = (postId) => db.post_images.filter((i) => i.post_id === postId).sort((a, b) => a.sort - b.sort)

function savePostImages(postId, images = []) {
  const keep = new Set(images.filter((i) => i.id).map((i) => i.id))
  db.post_images = db.post_images.filter((i) => {
    if (i.post_id !== postId || keep.has(i.id)) return true
    if (i.url.startsWith('blob:')) { URL.revokeObjectURL(i.url); URL.revokeObjectURL(i.thumb_url) }
    return false
  })
  images.forEach((img, sort) => {
    if (img.id) {
      const row = db.post_images.find((i) => i.id === img.id)
      if (row) row.sort = sort
    } else {
      db.post_images.push({
        id: nextId.post_images++, post_id: postId, sort, width: img.width, height: img.height,
        url: URL.createObjectURL(img.blob), thumb_url: URL.createObjectURL(img.thumbBlob),
      })
    }
  })
}

function checkPost(data) {
  if (!POST_CATEGORY[data.category]) return '분류를 선택해주세요.'
  if (!data.title?.trim()) return '제목을 입력해주세요.'
  if (data.images?.length && !POST_CATEGORY[data.category].photos) return `${POST_CATEGORY[data.category].label}에는 사진을 올릴 수 없습니다.`
  if ((data.images?.length || 0) > POST_PHOTO.maxCount) return `사진은 ${POST_PHOTO.maxCount}장까지 올릴 수 있습니다.`
  return ''
}

export const posts = {
  // 목록에는 본문을 싣지 않는다(가볍게). 고정 글이 먼저, 그다음 최신순
  async list({ page = 1, perPage = 20, category = 'notice', keyword = '', status = '' } = {}) {
    const kw = keyword.trim().toLowerCase()
    let rows = db.posts.filter((p) => p.category === category)
    if (kw) rows = rows.filter((p) => has(p.title, kw) || has(p.body, kw))
    if (status) rows = rows.filter((p) => p.status === status)
    rows = rows
      .sort((a, b) => b.pinned - a.pinned || (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : b.id - a.id))
      .map(({ body, ...p }) => {
        const imgs = imagesOf(p.id)
        return { ...p, image_count: imgs.length, thumb_url: imgs[0]?.thumb_url ?? null }
      })
    return wait(paginate(rows, page, perPage))
  },
  async get(id) {
    const p = postById(id)
    return p ? wait({ ...p, images: imagesOf(p.id) }) : fail('글을 찾을 수 없습니다.')
  },
  async create({ images = [], ...data }) {
    const err = checkPost({ ...data, images })
    if (err) return fail(err)
    const t = nowIso()
    const row = {
      id: nextId.posts++, category: data.category, title: data.title.trim(), body: data.body || '',
      pinned: !!data.pinned, status: data.status || 'published',
      published_at: data.status === 'draft' ? null : t, created_at: t, updated_at: t,
    }
    db.posts.push(row)
    savePostImages(row.id, images)
    return wait({ ...row, images: imagesOf(row.id) })
  },
  async update(id, { images = [], ...data }) {
    const p = postById(id)
    if (!p) return fail('글을 찾을 수 없습니다.')
    const err = checkPost({ ...p, ...data, images })
    if (err) return fail(err)
    const t = nowIso()
    Object.assign(p, {
      title: data.title.trim(), body: data.body || '', pinned: !!data.pinned, status: data.status,
      // 처음 게시한 시각은 유지(임시저장 → 게시로 바꿀 때만 기록)
      published_at: p.published_at || (data.status === 'published' ? t : null), updated_at: t,
    })
    savePostImages(p.id, images)
    return wait({ ...p, images: imagesOf(p.id) })
  },
  async remove(id) {
    const p = postById(id)
    if (!p) return fail('글을 찾을 수 없습니다.')
    savePostImages(p.id, [])
    db.posts = db.posts.filter((x) => x.id !== p.id)
    return wait(true)
  },
}
