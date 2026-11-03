<script setup>
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { books } from '@/api'
import { callNumberLines } from '@/lib/format'
import EmptyState from '@/components/EmptyState.vue'
import { toast } from '@/stores/toast'

const SETTINGS_KEY = 'lent.labelSettings'
const defaults = {
  type: 'call',       // call: 청구기호 전체 | class: 분류기호 | author: 저자기호
  showRegNo: false,
  cols: 5,
  width: 38,          // mm
  height: 25,
  gapX: 2,
  gapY: 2,
  top: 10,
  left: 8,
  fontSize: 12,       // pt
  skip: 0,            // 이미 사용한 라벨 칸 수(낱장 재사용)
}
function loadSettings() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) } } catch { return { ...defaults } }
}
const s = reactive(loadSettings())
watch(s, () => { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)) } catch {} })

const candidates = shallowRef([])
const selected = ref(new Set())
const loading = ref(false)
const addCode = ref('')

onMounted(loadUnprinted)

async function loadUnprinted() {
  loading.value = true
  try {
    const res = await books.list({ label: 'unprinted', perPage: 1000 })
    candidates.value = res.rows
    selected.value = new Set(res.rows.map((b) => b.id))
  } catch (e) { toast.error(e) }
  finally { loading.value = false }
}

async function addByCode() {
  const code = addCode.value.trim()
  addCode.value = ''
  if (!code) return
  try {
    const b = await books.getByRegNo(code)
    if (!candidates.value.some((x) => x.id === b.id)) candidates.value = [b, ...candidates.value]
    selected.value = new Set(selected.value).add(b.id)
  } catch (e) { toast.error(e) }
}

function toggle(id) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}
const allChecked = computed(() => candidates.value.length > 0 && selected.value.size === candidates.value.length)
function toggleAll() {
  selected.value = allChecked.value ? new Set() : new Set(candidates.value.map((b) => b.id))
}

function linesOf(b) {
  if (s.type === 'class') return [b.class_no]
  if (s.type === 'author') return [b.author_mark]
  return callNumberLines(b)
}

const labels = computed(() => candidates.value.filter((b) => selected.value.has(b.id)))

// A4 한 장에 들어가는 칸 수
const rowsPerPage = computed(() => Math.max(1, Math.floor((297 - s.top * 2 + s.gapY) / (s.height + s.gapY))))
const perPage = computed(() => rowsPerPage.value * s.cols)
const pages = computed(() => {
  const cells = [...Array(Math.min(s.skip, perPage.value - 1)).fill(null), ...labels.value]
  const out = []
  for (let i = 0; i < cells.length; i += perPage.value) out.push(cells.slice(i, i + perPage.value))
  return out.length ? out : [[]]
})

const sheetStyle = computed(() => ({
  padding: `${s.top}mm ${s.left}mm`,
  gridTemplateColumns: `repeat(${s.cols}, ${s.width}mm)`,
  gridAutoRows: `${s.height}mm`,
  columnGap: `${s.gapX}mm`,
  rowGap: `${s.gapY}mm`,
  fontSize: `${s.fontSize}pt`,
}))

async function print() {
  if (!labels.value.length) return toast('출력할 도서를 선택해주세요.', 'error')
  window.print()
  if (confirm(`${labels.value.length}권을 '라벨 출력 완료'로 표시할까요?`)) {
    try {
      await books.markLabelPrinted(labels.value.map((b) => b.id))
      toast('출력 완료로 표시했습니다.')
      loadUnprinted()
    } catch (e) { toast.error(e) }
  }
}

function resetSettings() { Object.assign(s, defaults) }
</script>

