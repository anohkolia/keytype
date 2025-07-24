import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Activer les transitions après le chargement de la page
window.addEventListener('DOMContentLoaded', () => {
  // Petit délai pour s'assurer que tout est rendu
  setTimeout(() => {
    document.documentElement.classList.remove('no-transitions')
  }, 100)
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
