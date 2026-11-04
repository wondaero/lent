import { computed, reactive, watch } from 'vue'

// A4 라벨지 공통 계산(칸 수, 페이지 나누기, 인쇄 위치). 설정은 라벨지 종류별로 브라우저에 저장
export function useLabelSheet(storageKey, defaults) {
  function load() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey)) } } catch { return { ...defaults } }
  }
  const s = reactive(load())
  watch(s, () => { try { localStorage.setItem(storageKey, JSON.stringify(s)) } catch {} })
  const reset = () => Object.assign(s, defaults)

  // A4 한 장에 들어가는 칸 수
  const rowsPerPage = computed(() => Math.max(1, Math.floor((297 - s.top * 2 + s.gapY) / (s.height + s.gapY))))
  const perPage = computed(() => rowsPerPage.value * s.cols)

  // 앞쪽 "건너뛸 칸"(이미 쓴 낱장 재사용)은 빈칸(null)으로 채운다
  function paginate(items) {
    const cells = [...Array(Math.min(s.skip, perPage.value - 1)).fill(null), ...items]
    const out = []
    for (let i = 0; i < cells.length; i += perPage.value) out.push(cells.slice(i, i + perPage.value))
    return out.length ? out : [[]]
  }

  const sheetStyle = computed(() => ({
    padding: `${s.top}mm ${s.left}mm`,
    gridTemplateColumns: `repeat(${s.cols}, ${s.width}mm)`,
    gridAutoRows: `${s.height}mm`,
    columnGap: `${s.gapX}mm`,
    rowGap: `${s.gapY}mm`,
    fontSize: `${s.fontSize}pt`,
  }))

  return { s, reset, perPage, paginate, sheetStyle }
}
