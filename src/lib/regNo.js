// 등록번호 = EM + 숫자 8자리(예: EM00005724).
// 바코드 라벨을 번호 순서대로 미리 출력해 책에 붙이고, 도서 등록 때 그 바코드를 스캔해 넣는다.
export const REG_PREFIX = 'EM'
export const REG_DIGITS = 8
const REG_RE = /^EM(\d{8})$/

// 한글 자판 상태에서 바코드를 스캔하면 스캐너가 보낸 키가 한글로 조합된다.
//   예: EM00004055 → Shift+E(ㄸ) + M(ㅡ) = "뜨00004055". 옛 시스템 데이터에도 이렇게 들어간 번호가 있었다.
//   두벌식 자판 기준으로 원래 누른 영문 키로 되돌린다(대소문자는 어차피 대문자로 통일).
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']
const KEY = {
  ㄱ: 'r', ㄲ: 'R', ㄴ: 's', ㄷ: 'e', ㄸ: 'E', ㄹ: 'f', ㅁ: 'a', ㅂ: 'q', ㅃ: 'Q', ㅅ: 't', ㅆ: 'T', ㅇ: 'd', ㅈ: 'w', ㅉ: 'W',
  ㅊ: 'c', ㅋ: 'z', ㅌ: 'x', ㅍ: 'v', ㅎ: 'g', ㄳ: 'rt', ㄵ: 'sw', ㄶ: 'sg', ㄺ: 'fr', ㄻ: 'fa', ㄼ: 'fq', ㄽ: 'ft', ㄾ: 'fx', ㄿ: 'fv', ㅀ: 'fg', ㅄ: 'qt',
  ㅏ: 'k', ㅐ: 'o', ㅑ: 'i', ㅒ: 'O', ㅓ: 'j', ㅔ: 'p', ㅕ: 'u', ㅖ: 'P', ㅗ: 'h', ㅘ: 'hk', ㅙ: 'ho', ㅚ: 'hl', ㅛ: 'y',
  ㅜ: 'n', ㅝ: 'nj', ㅞ: 'np', ㅟ: 'nl', ㅠ: 'b', ㅡ: 'm', ㅢ: 'ml', ㅣ: 'l',
}
export function hangulToKeys(v) {
  return String(v ?? '').replace(/[가-힣ㄱ-ㅣ]/g, (ch) => {
    const c = ch.charCodeAt(0) - 0xac00
    if (c < 0) return KEY[ch] ?? ch // 낱자(ㄷ, ㅡ 등)
    return KEY[CHO[Math.floor(c / 588)]] + KEY[JUNG[Math.floor((c % 588) / 28)]] + (JONG[c % 28] ? KEY[JONG[c % 28]] : '')
  })
}

// 스캔·입력값 정리: 공백 제거 → 한글 자판으로 들어간 글자 되돌리기 → 대문자
// (중간 공백도 제거: "EM 00004055"처럼 손으로 띄어 친 값)
export const normalizeRegNo = (v) => hangulToKeys(String(v ?? '').replace(/\s+/g, '')).toUpperCase()
export const fmtRegNo = (n) => `${REG_PREFIX}${String(n).padStart(REG_DIGITS, '0')}`

// 형식이 맞으면 숫자 부분, 아니면 null
export function parseRegNo(v) {
  const m = normalizeRegNo(v).match(REG_RE)
  return m ? Number(m[1]) : null
}
