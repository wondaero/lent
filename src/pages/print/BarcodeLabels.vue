<script setup>
// 바코드 라벨(앞표지). 아직 등록 전인 책에 붙일 번호를 순서대로 미리 출력한다.
// 인쇄 버튼을 누르는 순간 번호를 먼저 사용 처리한다 → 출력 확인 전에 화면을 떠나도 같은 번호가 두 번 나오지 않음.
// 출력물 확인에서 [인쇄 안 함]이면 되돌린다(그 사이 다음 번호가 쓰였으면 건너뜀)
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { books } from '@/api'
import { LIBRARY_NAME } from '@/lib/constants'
import { fmtRegNo, parseRegNo } from '@/lib/regNo'
import { useLabelSheet } from '@/lib/useLabelSheet'
import { toast } from '@/stores/toast'
import Barcode from '@/components/Barcode.vue'
import LabelSheetFields from './LabelSheetFields.vue'
import PrintCheckDialog from './PrintCheckDialog.vue'

const { s, reset, perPage, paginate, sheetStyle } = useLabelSheet('lent.barcodeLabelSettings', {
  showLibrary: true,
  cols: 3,
  width: 64,          // mm
  height: 26,
  gapX: 3,
  gapY: 2,
  top: 8,
  left: 5,
  fontSize: 10,       // pt
  skip: 0,
})

const MAX = 500
const mode = ref('new')       // new: 다음 번호부터 | reprint: 번호 지정(훼손 라벨 다시 출력)
const state = ref(null)       // { lastIssued, next }
const count = ref(0)
const from = ref('')
const to = ref('')

async function loadState() {
  try { state.value = await books.barcodeState() } catch (e) { toast.error(e) }
}
onMounted(loadState)
// 기본 장수 = 라벨지 한 장(건너뛸 칸 제외)
watch([perPage, () => s.skip], () => { count.value = Math.max(1, perPage.value - Math.min(s.skip, perPage.value - 1)) }, { immediate: true })

// "EM00000010" 또는 숫자만 입력해도 됨
const toNo = (v) => (/^\d+$/.test(String(v).trim()) ? Number(v) : parseRegNo(v))

const range = computed(() => {
  if (mode.value === 'new') {
    if (!state.value || !(count.value >= 1)) return null
    const a = state.value.lastIssued + 1
    return { a, b: a + Math.min(count.value, MAX) - 1 }
  }
  const a = toNo(from.value)
  const b = to.value.trim() ? toNo(to.value) : a
  if (a == null || b == null || b < a || b - a >= MAX) return null
  return { a, b }
})
const codes = computed(() => {
  if (!range.value) return []
  const out = []
  for (let n = range.value.a; n <= range.value.b; n++) out.push(fmtRegNo(n))
  return out
})
// 인쇄 중(출력 확인 전)에는 번호를 고정한다. 번호를 먼저 잡으면 "다음 번호"가 바뀌기 때문
const printing = ref(null)    // { codes, from, reserved }
const shown = computed(() => printing.value?.codes ?? codes.value)
const pages = computed(() => paginate(shown.value))

async function print() {
  if (!codes.value.length) return toast('출력할 번호를 확인해주세요.', 'error')
  const job = { codes: [...codes.value], from: range.value.a, reserved: mode.value === 'new' }
  printing.value = job
  if (job.reserved) {
    try { state.value = await books.issueBarcodes(job.from, job.codes.length) }
    catch (e) { printing.value = null; toast.error(e); return loadState() }
  }
  await nextTick()
  window.print()
}
const printWin = () => window.print()
function printOk() {
  printing.value = null
  toast('바코드 라벨 출력을 완료했습니다.')
}
async function printCancel() {
  const job = printing.value
  printing.value = null
  if (!job.reserved) return
  try {
    state.value = await books.releaseBarcodes(job.from, job.codes.length)
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
          <div class="seg">
            <button :class="{ on: mode === 'new' }" @click="mode = 'new'">새 번호</button>
            <button :class="{ on: mode === 'reprint' }" @click="mode = 'reprint'">재출력</button>
          </div>
          <template v-if="mode === 'new'">
            <div class="line">
              <span class="lbl">시작 번호</span>
              <strong class="num">{{ state?.next ?? '…' }}</strong>
            </div>
            <label class="line">
              <span class="lbl">장수</span>
              <input v-model.number="count" class="input num count" type="number" min="1" :max="MAX" />
              <button type="button" class="btn sm" @click="count = perPage">한 장({{ perPage }})</button>
            </label>
          </template>
          <template v-else>
            <label class="line">
              <span class="lbl">번호</span>
              <input v-model="from" class="input num" placeholder="EM00000010" />
              <span class="muted">~</span>
              <input v-model="to" class="input num" placeholder="(한 장이면 비움)" />
            </label>
            <p class="sheet-note">훼손된 라벨을 다시 뽑을 때 씁니다. 다음 시작 번호는 바뀌지 않습니다.</p>
          </template>
          <p v-if="codes.length" class="sheet-note"><b class="num">{{ codes[0] }}</b> ~ <b class="num">{{ codes.at(-1) }}</b> · {{ codes.length }}장</p>
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
        <div v-for="(code, ci) in cells" :key="ci" class="label barcode-label" :class="{ blank: !code }">
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
.barcode-label { gap: .15em; padding: 0 3mm; font-weight: 400; }
.lib { font-size: .8em; letter-spacing: .02em; }
.bars { width: 100%; }
.code { font-size: 1em; font-weight: 700; letter-spacing: .08em; }
</style>
