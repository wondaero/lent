#!/usr/bin/env node
// 옛 도서관 DB(MariaDB lib_* 테이블) CSV 덤프 → 새 Supabase 스키마로 넣을 SQL 생성.
// 규칙의 근거와 결정 사항은 doc/migration.md. 이 스크립트가 그 규칙의 실제 구현이다.
//
//   node scripts/legacy-import.mjs [덤프 폴더=doc/db]
//   → <덤프 폴더>/out/import.sql  (개인정보 포함, git 제외 폴더)
//   → <덤프 폴더>/out/report.md   (사람이 확인할 목록·건수)
//
// 덤프를 새로 떠서 같은 폴더에 넣고 다시 실행하면 된다. 테이블마다 파일명이 가장 최근(이름순 마지막)인 CSV를 쓴다.
// 컬럼 구성이 예상과 다르면 멈춘다(옛 DB 구조가 바뀐 것 → 규칙 확인 필요).
import fs from 'node:fs'
import path from 'node:path'
import { callSortKey, makeAuthorMark, isAuthorMarkOk, normalizeAuthorMark } from '../src/lib/callNumber.js'
import { normalizeRegNo, parseRegNo } from '../src/lib/regNo.js'

const DIR = path.resolve(process.argv[2] || 'doc/db')
const OUT = path.join(DIR, 'out')

const EXPECT = {
  lib_books: ['book_cde', 'author_cde', 'author_cde_chk', 'storage_cde', 'isbn', 'isbn2', 'series_title', 'title', 'pub_info', 'author_info', 'series_no', 'claim_no', 'copy_no', 'class_no', 'pub_year_info', 'book_opt', 'with_things', 'rent_yn', 'book_sts', 'reservation', 'reg_dt', 'monthly_rent_cnt', 'total_rent_cnt', 'memo'],
  lib_members: ['mbr_seq', 'mbr_cde', 'mbr_nm', 'mbr_tel', 'mbr_email', 'mbr_gender', 'mbr_birth', 'mbr_address', 'mbr_grade', 'approval_yn', 'mbr_opt', 'mbr_sts', 'sign_up_dt', 'del_yn', 'mbr_id', 'mbr_pw', 'mbr_mx_date', 'mbr_mx_cnt', 'monthly_rent_cnt', 'total_rent_cnt', 'overdue_cnt', 'memo'],
  lib_rent_history: ['rent_history_seq', 'book_cde', 'mbr_cde', 'rent_dt', 'return_dt', 'rent_sts', 'rent_sts2', 'is_overdue'],
  lib_rent_book: ['rent_seq', 'mbr_cde', 'book_cde', 'rent_dt', 'return_dt'],
}

/* ───────────── CSV ───────────── */
// RFC 4180(따옴표 안의 쉼표·줄바꿈·"" 처리). DBeaver 기본 내보내기 형식
function parseCsv(text) {
  const rows = []
  let row = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false }
      else cell += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.length > 1 || r[0] !== '')
}

function load(table) {
  // DBeaver 파일명 = 테이블명_내보낸시각(12자리).csv. 백업 테이블(lib_books_20220515 등)은 이름이 달라 자동으로 빠짐
  const re = new RegExp(`^${table}(_\\d{12})?\\.csv$`)
  const files = fs.readdirSync(DIR).filter((f) => re.test(f)).sort()
  if (!files.length) throw new Error(`${DIR}에 ${table} CSV가 없습니다.`)
  const file = files.at(-1)
  const [head, ...rows] = parseCsv(fs.readFileSync(path.join(DIR, file), 'utf8').replace(/^﻿/, ''))
  const exp = EXPECT[table]
  if (head.join() !== exp.join()) {
    throw new Error(`${file}: 컬럼 구성이 예상과 다릅니다. 옛 DB 구조가 바뀌었는지 확인하세요.\n  예상: ${exp.join(', ')}\n  실제: ${head.join(', ')}`)
  }
  return { file, rows: rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])) ) }
}

