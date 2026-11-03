import { createApp } from 'vue'
import './assets/css/normalize.css'
import './assets/css/layout.css'
import './style.css'


import App from './App.vue'
import router from './router'


createApp(App)
.use(router)
.mount('#app')
