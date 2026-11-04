<script setup>
// Code 128 바코드(SVG). 폭은 부모에 맞춰 늘어나고, 좌우 여백(quiet zone 10모듈)을 포함한다
import { computed } from 'vue'
import { code128Widths } from '@/lib/code128'

const props = defineProps({ value: { type: String, required: true } })
const QUIET = 10

const bars = computed(() => {
  const out = []
  let x = QUIET
  code128Widths(props.value).forEach((w, i) => {
    if (i % 2 === 0) out.push({ x, w })
    x += w
  })
  return { list: out, total: x + QUIET }
})
</script>

<template>
  <svg class="barcode" :viewBox="`0 0 ${bars.total} 10`" preserveAspectRatio="none" role="img" :aria-label="value">
    <rect v-for="(b, i) in bars.list" :key="i" :x="b.x" y="0" :width="b.w" height="10" />
  </svg>
</template>

<style scoped>
/* 인쇄물이라 테마와 무관하게 항상 검정 */
.barcode { display: block; width: 100%; fill: #000; shape-rendering: crispEdges; }
</style>