/* ───────────── 값 정리 ───────────── */
const NOW = { raw: 'now()' } // 옛 값이 0000-00-00인 등록·가입일 → 이관 시각
// Object.groupBy는 Node 21+ → 직접 구현
const groupBy = (arr, fn) => arr.reduce((o, x) => ((o[fn(x)] ||= []).push(x), o), {})
const t = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const orNull = (v) => (t(v) === '' ? null : t(v))
// DBeaver "Database native" 형식은 날짜를 '2022-03-15 15:19:34.000'처럼 작은따옴표로 감싼다
const rawDate = (v) => t(v).replace(/^'|'$/g, '')
function kstTimestamp(v) {
  const s = rawDate(v)
  if (!s || s.startsWith('0000')) return null
  const m = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/)
  return m ? `${m[1]} ${m[2] || '00:00:00'}+09` : null
}
function dateOnly(v) {
  const s = rawDate(v)
  if (!s || s.startsWith('0000')) return null
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCMonth() === +m[2] - 1 ? `${m[1]}-${m[2]}-${m[3]}` : null
}
const addDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const noTrailingDot = (v) => orNull(t(v).replace(/\s*\.+$/, ''))

function phone(v) {
  const d = t(v).replace(/\D/g, '')
  if (!d) return { value: null }
  if (d.length === 11) return { value: `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}` }
  if (d.length === 10) return { value: d.startsWith('02') ? `02-${d.slice(2, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` }
  if (d.length === 9 && d.startsWith('02')) return { value: `02-${d.slice(2, 5)}-${d.slice(5)}` }
  return { value: t(v), odd: true }
}
function isbn(a, b) {
  const clean = (v) => t(v).replace(/[\s-]/g, '').toUpperCase().replace(/:.*$/, '')
  const x = clean(a) || clean(b)
  return /^(\d{9}[\dX]|\d{13})$/.test(x) ? x : orNull(x)
}

const BOOK_STATUS = { rent: 'available', '': 'available', hold: 'hold', readOnly: 'readonly' }
const LEGACY_HOLD_REASON = '기존 보류'

/* ───────────── 변환 ───────────── */
const books = load('lib_books')
const members = load('lib_members')
const history = load('lib_rent_history')
const current = load('lib_rent_book')
const report = { check: [], counts: {} }
const note = (section, text) => report.check.push({ section, text })

// 회원 ─ 번호 없는 회원(옛 웹 가입 승인 대기)은 기존 최대 번호 다음부터
const maxNo = Math.max(0, ...members.rows.map((m) => +m.mbr_cde || 0))
let nextNo = maxNo + 1
const memberRows = []
const memberByCde = new Map()
const firstLoan = new Map()
for (const h of history.rows) {
  const d = dateOnly(h.rent_dt)
  if (d && (!firstLoan.has(h.mbr_cde) || d < firstLoan.get(h.mbr_cde))) firstLoan.set(h.mbr_cde, d)
}
for (const m of [...members.rows].sort((a, b) => +a.mbr_seq - +b.mbr_seq)) {
  const id = memberRows.length + 1
  const no = t(m.mbr_cde) ? +m.mbr_cde : nextNo++
  if (!t(m.mbr_cde)) note('회원', `회원번호가 없어 새 번호 ${no} 부여 (옛 mbr_seq ${m.mbr_seq})`)
  const p = phone(m.mbr_tel)
  if (p.odd) note('회원', `회원 ${no}: 전화번호 형식이 특이해 원문 그대로 둠`)
  const name = t(m.mbr_nm) || '(이름 없음)'
  if (!t(m.mbr_nm)) note('회원', `회원 ${no}: 이름 없음 → "(이름 없음)"`)
  const limit = +m.mbr_mx_cnt || 0
  const days = +m.mbr_mx_date || 0
  if (!limit || !days) note('회원', `회원 ${no}: 대출 권수 ${limit} / 기간 ${days}일 (0이면 대출 불가)`)
  const row = {
    id, member_no: no, name, phone: p.value, birth_date: dateOnly(m.mbr_birth),
    gender: { 남자: 'M', 여자: 'F' }[t(m.mbr_gender)] ?? null, address: orNull(m.mbr_address),
    loan_limit: limit, loan_days: days, status: 'active', memo: orNull(m.memo),
    created_at: kstTimestamp(m.sign_up_dt) || (firstLoan.get(m.mbr_cde) ? `${firstLoan.get(m.mbr_cde)} 00:00:00+09` : NOW),
  }
  memberRows.push(row)
  if (t(m.mbr_cde)) memberByCde.set(t(m.mbr_cde), row)
}
// 옛 아이디·비밀번호·이메일·등급·승인 여부는 옮기지 않음(웹 회원 기능 없앰)

