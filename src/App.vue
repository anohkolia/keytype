<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import KeyTypeGame from './components/KeyTypeGame.vue'
import { useLocalStorage } from './composables/useLocalStorage'

// Utiliser localStorage pour sauvegarder la préférence de thème
const { value: savedDarkMode } = useLocalStorage<boolean>('keytype-darkmode',
  window.matchMedia('(prefers-color-scheme: dark)').matches)

const darkMode = ref<boolean>(savedDarkMode.value)

// Fonction pour basculer entre le mode clair et sombre
const toggleDarkMode = () => {
  darkMode.value = !darkMode.value
  applyTheme()
}

// Appliquer le thème sur le document
const applyTheme = () => {
  if (darkMode.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Observer les changements de préférence système
onMounted(() => {
  // Appliquer le thème initial
  applyTheme()

  // Écouter les changements de préférence système
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    // Ne changer automatiquement que si l'utilisateur n'a pas défini sa préférence manuellement
    if (localStorage.getItem('keytype-darkmode-user-preference') !== 'true') {
      darkMode.value = e.matches
      applyTheme()
    }
  })
})

// Sauvegarder la préférence utilisateur quand elle change
watch(darkMode, (newValue) => {
  savedDarkMode.value = newValue
  // Marquer que l'utilisateur a défini manuellement sa préférence
  localStorage.setItem('keytype-darkmode-user-preference', 'true')
})
</script>

<template>
  <div class="min-h-screen py-12 px-4 transition-colors duration-300">
    <header class="max-w-xl mx-auto mb-8 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <span class="text-xl font-bold text-blue-600 dark:text-blue-400">⌨️ KeyType</span>
      </div>
      <button
        @click="toggleDarkMode"
        class="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        aria-label="Toggle dark mode"
      >
        <svg v-if="darkMode" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      </button>
    </header>

    <KeyTypeGame />

    <footer class="max-w-xl mx-auto mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
      <p>© {{ new Date().getFullYear() }} KeyType - Application d'entraînement à la dactylographie</p>
    </footer>
  </div>
</template>
