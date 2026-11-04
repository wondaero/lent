import { fmtDate } from './format'

// 목록 → 엑셀(.xlsx). CSV는 엑셀에서 ISBN이 지수(9.79E+12)로 바뀌고 앞자리 0이 사라져서 쓰지 않는다.
// 라이브러리는 내보낼 때만 불러온다(평소 화면 번들에 포함 안 됨).
// columns: [{ header, value: (row) => 값, width?, num? }] — num이 아닌 열은 전부 문자열 셀로 쓴다
export async function exportXlsx(name, columns, rows) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser')
  const data = [
    columns.map((c) => ({ value: c.header, fontWeight: 'bold' })),
    ...rows.map((r) => columns.map((c) => {
      const v = c.value(r)
      if (v == null || v === '') return null
      return c.num ? { value: Number(v), type: Number } : { value: String(v), type: String }
    })),
  ]
  await writeXlsxFile(data, {
    columns: columns.map((c) => ({ width: c.width ?? 12 })),
    stickyRowsCount: 1,
  }).toFile(`${name}_${fmtDate(new Date())}.xlsx`)
}

// 서버 페이지네이션 목록을 현재 필터 그대로 끝까지 받아온다(Supabase는 요청당 최대 1,000행)
export async function fetchAll(listFn, filters, perPage = 500) {
  const rows = []
  for (let page = 1; ; page++) {
    const res = await listFn({ ...filters, page, perPage })
    rows.push(...res.rows)
    if (!res.rows.length || rows.length >= res.total) return rows
  }
}
