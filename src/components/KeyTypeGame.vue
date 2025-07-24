<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

type Language = 'french' | 'english'

// Phrases d'exemple
const TEXTS = {
  french: [
    "Le chat dort sur le canapé.",
    "JavaScript est un langage puissant.",
    "Paris est la capitale de la France."
  ],
  english: [
    "The quick brown fox jumps over the lazy dog.",
    "TypeScript improves code quality.",
    "London is the capital of England."
  ]
}

const language = ref<Language>('french')
const currentText = ref('')
const userInput = ref('')
const score = ref(0)
const startTime = ref<number | null>(null)
const wpm = ref(0)

// Sélectionne un texte aléatoire
const getRandomText = () => {
  const texts = TEXTS[language.value]
  return texts[Math.floor(Math.random() * texts.length)]
}

// Initialisation
const initGame = () => {
  currentText.value = getRandomText()
  userInput.value = ''
  startTime.value = Date.now()
}

// Calcul des mots par minute (WPM)
const calculateWPM = () => {
  if (!startTime.value) return 0
  const timeElapsed = (Date.now() - startTime.value) / 60000 // en minutes
  const words = userInput.value.trim().split(/\s+/).length
  return Math.round(words / timeElapsed)
}

// Vérification de la saisie
const checkInput = () => {
  if (userInput.value === currentText.value) {
    wpm.value = calculateWPM()
    score.value++
    initGame()
  }
}

// Changement de langue
const changeLanguage = (lang: Language) => {
  language.value = lang
  initGame()
}

// Partager le score (simulé)
const shareScore = () => {
  alert(`Score: ${score.value} | WPM: ${wpm.value}\n(Fonction de partage à implémenter)`)
}

onMounted(initGame)
</script>

<template>
  <div class="max-w-md mx-auto bg-white rounded-xl shadow-md p-6">
    <h1 class="text-2xl font-bold text-center mb-6">Entraînement de dactylographie</h1>

    <div class="flex justify-center gap-4 mb-6">
      <button
        @click="changeLanguage('french')"
        :class="['px-4 py-2 rounded', language === 'french' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
      >
        Français
      </button>
      <button
        @click="changeLanguage('english')"
        :class="['px-4 py-2 rounded', language === 'english' ? 'bg-blue-500 text-white' : 'bg-gray-200']"
      >
        English
      </button>
    </div>

    <div class="bg-gray-100 p-4 rounded-lg mb-4 min-h-20">
      <p class="text-lg">{{ currentText }}</p>
    </div>

    <input
      v-model="userInput"
      @input="checkInput"
      class="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Commencez à taper..."
      autofocus
    />

    <div class="flex justify-between items-center">
      <div class="text-lg font-semibold">
        Score: <span class="text-blue-600">{{ score }}</span>
        <span v-if="wpm > 0" class="ml-4">WPM: <span class="text-green-600">{{ wpm }}</span></span>
      </div>

      <button
        @click="shareScore"
        class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Partager
      </button>
    </div>
  </div>
</template>
