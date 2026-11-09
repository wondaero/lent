// Supabase 데이터 레이어(.env.local이 있을 때). 반환 형태는 mock.js와 같아야 한다(화면은 둘을 구분하지 않음).
// - 목록 조합(도서+대출, 회원+대출 권수, 대출+도서+회원)은 DB view(book_list / member_list / loan_list)가 만든다.
// - 여러 테이블을 바꾸는 처리(대출/반납, 연장, 바코드 번호)는 DB 함수(RPC)로 → 일부만 반영되는 일 없음.
// - 청구기호 해석은 앱의 parseCallQuery(규칙 한 곳), DB에는 해석된 조건만 보낸다.
// 스키마: supabase/migrations/
import { getClient, SUPABASE_URL, SUPABASE_KEY, bearer } from './supabase'
import { CATALOG } from './devCatalog'
import { trendBuckets, bucketIndex } from './trend'
import { callSortKey, normalizeAuthorMark, parseCallQuery, hasCallTokens, classPrefix } from '@/lib/callNumber'
import { fmtDate } from '@/lib/format'
import { fmtRegNo, normalizeRegNo, parseRegNo } from '@/lib/regNo'
import { POST_CATEGORY, POST_PHOTO } from '@/lib/constants'

const BUCKET = 'post-images'

/* ───────────── 공통 ───────────── */
// DB 오류 → 화면에 보여줄 한국어 메시지. RPC에서 raise한 메시지는 이미 한국어라 그대로
function toError(error, fallback = '처리하지 못했습니다.') {
  if (!error) return new Error(fallback)
  if (error.code === '23505') return new Error('이미 사용 중인 값입니다.')
  if (error.code === '42501' || error.code === 'PGRST301') return new Error('권한이 없습니다. 다시 로그인해주세요.')
  if (/Failed to fetch|NetworkError|Load failed/i.test(error.message || '')) return new Error('서버에 연결하지 못했습니다. 인터넷 연결을 확인해주세요.')
  return new Error(error.message || fallback)
}
async function run(query) {
  const { data, error, count } = await query
  if (error) throw toError(error)
  return { data, count }
}
const sb = () => getClient()
const pageRange = (page = 1, perPage = 20) => [(page - 1) * perPage, page * perPage - 1]

