import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initSession } from './stores/auth'
import { toast } from './stores/toast'
import './styles/base.css'

try {
  const theme = localStorage.getItem('lent.theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme)
} catch {}

// 로그인 상태를 먼저 복원한 뒤 화면을 띄운다(새로고침 때 로그인 화면이 잠깐 보이는 것 방지)
initSession(() => {
  toast('로그인이 만료되었습니다. 다시 로그인해주세요.', 'error')
  router.replace({ name: 'login' })
}).finally(() => createApp(App).use(router).mount('#app'))
