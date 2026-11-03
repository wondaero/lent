<script setup>
import { ref, watch } from 'vue'
import { debounce } from '@/lib/format'

// 입력은 즉시 반영, 바깥 v-model은 디바운스 후 갱신 → 타이핑마다 조회하지 않음
const model = defineModel({ type: String, default: '' })
defineProps({ placeholder: { type: String, default: '검색' } })

const text = ref(model.value)
const push = debounce((v) => (model.value = v), 250)
watch(text, push)
watch(model, (v) => { if (v !== text.value) text.value = v })

function flush() { model.value = text.value }
</script>

<template>
  <label class="search">
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12z" fill="currentColor" /></svg>
    <span class="sr-only">{{ placeholder }}</span>
    <input v-model="text" class="input" type="search" :placeholder="placeholder" @keydown.enter="flush" />
  </label>
</template>
