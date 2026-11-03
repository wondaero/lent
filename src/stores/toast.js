import { reactive } from 'vue'

export const toasts = reactive([])
let id = 0

export function toast(message, tone = 'ok') {
  const t = { id: ++id, message, tone }
  toasts.push(t)
  setTimeout(() => {
    const i = toasts.indexOf(t)
    if (i >= 0) toasts.splice(i, 1)
  }, tone === 'error' ? 4000 : 2400)
}
toast.error = (e) => toast(e?.message || String(e), 'error')
