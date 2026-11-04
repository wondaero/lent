<script setup>
// 엑셀 내보내기 버튼. run()이 끝날 때까지 중복 클릭을 막는다
import { ref } from 'vue'
import { toast } from '@/stores/toast'

const props = defineProps({ run: { type: Function, required: true } })
const busy = ref(false)

async function click() {
  if (busy.value) return
  busy.value = true
  try { await props.run() }
  catch (e) { toast.error(e) }
  finally { busy.value = false }
}
</script>

<template>
  <button type="button" class="btn sm" :disabled="busy" @click="click">
    <!-- 엑셀 표 아이콘. 색은 아이콘에만(버튼 자체는 tertiary) -->
    <svg class="xl" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.5" />
      <path d="M1.5 6h13M1.5 10.5h13M6 6v8.5" stroke="currentColor" stroke-width="1.2" />
    </svg>
    {{ busy ? '내보내는 중…' : '엑셀 내보내기' }}
  </button>
</template>

<style scoped>
.xl { color: var(--excel); flex: none; }
</style>
