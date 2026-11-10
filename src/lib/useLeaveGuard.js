import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

// 작성 중인 내용을 지키는 장치: 저장하지 않고 메뉴를 누르거나 탭을 닫으면 한 번 묻는다.
// snapshot()으로 "저장된 상태"를 기억하고, 지금 값(read)과 다르면 작성 중으로 본다.
//   const guard = useLeaveGuard(() => ({ ...form, photos: photos.value.map((p) => p.id ?? p.url) }))
//   불러온 뒤·저장한 뒤 guard.snapshot(), 삭제 뒤처럼 묻지 않고 나갈 때 guard.skip()
export function useLeaveGuard(read, message = '저장하지 않은 내용이 있습니다. 이 화면을 나갈까요?') {
  const saved = ref(JSON.stringify(read()))
  const skipping = ref(false)
  const dirty = computed(() => !skipping.value && JSON.stringify(read()) !== saved.value)
  const snapshot = () => { saved.value = JSON.stringify(read()) }
  const skip = () => { skipping.value = true }

  onBeforeRouteLeave(() => !dirty.value || confirm(message))
  const onUnload = (e) => { if (dirty.value) { e.preventDefault(); e.returnValue = '' } }
  onMounted(() => window.addEventListener('beforeunload', onUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onUnload))

  return { dirty, snapshot, skip }
}
