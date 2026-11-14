<script setup>
// 삭제 같은 되돌릴 수 없는 작업의 확인 창(브라우저 기본 confirm 대신).
// 기본 confirm은 Enter 한 번에 확정되고 무엇을 지우는지 한눈에 안 보여서, 대상 정보를 보여주고 커서는 [취소]에 둔다.
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  confirmLabel: { type: String, default: '삭제' },
  danger: { type: Boolean, default: true },   // false = 되돌릴 수 있는 확인(확정 버튼 primary)
  busy: { type: Boolean, default: false },   // 처리 중에는 닫히지 않게(요청이 끝나기 전에 화면을 떠나지 않도록)
})
const emit = defineEmits(['confirm', 'cancel'])

// 열려 있는 동안 뒤 화면(#app)을 inert로(Tab으로 뒤쪽 버튼을 눌러 창을 우회하지 않게). 창은 body로 옮겨져 영향 없음
const cancelBtn = ref(null)
const setInert = (on) => document.getElementById('app')?.toggleAttribute('inert', on)
watch(() => props.open, (on) => {
  setInert(on)
  if (on) nextTick(() => cancelBtn.value?.focus())
}, { immediate: true })
onBeforeUnmount(() => setInert(false))

function cancel() {
  if (!props.busy) emit('cancel')
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-scrim" @click.self="cancel" @keydown.esc="cancel">
      <div class="modal card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
        <div class="card-head"><h3 id="confirm-title">{{ title }}</h3></div>
        <div class="body"><slot /></div>
        <div class="foot">
          <button ref="cancelBtn" type="button" class="btn" :disabled="busy" @click="cancel">취소</button>
          <button type="button" class="btn" :class="danger ? 'danger' : 'primary'" :disabled="busy" @click="emit('confirm')">{{ busy ? '처리 중…' : confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-scrim { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / .35); display: grid; place-items: center; padding: 16px; }
.modal { width: min(420px, 100%); box-shadow: var(--shadow); }
.body { padding: 16px 18px 4px; display: grid; gap: 10px; font-size: 14px; }
.body :deep(p) { margin: 0; }
.body :deep(.cd-meta) { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 6px 10px; margin: 0; font-size: 13.5px; }
.body :deep(.cd-meta dt) { color: var(--text-3); }
.body :deep(.cd-meta dd) { margin: 0; overflow-wrap: anywhere; }
.body :deep(.cd-note) { font-size: 13px; color: var(--text-2); }
.foot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px 16px; }
</style>
