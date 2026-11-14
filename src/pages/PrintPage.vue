<script setup>
// 라벨 출력. 라벨지가 두 종류라 탭으로 나눈다.
// 업무 순서: ① 바코드 라벨을 번호순으로 미리 출력 → ② 책에 붙이고 도서 등록(바코드 스캔) → ③ 모인 청구기호 라벨 출력
import { ref, watch } from 'vue'
import SpineLabels from './print/SpineLabels.vue'
import BarcodeLabels from './print/BarcodeLabels.vue'

const TAB_KEY = 'lent.printTab'
const tab = ref((() => { try { return localStorage.getItem(TAB_KEY) || 'spine' } catch { return 'spine' } })())
watch(tab, (v) => { try { localStorage.setItem(TAB_KEY, v) } catch {} })
</script>

<template>
  <component :is="tab === 'barcode' ? BarcodeLabels : SpineLabels">
    <div class="seg tabs" role="tablist">
      <button role="tab" :aria-selected="tab === 'spine'" :class="{ on: tab === 'spine' }" @click="tab = 'spine'">청구기호 라벨 (책등)</button>
      <button role="tab" :aria-selected="tab === 'barcode'" :class="{ on: tab === 'barcode' }" @click="tab = 'barcode'">바코드 라벨 (등록번호)</button>
    </div>
  </component>
</template>

<!-- 두 탭 공통(라벨지 미리보기·컨트롤). 하위 컴포넌트가 같은 클래스를 쓰므로 scoped가 아닌 .print-page 아래로 한정 -->
<style>
.print-page { display: grid; grid-template-columns: 380px 1fr; gap: 18px; align-items: start; }
.print-page .controls { display: grid; gap: 18px; position: sticky; top: 80px; }
.print-page .tabs { display: flex; }
.print-page .tabs button { flex: 1; }
.print-page .inline { display: flex; gap: 6px; }
.print-page .sheet-note { margin: 0; font-size: 13px; color: var(--text-2); }
.print-page .pick-head { display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.print-page .pick-head label, .print-page .check { display: inline-flex; gap: 6px; align-items: center; cursor: pointer; font-size: 14px; }
.print-page .pick { list-style: none; margin: 0; padding: 0; max-height: 300px; overflow: auto; border: 1px solid var(--line); border-radius: 8px; contain: content; }
.print-page .pick li + li { border-top: 1px solid var(--line); }
.print-page .pick label { display: flex; gap: 10px; align-items: center; padding: 8px 10px; cursor: pointer; }
.print-page .pick label:hover { background: var(--hover); }
.print-page .pick .grow { display: grid; min-width: 0; flex: 1; }
.print-page .pick .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
.print-page .small { font-size: 12px; }
.print-page .grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.print-page .grid3 .input { height: 34px; }

/* 인쇄물 미리보기는 테마와 무관하게 흰 종이 + 검정 글자 */
.print-page .preview { overflow: auto; display: grid; gap: 18px; justify-content: safe center; padding-bottom: 24px; }
.print-page .sheet { width: 210mm; height: 297mm; background: #fff; color: #000; box-shadow: var(--shadow); display: grid; align-content: start; overflow: hidden; }
.print-page .label { outline: 1px dashed #c8c8c8; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .1em; line-height: 1.15; font-weight: 700; font-family: 'Malgun Gothic', sans-serif; overflow: hidden; }
.print-page .label.used { background: repeating-linear-gradient(45deg, #fafafa, #fafafa 4px, #f0f0f0 4px, #f0f0f0 8px); }
/* 첫 장의 칸을 누르면 그 칸부터 인쇄(쓰다 남은 라벨지). 화면에서만 표시 */
.print-page .label.pick { cursor: pointer; }
.print-page .label.pick:hover { background: color-mix(in srgb, var(--brand) 12%, #fff); }
.print-page .label.start { outline: 2px solid var(--brand); outline-offset: -2px; }
.print-page .label .line, .print-page .reg { text-align: center; }
.print-page .reg { font-size: .65em; font-weight: 400; margin-top: .2em; }
/* 청구기호 라벨: 위쪽에 청구기호, 아래쪽에 등록번호. 라벨 가장자리와 3mm 띄운다: 용지를 조금 비뚤게 넣어도 글자가 라벨 밖으로 나가지 않게(사용자 의견 2026-11-14, 1.5mm에서 늘림) */
.print-page .call-label { align-self: stretch; flex: 1; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 3mm 0; }
.print-page .call-label .reg { font-size: .8em; margin-top: 0; }

@media (max-width: 1100px) {
  .print-page { grid-template-columns: 1fr; }
  .print-page .controls { position: static; }
}

@media print {
  @page { size: A4; margin: 0; }
  body { background: #fff; }
  .no-print { display: none !important; }
  .print-page { display: block !important; }
  .print-page .preview { display: block; padding: 0; overflow: visible; }
  .print-page .sheet { box-shadow: none; break-after: page; }
  /* 칸 테두리는 화면 미리보기용. 시작 칸 표시(.start)가 더 구체적인 선택자라 그냥 none으로는 안 지워져 인쇄됐다 → 전부 강제로 끔 */
  .print-page .label, .print-page .label.start, .print-page .label.pick { outline: none !important; box-shadow: none !important; }
  .print-page .label.used, .print-page .label.pick:hover { background: none; }
}
</style>
