import { onActivated, onBeforeUnmount, onMounted, ref } from 'vue'
import { addDays, lastSaturday } from './format'

// 화면을 켜 둔 채 날짜가 바뀌어도 "오늘"이 따라가게 한다.
// (카운터 PC는 밤새 켜 두기도 함 → 다음 날 반납이 어제 날짜로 소급되는 사고 방지)
export function useToday() {
  const today = ref(addDays(0))
  const saturday = ref(lastSaturday())
  const refresh = () => {
    const t = addDays(0)
    if (t !== today.value) {
      today.value = t
      saturday.value = lastSaturday()
    }
  }
  let timer
  onMounted(() => {
    timer = setInterval(refresh, 60_000)
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('focus', refresh)
  })
  onActivated(refresh)
  onBeforeUnmount(() => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', refresh)
    window.removeEventListener('focus', refresh)
  })
  return { today, saturday, refresh }
}