// 대출 중(lib_rent_book) ─ 반납 예정일은 여기에만 있음
const openDue = new Map()
for (const r of current.rows) {
  if (!t(r.book_cde) || !t(r.mbr_cde)) continue // 옛 시스템의 빈 행
  openDue.set(`${t(r.book_cde)}|${t(r.mbr_cde)}`, dateOnly(r.return_dt))
}

// 도서 ─ 등록번호 정리(2026-11-08 실제 데이터 검토로 정한 규칙)
//   1) normalizeRegNo(앱과 같은 함수): 공백 제거 + 한글 자판으로 들어간 글자 되돌리기(뜨00004055 → EM00004055)
//   2) 그래도 형식이 아니면 안에 든 "EM+8자리"를 살린다(EM00002838EM00002838, EM000030459788990566171, ㄷM00002622ㄷ)
//   3) 같은 번호가 이미 있고 서명도 같으면 = 같은 책을 두 번 등록한 것 → 나중 것을 버리고 대출 기록은 남긴 쪽으로 연결
//      (옛 시스템이 2021-09 "뜨 → EM" 정리 때 EM 행을 새로 만들고 뜨 행을 안 지운 것, 앞에 공백이 붙은 재등록 등)
//   4) 서명이 비었거나 자모 한 글자뿐이고 대출 기록이 없으면 시험 입력으로 보고 버린다(등록번호 "2", 서명 "ㅏ")
//   등록번호 칸에 ISBN이 들어간 책 등 나머지는 그대로 넣고 보고서에 적는다(책에 붙은 실제 바코드를 사람이 확인)
const bookRows = []
const bookByCode = new Map()
const bookByReg = new Map()
const sameTitle = (x, y) => t(x).replace(/[\s.]/g, '') === t(y).replace(/[\s.]/g, '')
const normalized = books.rows.map((b) => {
  const raw = b.book_cde
  const n = normalizeRegNo(raw)
  if (parseRegNo(n) != null) return { b, raw, reg: n }
  const inner = n.match(/EM\d{8}/)?.[0]
  return inner ? { b, raw, reg: inner, salvaged: true } : { b, raw, reg: t(raw) }
})
const loanedCodes = new Set(history.rows.map((h) => t(h.book_cde)))
// 원문이 이미 정확한 번호인 행을 먼저 처리 → 잘못 들어간 쪽(공백·뜨·덧붙음)이 중복으로 밀려난다
normalized.sort((x, y) => (x.raw === x.reg ? 0 : 1) - (y.raw === y.reg ? 0 : 1))
for (const { b, raw, reg: wanted, salvaged } of normalized) {
  let reg = wanted
  if (!t(b.title).replace(/^[ㄱ-ㅣ]$/, '') && !loanedCodes.has(t(raw))) {
    note('도서 등록번호', `시험 입력으로 보여 제외 "${raw}": 서명 "${t(b.title)}"`)
    continue
  }
  const kept = bookByReg.get(wanted)
  if (kept) {
    if (sameTitle(kept.title, b.title)) {
      note('도서 등록번호', `같은 책 중복 등록이라 제외 "${raw}" (${rawDate(b.reg_dt).slice(0, 10)} 등록, 남긴 번호 ${kept.reg_no}): ${t(b.title)}`)
      bookByCode.set(t(raw), kept) // 이 번호를 가리키는 대출 기록은 남긴 책으로
      continue
    }
    reg = t(raw)
    note('도서 등록번호', `"${raw}" → "${wanted}"는 서명이 다른 책이 이미 써서 원문 그대로 둠: ${t(b.title)}`)
    if (bookByReg.has(reg)) { note('도서 등록번호', `원문 번호도 겹쳐 제외 "${raw}": ${t(b.title)}`); continue }
  } else if (salvaged) {
    note('도서 등록번호', `"${raw}" → "${wanted}" (번호 안의 EM+8자리를 살림): ${t(b.title)}`)
  } else if (wanted !== raw && parseRegNo(wanted) != null) {
    report.counts['등록번호 자동 보정'] = (report.counts['등록번호 자동 보정'] || 0) + 1
  }
  if (parseRegNo(reg) == null) note('도서 등록번호', `형식이 EM+8자리가 아님 "${reg}" → 서가에서 실제 바코드 확인 후 도서 수정: ${t(b.title)}`)
  let status = BOOK_STATUS[t(b.book_sts)]
  if (!status) { note('도서 상태', `처음 보는 상태 "${b.book_sts}" → 대출가능으로: ${reg}`); status = 'available' }
  // 대출중 여부는 아래에서 "실제로 넣는 대출 기록" 기준으로 다시 맞춘다
  const row = {
    id: bookRows.length + 1, reg_no: reg, isbn: isbn(b.isbn, b.isbn2),
    title: noTrailingDot(b.title) || '(서명 없음)', series_title: noTrailingDot(b.series_title),
    author: t(b.author_info), publisher: orNull(t(b.pub_info).split(':').at(-1)),
    pub_year: t(b.pub_year_info).match(/(1[89]|20)\d{2}/)?.[0] ?? null,
    // 저자기호는 앱과 같은 정규화(끝 글자 "다" → "ㄷ"): 안 하면 "마83다"로 검색해도 못 찾음
    class_no: t(b.class_no), author_mark: orNull(normalizeAuthorMark(t(b.author_cde))),
    volume: orNull(b.claim_no) ?? orNull(b.series_no), copy_no: orNull(b.copy_no),
    status, hold_reason: status === 'hold' ? LEGACY_HOLD_REASON : null,
    spine_label_printed: t(b.author_cde_chk) === 'y', memo: orNull(b.memo),
    created_at: kstTimestamp(b.reg_dt) || NOW,
  }
  // 저자기호가 형식에 안 맞으면(옛 시스템이 "글·그림: …"의 "글"을 이름으로 읽어 "글undefinedundefinedㅍ"를 저장) 제안값과 함께 보고
  if (!isAuthorMarkOk(row.author_mark)) {
    const s = makeAuthorMark({ title: row.title, seriesTitle: row.series_title || '', author: row.author })
    note('저자기호', `${reg} "${row.author_mark ?? '(없음)'}" 형식이 이상함 → 제안 ${s.mark ?? '(직접 입력)'}: ${row.title}`)
  }
  if (row.author_mark && row.author_mark !== t(b.author_cde)) report.counts['저자기호 정규화(끝 글자 → 초성)'] = (report.counts['저자기호 정규화(끝 글자 → 초성)'] || 0) + 1
  row.call_sort_key = callSortKey(row)
  bookRows.push(row)
  bookByCode.set(t(raw), row)
  bookByCode.set(reg, row)
  bookByReg.set(reg, row)
}

