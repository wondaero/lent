<script setup>
import { toasts } from '@/stores/toast'
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast" :class="t.tone">{{ t.message }}</div>
  </div>
</template>

<style scoped>
.toast-host { position: fixed; right: 20px; bottom: 20px; display: grid; gap: 8px; z-index: 100; }
.toast { padding: 10px 16px; border-radius: 8px; background: var(--text); color: var(--bg); font-size: 14px; box-shadow: var(--shadow); max-width: 360px; }
.toast.error { background: var(--red); color: #fff; }
@media print { .toast-host { display: none; } }
</style>
