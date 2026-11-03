import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/base.css'

try {
  const theme = localStorage.getItem('lent.theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme)
} catch {}

createApp(App).use(router).mount('#app')