// 대출 기록 ─ 예정일: 대출 중이면 lib_rent_book, 반납 완료면 대출일 + 회원 대출기간.
//   예정일보다 늦게 반납했는데 옛 연체 표시가 없으면 연장으로 보고 연장일 = 반납일
const loanRows = []
for (const h of [...history.rows].sort((a, b) => +a.rent_history_seq - +b.rent_history_seq)) {
  const code = t(h.book_cde)
  const book = bookByCode.get(code) ?? bookByCode.get(normalizeRegNo(code))
  const member = memberByCde.get(t(h.mbr_cde))
  if (!member) { note('대출 기록', `회원 ${h.mbr_cde}이(가) 없어 제외 (기록 ${h.rent_history_seq})`); continue }
  const loaned = dateOnly(h.rent_dt)
  if (!loaned) { note('대출 기록', `대출일이 없어 제외 (기록 ${h.rent_history_seq})`); continue }
  const returned = dateOnly(h.return_dt)
  const days = member.loan_days || 14
  let due = addDays(loaned, days)
  let extended = null
  if (!returned) {
    const d = openDue.get(`${code}|${t(h.mbr_cde)}`)
    if (d) due = d
    else note('대출 기록', `대출 중인데 반납 예정일이 없어 대출일 + ${days}일로 (기록 ${h.rent_history_seq})`)
  } else if (returned > due && t(h.is_overdue) !== 'y') {
    extended = returned
  }
  if (!book) report.counts['삭제된 도서의 대출 기록'] = (report.counts['삭제된 도서의 대출 기록'] || 0) + 1
  loanRows.push({
    id: loanRows.length + 1, book_id: book?.id ?? null, book_reg_no: book?.reg_no ?? code, book_title: book?.title ?? null,
    member_id: member.id, loaned_at: `${loaned} 00:00:00+09`, due_at: `${due} 00:00:00+09`,
    extended_due_at: extended ? `${extended} 00:00:00+09` : null, returned_at: returned ? `${returned < loaned ? loaned : returned} 12:00:00+09` : null,
  })
}
// 같은 책이 동시에 두 번 대출 중이면 DB 제약에 걸린다 → 미리 확인
const openPerBook = new Map()
for (const l of loanRows) if (!l.returned_at && l.book_id) openPerBook.set(l.book_id, (openPerBook.get(l.book_id) || 0) + 1)
for (const [id, n] of openPerBook) if (n > 1) throw new Error(`도서 id ${id}가 동시에 ${n}번 대출 중입니다. 옛 데이터를 확인하세요.`)
// 도서 상태를 실제로 넣는 대출 기록과 맞춘다. 원문 코드만 보고 정하면 어긋난다:
//   중복으로 뺀 행·번호 보정된 책의 미반납 기록 → 대출 기록은 있는데 책은 "대출가능"(스캔하면 대출로 분류되고 DB 제약에 걸림)
//   회원이 없어 뺀 미반납 기록 → 대출 기록 없이 영원히 "대출중"
for (const b of bookRows) {
  const open = openPerBook.has(b.id)
  if (open && b.status !== 'loaned') {
    if (b.status !== 'available') note('도서 상태', `${b.reg_no}: 상태가 "${b.status}"인데 대출 중 → 대출중으로`)
    b.status = 'loaned'
    b.hold_reason = null
  } else if (!open && b.status === 'loaned') {
    note('도서 상태', `${b.reg_no}: 대출중인데 넣을 대출 기록이 없음(회원 없음 등) → 대출가능으로: ${b.title}`)
    b.status = 'available'
  }
}

