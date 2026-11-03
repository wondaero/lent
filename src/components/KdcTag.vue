<script setup>
import { computed } from 'vue'
import { KDC } from '@/lib/constants'

const props = defineProps({ classNo: { type: String, default: '' } })
const major = computed(() => (/^\d/.test(props.classNo) ? +props.classNo[0] : null))
</script>

<template>
  <span
    v-if="classNo"
    class="kdc num"
    :style="major !== null ? { '--c': `var(--kdc-${major})` } : null"
    :title="major !== null ? `${major}00 ${KDC[major]}` : ''"
  >{{ classNo }}</span>
</template>

<style scoped>
/* 책등 색띠처럼: 왼쪽 굵은 색 막대 + 옅은 배경. 글자는 본문색 유지(가독성) */
.kdc {
  --c: var(--text-3);
  display: inline-flex; align-items: center;
  height: 24px; padding: 0 8px 0 7px;
  border-left: 4px solid var(--c);
  border-radius: 4px;
  background: color-mix(in srgb, var(--c) 14%, var(--surface));
  color: var(--text);
  font-size: 13px; font-weight: 600; white-space: nowrap;
}
</style>
