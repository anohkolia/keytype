import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Activer les transitions après le chargement de la page
window.addEventListener('load', () => {
  document.documentElement.classList.remove('no-transitions')
})

// Permettre aux transitions de fonctionner correctement quand la page se charge
document.documentElement.classList.add('no-transitions')

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