/* ───────────── SQL ───────────── */
const lit = (v) => (v === NOW ? v.raw : v == null ? 'null' : typeof v === 'boolean' || typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
function inserts(table, rows, cols) {
  const out = []
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500).map((r) => `(${cols.map((c) => lit(r[c])).join(', ')})`)
    out.push(`insert into public.${table} (${cols.join(', ')}) overriding system value values\n${chunk.join(',\n')};`)
  }
  return out
}
const maxEm = Math.max(0, ...bookRows.map((b) => parseRegNo(b.reg_no) ?? 0))
const head = `-- 옛 DB 이관 데이터. scripts/legacy-import.mjs가 생성(${new Date().toISOString()}). 직접 고치지 말 것
-- 원본: ${[books, members, history, current].map((x) => x.file).join(', ')}`
// 첫 문장: 로그인 계정(auth)·직원 명단(staff)만 남기고 앱 데이터를 모두 비운다(사용자 결정).
//   이관은 전환하는 날 한 번 하는 작업 → 그 전에 새 시스템에서 시험한 대출/반납·등록·게시글도 함께 지워진다.
//   게시글 사진 "파일"(Storage)은 DB를 비워도 남으므로 전환 전에 게시판 화면에서 시험 글을 지운다(doc/migration.md).
const first = `truncate public.loans, public.post_images, public.posts, public.books, public.members restart identity;`
// 마지막 문장: 번호 재설정·이관 시각. 중간에 실패하면 처음부터 다시 실행하면 된다(첫 파일이 비우고 시작)
const last = `select setval(pg_get_serial_sequence('public.members', 'id'), (select coalesce(max(id), 1) from public.members));
select setval(pg_get_serial_sequence('public.books', 'id'), (select coalesce(max(id), 1) from public.books));
select setval(pg_get_serial_sequence('public.loans', 'id'), (select coalesce(max(id), 1) from public.loans));
-- 바코드 라벨 마지막 번호 = 이관한 책의 가장 큰 EM 번호(시험으로 출력한 번호는 버린다)
insert into public.settings (key, value) values ('barcode_last_issued_no', to_jsonb(${maxEm}))
  on conflict (key) do update set value = excluded.value;
-- 이관한 시각(기록용)
insert into public.settings (key, value) values ('legacy_imported_at', to_jsonb(now()))
  on conflict (key) do update set value = excluded.value;`
