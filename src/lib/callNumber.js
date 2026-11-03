// 청구기호 = 분류기호(KDC) + 저자기호 + 권차 + 복본   예) 813.6 마83ㄷ v.2 c.2
//
// 검색어를 띄어쓰기로 자르지 않고 "패턴"으로 각 요소를 인식한다.
//   "813.6마83ㄷ", "813.6 마83ㄷ", "마83ㄷ 813.6", "800 마83다" 모두 같은 의미로 해석
//   인식되지 않은 나머지는 일반 키워드(서명/저자/출판사)로 사용  예) "813 아몬드"

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'

// 완성형 글자를 초성으로 ("다" → "ㄷ"). 저자기호 끝자리를 글자로 친 경우 보정
function toInitial(ch) {
  const code = ch.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11171) return ch
  return CHO[Math.floor(code / 588)]
}

/* ───── 저자기호 생성: 리재철 한글순 도서기호법 제5표 ─────
 * 예전 시스템(getClassCde)의 규칙을 그대로 옮김. 단 예전 코드는 "둘째 글자 자음이 ㅊ일 때 모음표"를
 * 문자열 "8"과 숫자 8로 비교해 항상 일반 모음표를 썼던 버그가 있었고, 여기서는 표준대로 고침.
 * (영향: 기준 이름 둘째 글자가 ㅊ + ㅏ 이외 모음인 경우만. 기존 책의 저장된 기호는 건드리지 않음)
 *
 *   기준 이름 = 총서명 우선, 없으면 저자 (공백 제거, "(주)○○"처럼 괄호가 있으면 괄호 뒤)
 *   기호     = 첫 글자 + 둘째 글자 자음 번호 + 둘째 글자 모음 번호
 *   저작기호 = 총서명이 없을 때만 서명 첫 글자의 초성을 붙임 (시리즈는 권차로 구분)
 *   예) 저자 마광수, 서명 도서관 → 마 + ㄱ(1) + ㅘ(5) + ㄷ = 마15ㄷ
 */
const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ']
const LJC_CONSONANT = { ㄱ: '1', ㄲ: '1', ㄴ: '19', ㄷ: '2', ㄸ: '2', ㄹ: '29', ㅁ: '3', ㅂ: '4', ㅃ: '4', ㅅ: '5', ㅆ: '5', ㅇ: '6', ㅈ: '7', ㅉ: '7', ㅊ: '8', ㅋ: '87', ㅌ: '88', ㅍ: '89', ㅎ: '9' }
const LJC_VOWEL = { ㅏ: 2, ㅐ: 3, ㅑ: 3, ㅒ: 3, ㅓ: 4, ㅔ: 4, ㅕ: 4, ㅖ: 4, ㅗ: 5, ㅘ: 5, ㅙ: 5, ㅚ: 5, ㅛ: 5, ㅜ: 6, ㅝ: 6, ㅞ: 6, ㅟ: 6, ㅠ: 6, ㅡ: 7, ㅢ: 7, ㅣ: 8 }
const LJC_VOWEL_CH = { ㅏ: 2, ㅐ: 2, ㅑ: 2, ㅒ: 2, ㅓ: 3, ㅔ: 3, ㅕ: 3, ㅖ: 3, ㅗ: 4, ㅘ: 4, ㅙ: 4, ㅚ: 4, ㅛ: 4, ㅜ: 5, ㅝ: 5, ㅞ: 5, ㅟ: 5, ㅠ: 5, ㅡ: 5, ㅢ: 5, ㅣ: 6 }

const isSyllable = (ch) => !!ch && /[가-힣]/.test(ch)
function decompose(ch) {
  const code = ch.charCodeAt(0) - 0xac00
  return { cho: CHO[Math.floor(code / 588)], jung: JUNG[Math.floor((code % 588) / 28)] }
}
function cleanName(s) {
  let v = (s || '').replace(/\s/g, '')
  const i = v.indexOf(')')
  if (i !== -1 && i + 2 < v.length) v = v.slice(i + 1)
  return v
}

// 한글 두 글자 이상 → 리재철 기호(저작기호 제외). 불가하면 ''
export function ljcMark(name) {
  const [a, b] = name || ''
  if (!isSyllable(a) || !isSyllable(b)) return ''
  const { cho, jung } = decompose(b)
  return a + LJC_CONSONANT[cho] + (cho === 'ㅊ' ? LJC_VOWEL_CH : LJC_VOWEL)[jung]
}

