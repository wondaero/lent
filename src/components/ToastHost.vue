<script setup>
import { toasts } from '@/stores/toast'
</script>

<template>
  <div class="toast-host" aria-live="polite">
    <div v-for="t in toasts" :key="t.id" class="toast pop-in" :class="t.tone">
      <!-- 성공 알림엔 새싹이 돋는 작은 표시 -->
      <svg v-if="t.tone !== 'error'" class="leaf" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M12 21v-8" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none" />
        <path d="M12 14C7 14 4 11 3.5 6.5 8 6.5 11.5 9.5 12 14Z" fill="#74bb2a" />
        <path d="M12 11c1.5-4.5 4.5-6.5 8.5-6.5C20 9 17 11.5 12 11Z" fill="#a6dc72" />
      </svg>
      <span>{{ t.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.toast-host { position: fixed; right: 20px; bottom: 20px; display: grid; gap: 8px; z-index: 100; }
.toast { display: flex; align-items: center; gap: 8px; padding: 10px 16px 10px 12px; border-radius: 999px; background: var(--text); color: var(--bg); font-size: 14px; box-shadow: var(--shadow); max-width: 420px; }
.toast.error { background: var(--red); color: #fff; padding-left: 16px; border-radius: var(--radius-sm); }
.leaf { flex: none; transform-origin: 50% 100%; animation: sprout .45s ease-out; }
@media print { .toast-host { display: none; } }
</style>