const body = [
  ...inserts('members', memberRows, ['id', 'member_no', 'name', 'phone', 'birth_date', 'gender', 'address', 'loan_limit', 'loan_days', 'status', 'memo', 'created_at']),
  ...inserts('books', bookRows, ['id', 'reg_no', 'isbn', 'title', 'series_title', 'author', 'publisher', 'pub_year', 'class_no', 'author_mark', 'volume', 'copy_no', 'call_sort_key', 'status', 'hold_reason', 'spine_label_printed', 'memo', 'created_at']),
  ...inserts('loans', loanRows, ['id', 'book_id', 'book_reg_no', 'book_title', 'member_id', 'loaned_at', 'due_at', 'extended_due_at', 'returned_at']),
]
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(path.join(OUT, 'parts'), { recursive: true })
// 한 파일(psql 등으로 한 번에 넣을 때, 트랜잭션 하나)
fs.writeFileSync(path.join(OUT, 'import.sql'), `${head}\nbegin;\n${first}\n${body.join('\n')}\n${last}\ncommit;\n`)
// 나눈 파일(supabase db query는 요청 크기 제한이 있음 → 약 400KB씩). 01부터 순서대로 실행
const parts = [[first]]
for (const stmt of body) {
  const cur = parts.at(-1)
  if (cur.join('\n').length + stmt.length > 400_000) parts.push([stmt])
  else cur.push(stmt)
}
parts.at(-1).push(last)
parts.forEach((p, i) => fs.writeFileSync(path.join(OUT, 'parts', `${String(i + 1).padStart(2, '0')}.sql`), `${head}\n-- ${i + 1}/${parts.length}\n${p.join('\n')}\n`))

const bySection = groupBy(report.check, (x) => x.section)
const md = `# 이관 보고서

생성: ${new Date().toLocaleString('ko-KR')} · 원본 \`${path.relative(process.cwd(), DIR)}\`

| 테이블 | 원본 | 넣을 건수 |
|---|---|---|
| 회원 | ${members.file} (${members.rows.length}) | ${memberRows.length} |
| 도서 | ${books.file} (${books.rows.length}) | ${bookRows.length} |
| 대출 기록 | ${history.file} (${history.rows.length}) + ${current.file} (${current.rows.length}) | ${loanRows.length} (대출 중 ${loanRows.filter((l) => !l.returned_at).length}) |

- 도서 상태: ${Object.entries(groupBy(bookRows, (b) => b.status)).map(([k, v]) => `${k} ${v.length}`).join(', ')}
- 바코드 라벨 마지막 번호: EM${String(maxEm).padStart(8, '0')}
${Object.entries(report.counts).map(([k, v]) => `- ${k}: ${v}건`).join('\n')}

## 사람이 확인할 것
${Object.entries(bySection).map(([s, items]) => `\n### ${s} (${items.length})\n${items.map((x) => `- ${x.text}`).join('\n')}`).join('\n') || '\n없음'}
`
fs.writeFileSync(path.join(OUT, 'report.md'), md)
console.log(md.split('## 사람이 확인할 것')[0])
console.log(`확인할 항목 ${report.check.length}건 → ${path.relative(process.cwd(), path.join(OUT, 'report.md'))}`)
console.log(`SQL → ${path.relative(process.cwd(), path.join(OUT, 'parts'))}/01~${String(parts.length).padStart(2, '0')}.sql (순서대로 실행), 한 파일: ${path.relative(process.cwd(), path.join(OUT, 'import.sql'))}`)