// 반환: { mark } | { needKorean: true, base } (기준 이름이 한글 두 글자가 아님 → korean으로 직접 입력받아 재호출) | { error }
export function makeAuthorMark({ title = '', seriesTitle = '', author = '', korean = '' }) {
  const series = cleanName(seriesTitle)
  const base = series || cleanName(author)
  if (!base && !korean) return { error: '저자 또는 총서명을 먼저 입력해주세요.' }
  let mark = ljcMark(korean.trim() || base)
  if (!mark) return { needKorean: true, base }
  if (!series) {
    const t = title.trim()[0]
    if (t) mark += isSyllable(t) ? decompose(t).cho : t   // 영문 등은 예전 코드처럼 글자 그대로
  }
  return { mark }
}

export function normalizeAuthorMark(mark) {
  if (!mark) return ''
  const m = mark.trim().match(/^([가-힣A-Za-z])(\d*)([ㄱ-ㅎ가-힣A-Za-z]?)$/)
  if (!m) return mark.trim()
  return m[1] + m[2] + (m[3] && /[가-힣]/.test(m[3]) ? toInitial(m[3]) : m[3])
}

const RE = {
  regNo: /^[A-Za-z]{1,3}\d{4,}$/,
  volume: /(?<![A-Za-z])v\.?\s*(\d+)(?!\d)/i,
  copy: /(?<![A-Za-z])c\.?\s*(\d+)(?!\d)/i,
  // 분류기호: 정수부 3자리 + 선택 소수부. 앞에 숫자/글자가 붙거나 뒤에 숫자가 이어지면 제외
  // (ISBN·연도·등록번호·저자기호 숫자부 오인식 방지)
  classNo: /(?<![\d.A-Za-z가-힣])(\d{3}(?:\.\d+)?)(?![\d.])/,
  // 저자기호: 문자1 + 숫자 + 선택 초성. 앞뒤에 글자가 붙어 있으면 제외("이야기2" 같은 서명 오인식 방지)
  authorMark: /(?<![가-힣A-Za-z])([가-힣A-Za-z]\d{1,4}[ㄱ-ㅎ가-힣A-Za-z]?)(?![\d가-힣A-Za-z])/,
}

export function parseCallQuery(input) {
  const q = { classNo: '', authorMark: '', volume: '', copy: '', rest: '' }
  const text = (input || '').trim()
  if (!text) return q
  if (RE.regNo.test(text)) { q.rest = text; return q }

  let s = ` ${text} `
  const take = (re, key, fn = (v) => v) => {
    s = s.replace(re, (_, v) => { q[key] = fn(v); return ' ' })
  }
  take(RE.volume, 'volume')
  take(RE.copy, 'copy')
  take(RE.classNo, 'classNo')
  take(RE.authorMark, 'authorMark', normalizeAuthorMark)
  q.rest = s.replace(/\s+/g, ' ').trim()
  return q
}

export const hasCallTokens = (q) => !!(q.classNo || q.authorMark || q.volume || q.copy)

// 분류기호 계층 검색: 정수부 끝의 0은 "하위 전체"를 뜻함
//   800 → 8xx 전체, 810 → 81x 전체, 813 → 813.x 전체, 813.6 → 813.6x
export function classPrefix(classNo) {
  if (classNo.includes('.')) return classNo
  return classNo[0] + classNo.slice(1).replace(/0+$/, '')
}

export function matchCall(book, q) {
  if (q.classNo && !(book.class_no || '').startsWith(classPrefix(q.classNo))) return false
  if (q.authorMark && !(book.author_mark || '').toLowerCase().startsWith(q.authorMark.toLowerCase())) return false
  if (q.volume && String(book.volume || '') !== q.volume) return false
  if (q.copy && String(book.copy_no || '') !== q.copy) return false
  return true
}

// 서가 배열 순서 정렬키 (문자열 비교만으로 순서가 맞도록 구성)
//   분류기호: 정수부 3자리 + 소수부(소수는 자릿수별 비교 = 문자열 비교)
//   저자기호: 문자 → 숫자(소수식: 마8 < 마83 < 마9) → 초성
//   권차/복본: 숫자 4자리 패딩
// 구분자로 공백(0x20)을 써서 "813" < "813.6", "마8" < "마83"이 되게 함.
// Supabase에서는 같은 규칙의 컬럼(call_sort_key)을 두고 COLLATE "C"로 인덱스/정렬.
export function callSortKey(b) {
  const [int = '', dec = ''] = String(b.class_no || '').split('.')
  const cls = int.padStart(3, '0') + (dec ? '.' + dec : '')
  const m = String(b.author_mark || '').match(/^(\D*)(\d*)(.*)$/)
  const pad = (v) => String(v || 0).padStart(4, '0')
  return [cls, m[1], m[2], m[3], pad(b.volume), pad(b.copy_no)].join(' ')
}
