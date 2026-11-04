// 등록번호 = EM + 숫자 8자리(예: EM00005724).
// 바코드 라벨을 번호 순서대로 미리 출력해 책에 붙이고, 도서 등록 때 그 바코드를 스캔해 넣는다.
export const REG_PREFIX = 'EM'
export const REG_DIGITS = 8
const REG_RE = /^EM(\d{8})$/

export const normalizeRegNo = (v) => String(v ?? '').trim().toUpperCase()
export const fmtRegNo = (n) => `${REG_PREFIX}${String(n).padStart(REG_DIGITS, '0')}`

// 형식이 맞으면 숫자 부분, 아니면 null
export function parseRegNo(v) {
  const m = normalizeRegNo(v).match(REG_RE)
  return m ? Number(m[1]) : null
}