// PostgREST or() 문법에 사용자 입력을 넣을 때: 큰따옴표로 감싸고 \ " 이스케이프
const quote = (v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
// LIKE 특수문자(% _ \)를 글자 그대로 찾게
const escLike = (v) => String(v).replace(/[\\%_]/g, '\\$&')
const contains = (col, kw) => `${col}.ilike.${quote(`%${escLike(kw)}%`)}`

// 입력칸의 빈 문자열 → null(날짜·체크 제약이 있는 컬럼)
const blankToNull = (v) => (v === '' || v === undefined ? null : v)
// 날짜(YYYY-MM-DD) → 그날 0시(브라우저 시간 = 한국시간)
const dayStart = (ymd) => new Date(`${ymd}T00:00:00`).toISOString()
const dayAfter = (ymd) => { const d = new Date(`${ymd}T00:00:00`); d.setDate(d.getDate() + 1); return d.toISOString() }

/* ───────────── 도서 ───────────── */
const BOOK_FIELDS = ['reg_no', 'isbn', 'title', 'series_title', 'author', 'publisher', 'pub_year', 'class_no', 'author_mark', 'volume', 'copy_no', 'status', 'hold_reason', 'memo']
const pickBook = (data) => Object.fromEntries(BOOK_FIELDS.filter((k) => k in data).map((k) => [k, data[k]]))

function checkHold(data) {
  if (data.status == null) return data
  data = { ...data, hold_reason: data.status === 'hold' ? (data.hold_reason || '').trim() : null }
  if (data.status === 'hold' && !data.hold_reason) throw new Error('대출보류 사유를 입력해주세요.')
  return data
}

export const books = {
  // sort: 'recent'(최신 등록) | 'call'(청구기호 = 서가 순서) | 'title'
  async list({ page = 1, perPage = 20, keyword = '', status = '', label = '', category = '', sort = 'recent' } = {}) {
    // 한글 자판으로 찍힌 등록번호("뜨00004055")도 찾는다. 청구기호 해석 전에 변환해야 저자기호로 오인하지 않음
    const asReg = normalizeRegNo(keyword)
    const q = parseCallQuery(parseRegNo(asReg) != null ? asReg : keyword)
    const kw = q.rest.trim()
    let query = (await sb()).from('book_list').select('*', { count: 'exact' })
    if (hasCallTokens(q)) {
      if (q.classNo) query = query.like('class_no', `${escLike(classPrefix(q.classNo))}%`)
      if (q.authorMark) query = query.ilike('author_mark', `${escLike(q.authorMark)}%`)
      if (q.volume) query = query.eq('volume', q.volume)
      if (q.copy) query = query.eq('copy_no', q.copy)
    }
    if (kw) {
      query = query.or([`reg_no.ilike.${quote(escLike(kw))}`, ...['title', 'series_title', 'author', 'publisher', 'isbn'].map((c) => contains(c, kw))].join(','))
    }
    if (status) query = query.eq('status', status)
    if (label === 'unprinted') query = query.eq('spine_label_printed', false)
    if (category !== '') query = query.like('class_no', `${category}%`)
    if (sort === 'call') query = query.order('call_sort_key').order('id')
    else if (sort === 'title') query = query.order('title').order('id')
    else query = query.order('id', { ascending: false })
    const { data, count } = await run(query.range(...pageRange(page, perPage)))
    return { rows: data, total: count ?? 0 }
  },
  // 대출 중이면 loan = { due_at, member_name, member_id } (도서 상세에서 대출자 표시)
  async get(id) {
    const { data } = await run((await sb()).from('book_list').select('*').eq('id', id).maybeSingle())
    if (!data) throw new Error('도서를 찾을 수 없습니다.')
    return data
  },
  async getByRegNo(regNo) {
    const { data } = await run((await sb()).from('books').select('*').eq('reg_no', normalizeRegNo(regNo)).maybeSingle())
    if (!data) throw new Error(`등록번호 "${regNo}" 도서를 찾을 수 없습니다.`)
    return data
  },
  // 바코드 라벨: 마지막 출력 번호 = max(설정값, 등록된 책의 가장 큰 EM 번호). 여러 PC가 동시에 출력해도 겹치지 않게 DB 함수로
  async barcodeState() {
    const { data } = await run((await sb()).rpc('barcode_last_issued'))
    return { lastIssued: data, next: fmtRegNo(data + 1) }
  },
  // 시작 번호는 직접 입력 가능. 끝 번호가 마지막 번호보다 크면 그 값으로 올리고, 작으면(다시 뽑기) 그대로.
  // expected = 화면이 보고 있던 마지막 번호(그 사이 다른 PC가 출력했으면 거부)
  async issueBarcodes(from, count, expected) {
    const { data } = await run((await sb()).rpc('barcode_issue', { p_from: from, p_count: count, p_expected: expected }))
    return { lastIssued: data, next: fmtRegNo(data + 1) }
  },
  // 인쇄 취소: 인쇄 전 마지막 번호(prev)로 되돌림
  async releaseBarcodes(from, count, prev) {
    const { error, data } = await (await sb()).rpc('barcode_release', { p_from: from, p_count: count, p_prev: prev })
    if (error) throw new Error(`이미 다음 번호가 사용되어 되돌리지 않았습니다. ${fmtRegNo(from)} ~ ${fmtRegNo(from + count - 1)}은(는) 건너뜁니다.`)
    return { lastIssued: data, next: fmtRegNo(data + 1) }
  },
  async create(input) {
    const reg = normalizeRegNo(input.reg_no)
    if (parseRegNo(reg) == null) throw new Error('등록번호 형식이 올바르지 않습니다. (예: EM00005724)')
    const data = checkHold({ ...pickBook(input), reg_no: reg, status: input.status || 'available' })
    data.author_mark = normalizeAuthorMark(data.author_mark)
    data.call_sort_key = callSortKey(data)
    const { data: row, error } = await (await sb()).from('books').insert({ ...data, spine_label_printed: false }).select().single()
    if (error?.code === '23505') throw new Error('이미 사용 중인 등록번호입니다.')
    if (error) throw toError(error)
    return row
  },
  async update(id, input) {
    let data = pickBook(input)
    if (data.reg_no != null) {
      data.reg_no = normalizeRegNo(data.reg_no)
      if (parseRegNo(data.reg_no) == null) throw new Error('등록번호 형식이 올바르지 않습니다. (예: EM00005724)')
    }
    data = checkHold(data)
    // 청구기호 요소가 바뀌면 서가순 정렬 키도 다시 계산(현재 값과 합쳐서)
    const cur = await books.get(id)
    const next = { ...cur, ...data }
    data.author_mark = normalizeAuthorMark(next.author_mark)
    data.call_sort_key = callSortKey({ ...next, author_mark: data.author_mark })
    const { data: row, error } = await (await sb()).from('books').update(data).eq('id', id).select().single()
    if (error?.code === '23505') throw new Error('이미 사용 중인 등록번호입니다.')
    if (error) throw toError(error)
    return row
  },
  async remove(id) {
    const b = await books.get(id)
    if (b.status === 'loaned') throw new Error('대출 중인 도서는 삭제할 수 없습니다.')
    // 대출 기록은 남는다(book_id만 비고 등록번호·서명은 기록에 저장돼 있음)
    await run((await sb()).from('books').delete().eq('id', id))
    return true
  },
  // ISBN 서지 조회(Edge Function isbn-lookup = KOLIS-NET 프록시) → 후보 배열 + total
  async lookupIsbn(isbn) {
    const code = isbn.replace(/-/g, '').trim()
    const ext = CATALOG.filter((c) => c.isbn === code)
    if (ext.length) return structuredClone(ext)
    const res = await fetch(`${SUPABASE_URL}/functions/v1/isbn-lookup?isbn=${encodeURIComponent(code)}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${await bearer()}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `서지 조회 실패 (${res.status})`)
    if (!body.rows?.length) throw new Error('검색 결과가 없습니다.')
    const rows = body.rows
    rows.total = body.total
    return rows
  },
  async markLabelPrinted(ids) {
    if (!ids.length) return true
    await run((await sb()).from('books').update({ spine_label_printed: true }).in('id', ids))
    return true
  },
  async byIds(ids) {
    if (!ids.length) return []
    const { data } = await run((await sb()).from('books').select('*').in('id', ids.map(Number)))
    return data
  },
}

/* ───────────── 회원 ───────────── */
const MEMBER_FIELDS = ['name', 'phone', 'birth_date', 'gender', 'address', 'loan_limit', 'loan_days', 'status', 'memo']
const pickMember = (data) => {
  const out = Object.fromEntries(MEMBER_FIELDS.filter((k) => k in data).map((k) => [k, data[k]]))
  for (const k of ['birth_date', 'gender', 'phone', 'address', 'memo']) if (k in out) out[k] = blankToNull(out[k])
  return out
}
// 이름·전화(하이픈 없이 쳐도)·회원번호로 찾기
function memberKeyword(query, keyword) {
  const kw = keyword.trim()
  if (!kw) return query
  const ors = [contains('name', kw), contains('phone', kw)]
  const digits = kw.replace(/\D/g, '')
  if (digits && digits === kw.replace(/[\s-]/g, '')) ors.push(contains('phone_digits', digits))
  if (/^\d+$/.test(kw)) ors.push(`member_no.eq.${kw}`)
  return query.or(ors.join(','))
}

export const members = {
  async list({ page = 1, perPage = 20, keyword = '', status = '' } = {}) {
    let query = memberKeyword((await sb()).from('member_list').select('*', { count: 'exact' }).is('deleted_at', null), keyword)
    if (status === 'overdue') query = query.gt('overdue_count', 0)
    else if (status === 'loaning') query = query.gt('active_loans', 0)
    else if (status) query = query.eq('status', status)
    const { data, count } = await run(query.order('id', { ascending: false }).range(...pageRange(page, perPage)))
    return { rows: data, total: count ?? 0 }
  },
  async search(keyword) {
    if (!keyword.trim()) return []
    const query = memberKeyword((await sb()).from('member_list').select('*').is('deleted_at', null), keyword)
    const { data } = await run(query.order('name').limit(30))
    return data
  },
  async get(id) {
    const { data } = await run((await sb()).from('member_list').select('*').eq('id', id).is('deleted_at', null).maybeSingle())
    if (!data) throw new Error('회원을 찾을 수 없습니다.')
    return data
  },
  // 회원번호 = 지금까지의 최대 번호 + 1(삭제된 회원 번호도 다시 쓰지 않음). 두 PC가 동시에 등록해 겹치면 다시 시도
  async create(input) {
    const client = await sb()
    for (let tries = 0; tries < 3; tries++) {
      const { data: last } = await run(client.from('members').select('member_no').order('member_no', { ascending: false }).limit(1))
      const memberNo = (last[0]?.member_no ?? 0) + 1
      const { data, error } = await client.from('members').insert({ ...pickMember(input), member_no: memberNo }).select().single()
      if (!error) return data
      if (error.code !== '23505') throw toError(error)
    }
    throw new Error('회원번호를 정하지 못했습니다. 다시 시도해주세요.')
  },
  async update(id, input) {
    const { data } = await run((await sb()).from('members').update(pickMember(input)).eq('id', id).select().single())
    return data
  },
  // 삭제해도 행은 남긴다(deleted_at) → 대출 기록 유지, 회원번호 재사용 안 함
  async remove(id) {
    const m = await members.get(id)
    if (m.active_loans > 0) throw new Error('대출 중인 도서가 있는 회원은 삭제할 수 없습니다.')
    await run((await sb()).from('members').update({ deleted_at: new Date().toISOString() }).eq('id', id))
    return true
  },
}

/* ───────────── 대출/반납 ───────────── */
export const loans = {
  // state: active(대출중) | overdue(연체) | returned(반납). dateBy: loaned_at | returned_at, from/to(YYYY-MM-DD) to 포함
  async list({ page = 1, perPage = 20, keyword = '', state = '', dateBy = 'loaned_at', from = '', to = '' } = {}) {
    let query = (await sb()).from('loan_list').select('*', { count: 'exact' })
    const col = dateBy === 'returned_at' ? 'returned_at' : 'loaned_at'
    if (from) query = query.gte(col, dayStart(from))
    if (to) query = query.lt(col, dayAfter(to))
    if (state === 'active') query = query.is('returned_at', null)
    else if (state === 'overdue') query = query.eq('overdue', true)
    else if (state === 'returned') query = query.not('returned_at', 'is', null)
    const kw = keyword.trim()
    if (kw) query = query.or([contains('search_title', kw), `search_reg_no.ilike.${quote(escLike(normalizeRegNo(kw)))}`, contains('member_name', kw)].join(','))
    const { data, count } = await run(query.order('loaned_at', { ascending: false }).order('id', { ascending: false }).range(...pageRange(page, perPage)))
    return { rows: data, total: count ?? 0 }
  },
  async byMember(memberId, { from, to } = {}) {
    let query = (await sb()).from('loan_list').select('*').eq('member_id', memberId)
    if (from) query = query.gte('loaned_at', dayStart(from))
    if (to) query = query.lt('loaned_at', dayAfter(to))
    const { data } = await run(query.order('loaned_at', { ascending: false }).order('id', { ascending: false }))
    return data
  },
  // 한 책의 대출 이력(책 상세). 대출일 최신순
  async byBook(bookId) {
    const { data } = await run((await sb()).from('loan_list').select('*').eq('book_id', bookId).order('loaned_at', { ascending: false }).order('id', { ascending: false }))
    return data
  },
  async activeByMember(memberId) {
    const { data } = await run((await sb()).from('loan_list').select('*').eq('member_id', memberId).is('returned_at', null).order('id'))
    return data
  },
  // 스캔한 등록번호의 도서 + 현재 대출(없으면 null) → 화면에서 대출/반납 자동 판별
  async lookup(regNo) {
    const book = await books.getByRegNo(regNo)
    const { data } = await run((await sb()).from('loan_list').select('*').eq('book_id', book.id).is('returned_at', null).maybeSingle())
    return { book, loan: data ?? null }
  },
  // 반납 + 대출 한 번에(DB 함수 loans_process, 트랜잭션). returnDate = 반납 처리일(소급, YYYY-MM-DD)
  // memo: 이번 처리 전체에 메모 하나 → 대출한 책은 loan_memo, 반납한 책은 return_memo(빈 메모는 저장 안 함)
  async process({ memberId = null, returnIds = [], bookIds = [], dueAt = null, returnDate = null, memo = null }) {
    const { data } = await run((await sb()).rpc('loans_process', {
      p_member_id: memberId, p_return_ids: returnIds, p_book_ids: bookIds,
      p_due_at: dueAt ? dayStart(dueAt) : null,
      p_return_date: returnDate && returnDate !== fmtDate(new Date()) ? returnDate : null,
      p_memo: (memo || '').trim() || null,
    }))
    return data
  },
  // 연장: 처음 반납 예정일은 그대로, 연장일만 덮어씀(DB 함수 loans_extend)
  async extend(loanId, dueAt) {
    await run((await sb()).rpc('loans_extend', { p_loan_id: loanId, p_due_at: dueAt ? dayStart(dueAt) : null }))
    const { data } = await run((await sb()).from('loan_list').select('*').eq('id', loanId).single())
    return data
  },
}

/* ───────────── 통계 ───────────── */
export const stats = {
  // 대출 순위(많이 빌려진 책, 많이 빌린 회원 – 이름은 DB에서 가려서 옴). from = YYYY-MM-DD(없으면 전체)
  async rankings({ from = '', limit = 10 } = {}) {
    const { data } = await run((await sb()).rpc('loan_rankings', { p_from: from ? dayStart(from) : null, p_limit: limit }))
    return data
  },
  async dashboard() {
    const { data } = await run((await sb()).rpc('dashboard_stats'))
    return data
  },
  // 날짜별 건수를 받아 일/주/월 구간으로 묶는다(구간 계산은 목업과 같은 trend.js)
  async loanTrend(unit = 'day') {
    const buckets = trendBuckets(unit)
    const { data } = await run((await sb()).rpc('loan_daily_counts', { p_from: fmtDate(buckets[0].start) }))
    const loanCnt = Array(buckets.length).fill(0)
    const returnCnt = Array(buckets.length).fill(0)
    for (const r of data) {
      const i = bucketIndex(buckets, new Date(`${r.day}T00:00:00`).getTime())
      if (i < 0) continue
      loanCnt[i] += r.loans
      returnCnt[i] += r.returns
    }
    return { labels: buckets.map((b) => b.label), loans: loanCnt, returns: returnCnt }
  },
}

/* ───────────── 게시판 ───────────── */
// 사진 파일은 Storage 공개 버킷(post-images)에 "글id/임의이름.webp"로. 파일 이름이 바뀌지 않으므로 1년 캐시
const publicUrl = (path) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`
const withUrls = (img) => ({ ...img, url: publicUrl(img.path), thumb_url: publicUrl(img.thumb_path) })
const extOf = (blob) => (blob.type === 'image/webp' ? 'webp' : 'jpg')

function checkPost(data) {
  if (!POST_CATEGORY[data.category]) return '분류를 선택해주세요.'
  if (!data.title?.trim()) return '제목을 입력해주세요.'
  if (data.images?.length && !POST_CATEGORY[data.category].photos) return `${POST_CATEGORY[data.category].label}에는 사진을 올릴 수 없습니다.`
  if ((data.images?.length || 0) > POST_PHOTO.maxCount) return `사진은 ${POST_PHOTO.maxCount}장까지 올릴 수 있습니다.`
  return ''
}

async function imagesOf(postId) {
  const { data } = await run((await sb()).from('post_images').select('*').eq('post_id', postId).order('sort'))
  return data.map(withUrls)
}

// 화면 순서대로 받은 사진 배열을 저장: 새 사진 업로드 → 행 추가, 빠진 사진은 행·파일 삭제, 남은 사진은 순서만 갱신
async function savePostImages(postId, images = []) {
  const client = await sb()
  const store = client.storage.from(BUCKET)
  const current = await imagesOf(postId)
  const keepIds = new Set(images.filter((i) => i.id).map((i) => i.id))
  const removed = current.filter((i) => !keepIds.has(i.id))

  const uploaded = []
  try {
    for (const [sort, img] of images.entries()) {
      if (img.id) continue
      const name = crypto.randomUUID()
      const path = `${postId}/${name}.${extOf(img.blob)}`
      const thumb = `${postId}/${name}_t.${extOf(img.thumbBlob)}`
      for (const [p, blob] of [[path, img.blob], [thumb, img.thumbBlob]]) {
        const { error } = await store.upload(p, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false })
        if (error) throw new Error(`사진을 올리지 못했습니다. (${error.message})`)
        uploaded.push(p)
      }
      await run(client.from('post_images').insert({ post_id: postId, path, thumb_path: thumb, width: img.width, height: img.height, sort }))
    }
  } catch (e) {
    if (uploaded.length) await store.remove(uploaded) // 올리다 실패하면 이번에 올린 파일 정리
    throw e
  }
  for (const [sort, img] of images.entries()) {
    if (img.id) await run(client.from('post_images').update({ sort }).eq('id', img.id))
  }
  if (removed.length) {
    await run(client.from('post_images').delete().in('id', removed.map((i) => i.id)))
    await store.remove(removed.flatMap((i) => [i.path, i.thumb_path]))
  }
}

export const posts = {
  // 목록에는 본문을 싣지 않는다. 고정 글 먼저, 그다음 최신순
  async list({ page = 1, perPage = 20, category = 'notice', keyword = '', status = '' } = {}) {
    let query = (await sb()).from('posts')
      .select('id, category, title, pinned, status, published_at, created_at, updated_at, post_images(thumb_path, sort)', { count: 'exact' })
      .eq('category', category)
    const kw = keyword.trim()
    if (kw) query = query.or([contains('title', kw), contains('body', kw)].join(','))
    if (status) query = query.eq('status', status)
    query = query.order('pinned', { ascending: false }).order('created_at', { ascending: false }).order('id', { ascending: false })
      .order('sort', { referencedTable: 'post_images' })
    const { data, count } = await run(query.range(...pageRange(page, perPage)))
    const rows = data.map(({ post_images: imgs, ...p }) => ({ ...p, image_count: imgs.length, thumb_url: imgs[0] ? publicUrl(imgs[0].thumb_path) : null }))
    return { rows, total: count ?? 0 }
  },
  async get(id) {
    const { data } = await run((await sb()).from('posts').select('*').eq('id', id).maybeSingle())
    if (!data) throw new Error('글을 찾을 수 없습니다.')
    return { ...data, images: await imagesOf(data.id) }
  },
  async create({ images = [], ...input }) {
    const err = checkPost({ ...input, images })
    if (err) throw new Error(err)
    const now = new Date().toISOString()
    const { data: row } = await run((await sb()).from('posts').insert({
      category: input.category, title: input.title.trim(), body: input.body || '', pinned: !!input.pinned,
      status: input.status || 'published', published_at: input.status === 'draft' ? null : now,
    }).select().single())
    try {
      await savePostImages(row.id, images)
    } catch (e) {
      // 사진 저장이 실패하면 글도 남기지 않는다(사진 없는 활동 글이 게시되는 것 방지)
      await (await sb()).from('posts').delete().eq('id', row.id)
      throw e
    }
    return { ...row, images: await imagesOf(row.id) }
  },
  async update(id, { images = [], ...input }) {
    const cur = await posts.get(id)
    const err = checkPost({ ...cur, ...input, images })
    if (err) throw new Error(err)
    await savePostImages(cur.id, images)
    const { data: row } = await run((await sb()).from('posts').update({
      title: input.title.trim(), body: input.body || '', pinned: !!input.pinned, status: input.status,
      // 처음 게시한 시각은 유지(임시저장 → 게시로 바꿀 때만 기록)
      published_at: cur.published_at || (input.status === 'published' ? new Date().toISOString() : null),
    }).eq('id', id).select().single())
    return { ...row, images: await imagesOf(row.id) }
  },
  async remove(id) {
    const imgs = await imagesOf(id)
    await run((await sb()).from('posts').delete().eq('id', id)) // post_images 행은 함께 삭제(외래 키 cascade)
    if (imgs.length) await (await sb()).storage.from(BUCKET).remove(imgs.flatMap((i) => [i.path, i.thumb_path]))
    return true
  },
}
