<script setup lang="ts">
import KeyTypeGame from './components/KeyTypeGame.vue'
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
    <header class="max-w-4xl mx-auto mb-10 text-center">
      <div class="flex items-center justify-center gap-3 mb-4">
        <div
          class="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md"
        >
          <i class="fas fa-keyboard text-white text-xl"></i>
        </div>
        <h1
          class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent"
        >
          TypeKey
        </h1>
      </div>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">
        Améliorez votre vitesse de frappe avec notre entraînement interactif et progressif
      </p>
    </header>

    <KeyTypeGame />

    <footer class="max-w-4xl mx-auto mt-16 text-center">
      <div class="border-t border-gray-200 pt-8">
        <p class="text-sm text-gray-500">
          <i class="fas fa-heart text-red-500 mr-1"></i>
          © {{ new Date().getFullYear() }} TypeKey - Développé pour les amateurs de dactylographie
        </p>
      </div>
    </footer>
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

body {
  font-family: 'Inter', sans-serif;
}

/* Animation de pulse plus douce */
@keyframes gentle-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.animate-gentle-pulse {
  animation: gentle-pulse 2s ease-in-out infinite;
}

/* Transition smooth pour tous les états */
* {
  transition-property: color, background-color, border-color, transform, box-shadow;
  transition-duration: 200ms;
  transition-timing-function: ease-in-out;
}
</style>
