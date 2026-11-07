import { computed, reactive, watch } from 'vue'

// 칸 종류: 라벨 내용(값) | USED = 이미 쓴 칸(건너뜀) | FREE = 남는 칸(이번에 안 씀)
export const USED = null
export const FREE = undefined

// A4 라벨지 공통 계산(칸 수, 페이지 나누기, 인쇄 위치). 크기 설정은 라벨지 종류별로 브라우저에 저장.
// 시작 칸(skip)은 저장하지 않는다: 쓰다 남은 낱장은 그때마다 손에 든 라벨지를 보고 미리보기에서 고른다.
export function useLabelSheet(storageKey, defaults) {
  function load() {
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem(storageKey)) || {} } catch {}
    return { ...defaults, ...saved, skip: 0 }
  }
  const s = reactive(load())
  watch(s, () => {
    const { skip, ...keep } = s
    try { localStorage.setItem(storageKey, JSON.stringify(keep)) } catch {}
  })
  const reset = () => Object.assign(s, defaults)

  // A4 한 장에 들어가는 칸 수
  const rowsPerPage = computed(() => Math.max(1, Math.floor((297 - s.top * 2 + s.gapY) / (s.height + s.gapY))))
  const perPage = computed(() => rowsPerPage.value * s.cols)
  const skip = computed(() => Math.min(Math.max(0, s.skip || 0), perPage.value - 1))

  // 첫 장 앞쪽은 이미 쓴 칸(USED), 마지막 장 뒤쪽은 남는 칸(FREE)으로 채워 항상 한 장 전체를 그린다
  // → 미리보기에서 어느 칸이든 눌러 시작 위치로 고를 수 있음. 인쇄할 때 빈칸은 아무것도 찍히지 않는다
  function paginate(items) {
    const cells = [...Array(skip.value).fill(USED), ...items]
    const total = Math.max(1, Math.ceil(cells.length / perPage.value)) * perPage.value
    while (cells.length < total) cells.push(FREE)
    const out = []
    for (let i = 0; i < cells.length; i += perPage.value) out.push(cells.slice(i, i + perPage.value))
    return out
  }

  // 미리보기 칸을 누르면 그 칸부터 인쇄(첫 장만 해당)
  function startAt(pageIndex, cellIndex) {
    if (pageIndex === 0) s.skip = cellIndex
  }

  const sheetStyle = computed(() => ({
    padding: `${s.top}mm ${s.left}mm`,
    gridTemplateColumns: `repeat(${s.cols}, ${s.width}mm)`,
    gridAutoRows: `${s.height}mm`,
    columnGap: `${s.gapX}mm`,
    rowGap: `${s.gapY}mm`,
    fontSize: `${s.fontSize}pt`,
  }))

  return { s, reset, perPage, skip, paginate, startAt, sheetStyle }
}
