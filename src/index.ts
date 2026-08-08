import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { initTheme } from './composables/useTheme'
import { initLang } from './i18n'

initTheme()
initLang()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
