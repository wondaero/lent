<script setup>
import { computed } from 'vue'

const props = defineProps({ total: Number, perPage: { type: Number, default: 20 } })
const page = defineModel({ type: Number, default: 1 })

const last = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
const pages = computed(() => {
  const size = 7
  let start = Math.max(1, page.value - Math.floor(size / 2))
  const end = Math.min(last.value, start + size - 1)
  start = Math.max(1, end - size + 1)
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})
const go = (p) => { if (p >= 1 && p <= last.value && p !== page.value) page.value = p }
</script>

<template>
  <div v-if="last > 1" class="pager">
    <button class="btn ghost sm" :disabled="page === 1" @click="go(1)" aria-label="처음">«</button>
    <button class="btn ghost sm" :disabled="page === 1" @click="go(page - 1)" aria-label="이전">‹</button>
    <button v-for="p in pages" :key="p" class="btn sm num" :class="p === page ? 'on' : 'ghost'" @click="go(p)">{{ p }}</button>
    <button class="btn ghost sm" :disabled="page === last" @click="go(page + 1)" aria-label="다음">›</button>
    <button class="btn ghost sm" :disabled="page === last" @click="go(last)" aria-label="마지막">»</button>
  </div>
</template>

<style scoped>
.pager { display: flex; justify-content: center; gap: 2px; padding: 14px; border-top: 1px solid var(--line); }
.pager .btn { min-width: 32px; }
/* 페이지 번호는 투명·평평, 현재 페이지도 내려앉히지 않음(줄이 어긋나 보임) */
.pager .btn.ghost, .pager .btn.ghost:active:not(:disabled) { --ledge: 0px; background: transparent; box-shadow: none; transform: none; }
.pager .btn.ghost:hover:not(:disabled) { background: var(--hover); }
.pager .btn.on { --ledge: 0px; transform: none; }
</style>