<template>
  <div class="print-page">
    <div class="controls no-print">
      <section class="card">
        <div class="card-head"><h3>출력 대상 <span class="muted num">{{ labels.length }} / {{ candidates.length }}</span></h3></div>
        <div class="card-body stack">
          <form class="inline" @submit.prevent="addByCode">
            <input v-model="addCode" class="input num" placeholder="등록번호 스캔으로 추가" />
            <button class="btn" type="submit">추가</button>
          </form>
          <div class="pick-head">
            <label><input type="checkbox" :checked="allChecked" @change="toggleAll" /> 전체 선택</label>
            <button class="btn ghost sm" @click="loadUnprinted">미출력 목록 새로고침</button>
          </div>
          <div v-if="loading" class="loading-bar" />
          <ul class="pick">
            <li v-for="b in candidates" :key="b.id">
              <label>
                <input type="checkbox" :checked="selected.has(b.id)" @change="toggle(b.id)" />
                <span class="grow"><span class="t">{{ b.title }}</span><span class="muted num small">{{ b.reg_no }} · {{ callNumberLines(b).join(' ') }}</span></span>
              </label>
            </li>
            <li v-if="!loading && !candidates.length"><EmptyState art="stump" :size="80" title="라벨을 기다리는 책이 없어요" /></li>
          </ul>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h3>라벨 설정</h3><button class="btn ghost sm" @click="resetSettings">기본값</button></div>
        <div class="card-body stack">
          <div class="seg">
            <button :class="{ on: s.type === 'call' }" @click="s.type = 'call'">청구기호</button>
            <button :class="{ on: s.type === 'class' }" @click="s.type = 'class'">분류기호</button>
            <button :class="{ on: s.type === 'author' }" @click="s.type = 'author'">저자기호</button>
          </div>
          <div class="grid3">
            <label class="field"><span>열 수</span><input v-model.number="s.cols" class="input" type="number" min="1" max="10" /></label>
            <label class="field"><span>가로(mm)</span><input v-model.number="s.width" class="input" type="number" min="10" step="0.5" /></label>
            <label class="field"><span>세로(mm)</span><input v-model.number="s.height" class="input" type="number" min="10" step="0.5" /></label>
            <label class="field"><span>좌우 간격</span><input v-model.number="s.gapX" class="input" type="number" min="0" step="0.5" /></label>
            <label class="field"><span>상하 간격</span><input v-model.number="s.gapY" class="input" type="number" min="0" step="0.5" /></label>
            <label class="field"><span>글자(pt)</span><input v-model.number="s.fontSize" class="input" type="number" min="6" max="30" /></label>
            <label class="field"><span>위 여백</span><input v-model.number="s.top" class="input" type="number" min="0" step="0.5" /></label>
            <label class="field"><span>왼쪽 여백</span><input v-model.number="s.left" class="input" type="number" min="0" step="0.5" /></label>
            <label class="field"><span>건너뛸 칸</span><input v-model.number="s.skip" class="input" type="number" min="0" /></label>
          </div>
          <label class="check"><input v-model="s.showRegNo" type="checkbox" /> 등록번호 함께 표시</label>
          <button class="btn primary lg" :disabled="!labels.length" @click="print">인쇄 ({{ labels.length }}장 · A4 {{ pages.length }}매)</button>
        </div>
      </section>
    </div>

    <div class="preview">
      <div v-for="(cells, pi) in pages" :key="pi" class="sheet" :style="sheetStyle">
        <div v-for="(b, ci) in cells" :key="ci" class="label" :class="{ blank: !b }">
          <template v-if="b">
            <div v-for="(line, li) in linesOf(b)" :key="li" class="line">{{ line }}</div>
            <div v-if="s.showRegNo" class="reg">{{ b.reg_no }}</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.print-page { display: grid; grid-template-columns: 380px 1fr; gap: 18px; align-items: start; }
.controls { display: grid; gap: 18px; position: sticky; top: 80px; }
.inline { display: flex; gap: 6px; }
.pick-head { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.pick-head label, .check { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; font-size: 14px; }
.pick { list-style: none; margin: 0; padding: 0; max-height: 300px; overflow: auto; border: 1px solid var(--line); border-radius: 8px; contain: content; }
.pick li + li { border-top: 1px solid var(--line); }
.pick label { display: flex; gap: 10px; align-items: center; padding: 8px 10px; cursor: pointer; }
.pick label:hover { background: var(--hover); }
.pick .grow { display: grid; min-width: 0; flex: 1; }
.pick .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.small { font-size: 12px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.grid3 .input { height: 34px; }

.preview { overflow: auto; display: grid; gap: 18px; justify-content: safe center; padding-bottom: 24px; }
.sheet { width: 210mm; height: 297mm; background: #fff; color: #000; box-shadow: var(--shadow); display: grid; align-content: start; overflow: hidden; }
.label { outline: 1px dashed #c8c8c8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .1em; line-height: 1.15; font-weight: 700; font-family: 'Malgun Gothic', sans-serif; overflow: hidden; }
.label.blank { background: repeating-linear-gradient(45deg, #fafafa, #fafafa 4px, #f0f0f0 4px, #f0f0f0 8px); }
.reg { font-size: .65em; font-weight: 400; margin-top: .2em; }

@media (max-width: 1100px) {
  .print-page { grid-template-columns: 1fr; }
  .controls { position: static; }
}
</style>

<style>
@media print {
  @page { size: A4; margin: 0; }
  body { background: #fff; }
  .no-print { display: none !important; }
  .print-page { display: block !important; }
  .print-page .preview { display: block; padding: 0; overflow: visible; }
  .print-page .sheet { box-shadow: none; break-after: page; }
  .print-page .label { outline: none; }
  .print-page .label.blank { background: none; }
}
</style>
