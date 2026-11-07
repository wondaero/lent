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
import { callSortKey } from '../src/lib/callNumber.js'
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

// 도서 ─ 등록번호 정리. 정리 후 다른 책과 겹치면 원문 유지(사람이 확인)
const bookRows = []
const bookByCode = new Map()
const origCodes = new Set(books.rows.map((b) => b.book_cde))
const usedReg = new Set()
const normalized = books.rows.map((b) => {
  const raw = b.book_cde
  const n = normalizeRegNo(raw)
  return { b, raw, reg: parseRegNo(n) != null ? n : t(raw) }
})
const regCount = new Map()
for (const x of normalized) regCount.set(x.reg, (regCount.get(x.reg) || 0) + 1)
const activeBooks = new Set()
for (const h of history.rows) if (!t(h.return_dt)) activeBooks.add(t(h.book_cde))
// 원문이 이미 정확한 번호인 행을 먼저 처리 → 공백·한글 자판으로 잘못 들어간 중복 등록이 밀려난다
//   (예: " EM00005724"(2022)와 "EM00005724"(2024)가 같은 책 → 대출 기록이 가리키는 정상 번호 쪽을 남김)
normalized.sort((x, y) => (x.raw === x.reg ? 0 : 1) - (y.raw === y.reg ? 0 : 1))
for (const { b, raw, reg: wanted } of normalized) {
  let reg = wanted
  if (wanted !== t(raw) && (regCount.get(wanted) > 1 || origCodes.has(wanted))) {
    reg = t(raw)
    note('도서 등록번호', `"${raw}" → "${wanted}"로 바꾸면 다른 책과 겹쳐 그대로 둠: ${t(b.title)}`)
  } else if (wanted !== raw && parseRegNo(wanted) != null) {
    report.counts['등록번호 자동 보정'] = (report.counts['등록번호 자동 보정'] || 0) + 1
  }
  if (parseRegNo(reg) == null) note('도서 등록번호', `형식이 EM+8자리가 아님 "${reg}": ${t(b.title)}`)
  if (usedReg.has(reg)) { note('도서 등록번호', `같은 등록번호가 이미 있어 제외(중복 등록) "${raw}" (${rawDate(b.reg_dt).slice(0, 10)} 등록): ${t(b.title)}`); continue }
  usedReg.add(reg)
  let status = BOOK_STATUS[t(b.book_sts)]
  if (!status) { note('도서 상태', `처음 보는 상태 "${b.book_sts}" → 대출가능으로: ${reg}`); status = 'available' }
  if (activeBooks.has(t(raw))) {
    if (status !== 'available') note('도서 상태', `${reg}: 상태가 "${b.book_sts}"인데 대출 중 → 대출중으로`)
    status = 'loaned'
  }
  const row = {
    id: bookRows.length + 1, reg_no: reg, isbn: isbn(b.isbn, b.isbn2),
    title: noTrailingDot(b.title) || '(서명 없음)', series_title: noTrailingDot(b.series_title),
    author: t(b.author_info), publisher: orNull(t(b.pub_info).split(':').at(-1)),
    pub_year: t(b.pub_year_info).match(/(1[89]|20)\d{2}/)?.[0] ?? null,
    class_no: t(b.class_no), author_mark: orNull(b.author_cde),
    volume: orNull(b.claim_no) ?? orNull(b.series_no), copy_no: orNull(b.copy_no),
    status, hold_reason: status === 'hold' ? LEGACY_HOLD_REASON : null,
    spine_label_printed: t(b.author_cde_chk) === 'y', memo: orNull(b.memo),
    created_at: kstTimestamp(b.reg_dt) || NOW,
  }
  row.call_sort_key = callSortKey(row)
  bookRows.push(row)
  bookByCode.set(t(raw), row)
  bookByCode.set(reg, row)
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
// 첫 문장: 새 시스템에서 이미 대출/반납을 처리했으면 덮어쓰지 않는다(이관 후 실제 운영 데이터 보호) → 비우고 시작
const first = `do $$
declare v_at timestamptz := (select (value #>> '{}')::timestamptz from public.settings where key = 'legacy_imported_at');
begin
  if v_at is not null and exists (select 1 from public.loans where loaned_at > v_at or returned_at > v_at) then
    raise exception '이관 이후 새 시스템에서 처리한 대출/반납이 있어 다시 이관할 수 없습니다.';
  end if;
end $$;
truncate public.loans, public.books, public.members restart identity;`
// 마지막 문장: 이관 완료 표시는 맨 끝에만 → 중간에 실패하면 "이관 완료"가 아니므로 처음부터 다시 실행하면 된다
const last = `select setval(pg_get_serial_sequence('public.members', 'id'), (select coalesce(max(id), 1) from public.members));
select setval(pg_get_serial_sequence('public.books', 'id'), (select coalesce(max(id), 1) from public.books));
select setval(pg_get_serial_sequence('public.loans', 'id'), (select coalesce(max(id), 1) from public.loans));
insert into public.settings (key, value) values ('barcode_last_issued_no', to_jsonb(${maxEm}))
  on conflict (key) do update set value = to_jsonb(greatest((public.settings.value #>> '{}')::int, ${maxEm}));
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
