<script setup>
// 바코드 라벨(앞표지). 아직 등록 전인 책에 붙일 번호를 순서대로 미리 출력한다.
// 시작 번호는 자동(마지막 번호 + 1)으로 채워지고 언제든 직접 고칠 수 있다(사용자 결정).
//   - 인쇄하면 끝 번호가 마지막 번호보다 클 때 그 값이 DB에 저장된다(다음 자동 시작 번호).
//   - 마지막 번호보다 작은 번호 = 다시 뽑기(훼손 라벨). 마지막 번호는 내리지 않는다 → 다음 자동 번호가 이미 붙인 라벨과 겹치지 않게.
// 인쇄 버튼을 누르는 순간 번호를 먼저 사용 처리한다 → 출력 확인 전에 화면을 떠나도 같은 번호가 두 번 나오지 않음.
// 출력물 확인에서 [인쇄 안 함]이면 인쇄 전 번호로 되돌린다(그 사이 다음 번호가 쓰였으면 건너뜀)
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { books } from '@/api'
import { LIBRARY_NAME } from '@/lib/constants'
import { fmtRegNo, parseRegNo } from '@/lib/regNo'
import { useLabelSheet, USED, FREE } from '@/lib/useLabelSheet'
import { toast } from '@/stores/toast'
import Barcode from '@/components/Barcode.vue'
import LabelSheetFields from './LabelSheetFields.vue'
import PrintCheckDialog from './PrintCheckDialog.vue'

const { s, reset, perPage, skip, paginate, startAt, sheetStyle } = useLabelSheet('lent.barcodeLabelSettings', {
  showLibrary: true,
  cols: 3,
  width: 64,          // mm
  height: 26,
  gapX: 3,
  gapY: 2,
  top: 8,
  left: 5,
  fontSize: 10,       // pt
})

const MAX = 500
const state = ref(null)       // { lastIssued, next }
const count = ref(0)
const start = ref('')         // 시작 번호 입력(EM00011197 또는 11197)

// 시작 번호를 자동 값(다음 번호)으로
const autoStart = () => { if (state.value) start.value = state.value.next }
async function loadState() {
  try { state.value = await books.barcodeState(); autoStart() } catch (e) { toast.error(e) }
}
onMounted(loadState)
// 기본 장수 = 라벨지 한 장(건너뛸 칸 제외)
watch([perPage, skip], () => { count.value = perPage.value - skip.value }, { immediate: true })

// "EM00000010" 또는 숫자만 입력해도 됨
const toNo = (v) => (/^\d+$/.test(String(v).trim()) ? Number(v) : parseRegNo(v))

const range = computed(() => {
  const a = toNo(start.value)
  if (!state.value || a == null || a < 1 || !(count.value >= 1) || count.value > MAX) return null
  return { a, b: a + count.value - 1 }
})
// 입력한 범위가 자동 번호와 어떻게 다른지 알려준다
const rangeNote = computed(() => {
  if (!range.value || !state.value) return null
  const { a, b } = range.value
  const next = state.value.lastIssued + 1
  if (b < next) return { tone: 'warn', text: '이미 출력한 번호를 다시 뽑습니다. 다음 자동 번호는 바뀌지 않습니다.' }
  if (a > next) return { tone: 'warn', text: `${fmtRegNo(next)} ~ ${fmtRegNo(a - 1)}을(를) 건너뜁니다. 인쇄하면 다음 자동 번호는 ${fmtRegNo(b + 1)}입니다.` }
  if (a < next) return { tone: 'warn', text: `앞부분 ${fmtRegNo(a)} ~ ${fmtRegNo(next - 1)}은(는) 이미 출력한 번호입니다. 인쇄하면 다음 자동 번호는 ${fmtRegNo(b + 1)}입니다.` }
  return { tone: '', text: `인쇄하면 다음 자동 번호는 ${fmtRegNo(b + 1)}입니다.` }
})
const codes = computed(() => {
  if (!range.value) return []
  const out = []
  for (let n = range.value.a; n <= range.value.b; n++) out.push(fmtRegNo(n))
  return out
})
// 인쇄 중(출력 확인 전)에는 번호를 고정한다. 번호를 먼저 잡으면 "다음 번호"가 바뀌기 때문
const printing = ref(null)    // { codes, from, prev, reserved }
const shown = computed(() => printing.value?.codes ?? codes.value)
const pages = computed(() => paginate(shown.value))

