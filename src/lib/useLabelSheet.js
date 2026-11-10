import { computed, reactive, watch } from 'vue'

// 칸 종류: 라벨 내용(값) | USED = 이미 쓴 칸(건너뜀) | FREE = 남는 칸(이번에 안 씀)
export const USED = null
export const FREE = undefined

// A4 라벨지 공통 계산(칸 수, 페이지 나누기, 인쇄 위치). 크기 설정은 라벨지 종류별로 브라우저에 저장.
// 시작 칸(skip)은 저장하지 않는다: 쓰다 남은 낱장은 그때마다 손에 든 라벨지를 보고 미리보기에서 고른다.
// 입력칸 허용 범위. 칸을 비우거나(값 '') 0을 넣으면 계산이 무한대가 되어 탭이 멈췄다 → 범위 밖이면 기본값으로 계산
const LIMITS = { cols: [1, 10], width: [5, 210], height: [5, 297], gapX: [0, 100], gapY: [0, 100], top: [0, 100], left: [0, 100], fontSize: [4, 40] }
function sane(raw, defaults) {
  const out = {}
  for (const k of Object.keys(defaults)) {
    const lim = LIMITS[k]
    if (!lim) { out[k] = raw[k] ?? defaults[k]; continue }
    const v = typeof raw[k] === 'number' ? raw[k] : NaN
    out[k] = Number.isFinite(v) && v >= lim[0] && v <= lim[1] ? (k === 'cols' ? Math.floor(v) : v) : defaults[k]
  }
  return out
}

export function useLabelSheet(storageKey, defaults) {
  function load() {
    let saved = {}
    try { saved = JSON.parse(localStorage.getItem(storageKey)) || {} } catch {}
    return { ...sane({ ...defaults, ...saved }, defaults), skip: 0 }
  }
  // s = 입력칸과 연결된 원래 값(지우는 중이면 ''일 수 있음), v = 계산·인쇄에 쓰는 안전한 값
  const s = reactive(load())
  const v = computed(() => sane(s, defaults))
  watch(v, (keep) => {
    try { localStorage.setItem(storageKey, JSON.stringify(keep)) } catch {}
  })
  const reset = () => Object.assign(s, defaults)

  // A4 한 장에 들어가는 칸 수
  const rowsPerPage = computed(() => Math.max(1, Math.floor((297 - v.value.top * 2 + v.value.gapY) / (v.value.height + v.value.gapY))))
  const perPage = computed(() => rowsPerPage.value * v.value.cols)
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

  const sheetStyle = computed(() => {
    const x = v.value
    return {
      padding: `${x.top}mm ${x.left}mm`,
      gridTemplateColumns: `repeat(${x.cols}, ${x.width}mm)`,
      gridAutoRows: `${x.height}mm`,
      columnGap: `${x.gapX}mm`,
      rowGap: `${x.gapY}mm`,
      fontSize: `${x.fontSize}pt`,
    }
  })

  return { s, v, reset, perPage, skip, paginate, startAt, sheetStyle }
}
