<script setup lang="ts">
import KeyTypeGame from './components/KeyTypeGame.vue'
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4">
    <header class="max-w-xl mx-auto mb-8 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <span class="text-xl font-bold text-blue-600">⌨️ KeyType</span>
      </div>
    </header>

    <KeyTypeGame />

    <footer class="max-w-xl mx-auto mt-12 text-center text-sm text-gray-500">
      <p>© {{ new Date().getFullYear() }} KeyType - Application d'entraînement à la dactylographie</p>
    </footer>
  </div>
</template>
