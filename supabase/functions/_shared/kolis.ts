// KOLIS-NET(국립중앙도서관 국가자료종합목록) Open API 호출·해석.
// Deno 전용 API를 쓰지 않는 순수 코드 → Edge Function과 로컬 테스트(Node)에서 같이 사용.
//
// 흐름: ISBN 목록 조회(최대 10건) → 각 기록(REC_KEY) 상세 조회(병렬) → 앱의 후보 형식으로 변환
//   목록: http://nl.go.kr/kolisnet/openApi/open.php?gubun1=ISBN&code1=<ISBN>   (RECORD 반복, TOTAL)
//   상세: http://nl.go.kr/kolisnet/openApi/open.php?rec_key=<REC_KEY>          (BIBINFO)
// 인증키 불필요. 목록은 한 번에 10건까지만 오며 다음 페이지 파라미터는 확인되지 않음.

const BASE = 'http://nl.go.kr/kolisnet/openApi/open.php'

export type Candidate = {
  isbn: string
  title: string
  series_title: string
  volume: string
  author: string
  publisher: string
  pub_year: string
  class_no: string
  source: string
  rec_key: string
}

/* ───── 아주 작은 XML 도우미 (응답이 단순한 평면 구조라 정규식으로 충분) ───── */
function decode(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&amp;/g, '&')
}
function blocks(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])
}
function field(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return m ? decode(m[1]).trim() : ''
}
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

/* ───── 필드별 정리 규칙 (실제 응답 형식 기준) ───── */

// "한국십진분류법-> 863,듀이십진분류법-> 843.912" → "863" (KDC만)
export function parseKdc(classfy: string): string {
  const m = classfy.match(/한국십진분류법\s*->\s*([0-9]{1,3}(?:\.[0-9]+)?)/)
  return m ? m[1] : ''
}

// "9788983927767(3)" → { isbn: "9788983927767", volume: "3" }
export function parseIsbn(raw: string): { isbn: string; volume: string } {
  const isbn = (raw.match(/[0-9Xx]{10,13}/) || [''])[0]
  const vol = raw.match(/\(\s*(\d+)\s*\)/)
  return { isbn, volume: vol ? vol[1] : '' }
}

// "(,문학동네 소설,)" / "(,Why? 과학 ;,v. 3)" → { series: "문학동네 소설", volume: "3"? }
export function parseSeries(raw: string): { series: string; volume: string } {
  if (!raw) return { series: '', volume: '' }
  const first = raw.split(/\)\s*\(/)[0]                        // 총서가 여러 개면 첫 번째만
  const [name, rest = ''] = first.replace(/[()]/g, '').split(';')
  const series = squash(name.replace(/,/g, ' '))
  const vol = rest.match(/(\d+)/)
  return { series, volume: vol ? vol[1] : '' }
}

// TITLE_INFO "해리 포터  : ,아즈카반의 죄수 .,제3권  / ,J. K. 롤링 지음;,강동혁 옮김"
//   → { title: "해리 포터 : 아즈카반의 죄수", volume: "3" }   (책임표시 '/' 뒤는 버림)
export function parseTitle(raw: string): { title: string; volume: string } {
  let t = raw.split(' / ')[0]
  let volume = ''
  const v = t.match(/[.,]\s*,?\s*제?\s*(\d+)\s*권/) || t.match(/\.\s*,?\s*(\d+)\s*$/)   // ".,제3권" 또는 끝의 ". 3"
  if (v) { volume = v[1]; t = t.slice(0, v.index) }
  t = t.replace(/\s*:\s*,?/g, ' : ').replace(/,/g, ' ')
  return { title: squash(t).replace(/\s*[:.]$/, ''), volume }
}

// "한강 지음" / "지은이: 최은영" / "J. K. 롤링 지음;,강동혁 옮김" / "글: 김하늘 ; 그림: 이별" → 첫 번째 사람 이름
const ROLE = /(지은이|지음|글|그림|글·그림|글\/그림|엮음|엮은이|편저|편|저자|저|著|옮김|옮긴이|역|감수|기획|원작)/
export function parseAuthor(raw: string): string {
  const first = raw.split(/[;,]/)[0]
  return squash(first.replace(new RegExp(`^\\s*${ROLE.source}\\s*[:：]\\s*`), '').replace(new RegExp(`\\s+${ROLE.source}\\s*$`), ''))
}

/* ───── 조회 ───── */
async function getXml(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`KOLIS-NET 응답 오류 (${res.status})`)
  return await res.text()
}

export async function lookupIsbn(isbnInput: string, { timeoutMs = 8000 } = {}): Promise<{ total: number; rows: Candidate[] }> {
  const code = isbnInput.replace(/[^0-9Xx]/g, '')
  if (code.length !== 10 && code.length !== 13) throw new Error('ISBN은 10자리 또는 13자리 숫자입니다.')

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const listXml = await getXml(`${BASE}?gubun1=ISBN&code1=${code}`, ctrl.signal)
    const total = +field(listXml, 'TOTAL') || 0
    const records = blocks(listXml, 'RECORD').map((r) => ({
      rec_key: field(r, 'REC_KEY'),
      title: field(r, 'TITLE'),
      author: field(r, 'AUTHOR'),
      publisher: field(r, 'PUBLISHER'),
      pub_year: field(r, 'PUBYEAR'),
      source: field(r, 'LIB_NAME'),
    })).filter((r) => r.rec_key)

    // 상세는 병렬 조회. 일부 실패해도 목록 정보로 후보는 만든다.
    const details = await Promise.all(records.map((r) =>
      getXml(`${BASE}?rec_key=${r.rec_key}`, ctrl.signal).then((x) => blocks(x, 'BIBINFO')[0] || '').catch(() => ''),
    ))

    const rows: Candidate[] = records.map((r, i) => {
      const d = details[i]
      const t = parseTitle(d ? field(d, 'TITLE_INFO') : r.title)
      const s = parseSeries(d ? field(d, 'SERIES_INFO') : '')
      const n = parseIsbn(d ? field(d, 'ISBN') || field(d, 'STANDARD_INFO') : code)
      return {
        isbn: n.isbn || code,
        title: t.title || squash(r.title),
        series_title: s.series,
        volume: n.volume || t.volume || s.volume,
        author: parseAuthor(r.author),
        publisher: squash(r.publisher),
        pub_year: (r.pub_year.match(/\d{4}/) || [''])[0],
        class_no: d ? parseKdc(field(d, 'CLASSFY_INFO')) : '',
        source: r.source,
        rec_key: r.rec_key,
      }
    })
    return { total, rows }
  } finally {
    clearTimeout(timer)
  }
}