async function print() {
  if (!codes.value.length) return toast('출력할 번호를 확인해주세요.', 'error')
  const prev = state.value.lastIssued
  // 끝 번호가 마지막 번호보다 크면 번호를 먼저 사용 처리(다시 뽑기만이면 DB를 바꾸지 않음)
  const job = { codes: [...codes.value], from: range.value.a, prev, reserved: range.value.b > prev }
  printing.value = job
  if (job.reserved) {
    // 확인 창의 버튼은 이 저장이 끝난 뒤에 처리한다(빨리 눌러도 번호가 어긋나지 않게)
    job.ready = books.issueBarcodes(job.from, job.codes.length, prev).then((st) => { state.value = st })
    try { await job.ready }
    catch (e) { printing.value = null; toast.error(e); return loadState() }
  }
  await nextTick()
  window.print()
}
const printWin = () => window.print()
async function printOk() {
  await printing.value?.ready
  printing.value = null
  autoStart()
  toast('바코드 라벨 출력을 완료했습니다.')
}
async function printCancel() {
  const job = printing.value
  await job?.ready
  printing.value = null
  if (!job.reserved) return
  try {
    state.value = await books.releaseBarcodes(job.from, job.codes.length, job.prev)
    autoStart()
    toast('번호를 되돌렸습니다.')
  } catch (e) {
    toast.error(e)
    loadState()
  }
}
// 출력 확인 전에는 화면을 떠나지 못하게
onBeforeRouteLeave(() => {
  if (!printing.value) return true
  toast('출력물 확인을 먼저 해주세요.', 'error')
  return false
})
</script>

<template>
  <div class="print-page">
    <div class="controls no-print">
      <slot />
      <section class="card">
        <div class="card-head"><h3>출력할 번호</h3></div>
        <div class="card-body stack">
          <label class="line">
            <span class="lbl">시작 번호</span>
            <input v-model="start" class="input num" placeholder="EM00000010" :disabled="!!printing" />
            <button type="button" class="btn sm" :disabled="!state || start === state.next" @click="autoStart">자동</button>
          </label>
          <label class="line">
            <span class="lbl">장수</span>
            <input v-model.number="count" class="input num count" type="number" min="1" :max="MAX" :disabled="!!printing" />
            <button type="button" class="btn sm" @click="count = perPage">한 장({{ perPage }})</button>
          </label>
          <p class="sheet-note">마지막 출력 번호 <b class="num">{{ state ? fmtRegNo(state.lastIssued) : '…' }}</b> · 시작 번호는 자동으로 채워지며 직접 고칠 수 있습니다.</p>
          <p v-if="codes.length" class="sheet-note"><b class="num">{{ codes[0] }}</b> ~ <b class="num">{{ codes.at(-1) }}</b> · {{ codes.length }}장</p>
          <p v-if="rangeNote" class="sheet-note" :class="{ 't-warn': rangeNote.tone === 'warn' }">{{ rangeNote.text }}</p>
          <p v-else class="sheet-note t-red">번호를 확인해주세요. (한 번에 최대 {{ MAX }}장)</p>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h3>라벨 설정</h3><button class="btn ghost sm" @click="reset">기본값</button></div>
        <div class="card-body stack">
          <LabelSheetFields :s="s" />
          <label class="check"><input v-model="s.showLibrary" type="checkbox" /> 도서관 이름 표시</label>
          <button class="btn primary lg" :disabled="!codes.length" @click="print">인쇄 ({{ codes.length }}장 · A4 {{ pages.length }}매)</button>
        </div>
      </section>
    </div>

    <PrintCheckDialog :open="!!printing" :cancel-label="printing?.reserved ? '인쇄 안 함 (번호 되돌리기)' : '인쇄 안 함'" @ok="printOk" @retry="printWin" @cancel="printCancel">
      <p v-if="printing"><b class="num">{{ printing.codes[0] }}</b> ~ <b class="num">{{ printing.codes.at(-1) }}</b> · {{ printing.codes.length }}장</p>
      <p>라벨이 칸에 맞게, 바코드가 선명하게 나왔나요?</p>
    </PrintCheckDialog>

    <div class="preview">
      <div v-for="(cells, pi) in pages" :key="pi" class="sheet" :style="sheetStyle">
        <div
          v-for="(code, ci) in cells" :key="ci" class="label barcode-label"
          :class="{ used: code === USED, free: code === FREE, pick: pi === 0 && !printing, start: pi === 0 && ci === skip }"
          :title="pi === 0 && !printing ? '이 칸부터 인쇄' : undefined"
          @click="!printing && startAt(pi, ci)"
        >
          <template v-if="code">
            <div v-if="s.showLibrary" class="lib">{{ LIBRARY_NAME }}</div>
            <Barcode :value="code" class="bars" :style="{ height: `${s.height * 0.42}mm` }" />
            <div class="code num">{{ code }}</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.lbl { width: 78px; font-size: 13px; font-weight: 600; color: var(--text-2); }
.line .input { flex: 1; min-width: 0; }
.line .input.count { flex: none; width: 90px; }
.t-red { color: var(--red); }
.t-warn { color: var(--amber); }
.barcode-label { gap: .15em; padding: 0 3mm; font-weight: 400; }
.lib { font-size: .8em; letter-spacing: .02em; }
.bars { width: 100%; }
.code { font-size: 1em; font-weight: 700; letter-spacing: .08em; }
</style>
