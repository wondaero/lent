<script setup>
// 인쇄 후 출력물 확인 창. 브라우저는 실제로 출력됐는지 알 수 없어서 사람이 출력물을 보고 답해야 한다.
// 세 버튼 중 하나를 누르기 전에는 닫히지 않는다(바깥 클릭·Esc 무시, 화면 이동은 각 탭에서 막음)
defineProps({
  open: { type: Boolean, default: false },
  cancelLabel: { type: String, default: '인쇄 안 함' },
})
const emit = defineEmits(['ok', 'retry', 'cancel'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-scrim no-print">
      <div class="modal card" role="alertdialog" aria-modal="true" aria-labelledby="print-check-title">
        <div class="card-head"><h3 id="print-check-title">출력물을 확인해주세요</h3></div>
        <div class="body">
          <slot />
          <p class="muted hint">인쇄를 취소했거나 아직 안 나왔다면 [다시 인쇄], 잘못 나왔으면 라벨지를 바꾸고 [다시 인쇄]를 누르세요.</p>
        </div>
        <div class="foot">
          <button type="button" class="btn" @click="emit('cancel')">{{ cancelLabel }}</button>
          <div class="grow" />
          <button type="button" class="btn secondary" @click="emit('retry')">다시 인쇄</button>
          <button type="button" class="btn primary" @click="emit('ok')">잘 나왔어요</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-scrim { position: fixed; inset: 0; z-index: 60; background: rgb(0 0 0 / .4); display: grid; place-items: center; padding: 16px; }
.modal { width: min(480px, 100%); box-shadow: var(--shadow); }
.body { padding: 16px 18px 4px; display: grid; gap: 10px; font-size: 14.5px; }
.body :deep(p) { margin: 0; }
.hint { font-size: 13px; }
.foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 14px 18px 16px; }
.grow { flex: 1; }
</style>
