<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useLocalStorage } from '@/composables/useLocalStorage'

type Language = 'french' | 'english'

interface Translation {
  title: string
  startTyping: string
  share: string
  score: string
  accuracy: string
  highScore: string
  reset: string
}

// Traductions UI
const translations: Record<Language, Translation> = {
  french: {
    title: 'Entraînement de dactylographie',
    startTyping: 'Commencez à taper...',
    share: 'Partager',
    score: 'Score',
    accuracy: 'Précision',
    highScore: 'Meilleur score',
    reset: 'Réinitialiser'
  },
  english: {
    title: 'Typing Training',
    startTyping: 'Start typing...',
    share: 'Share',
    score: 'Score',
    accuracy: 'Accuracy',
    highScore: 'High Score',
    reset: 'Reset'
  }
}

// Phrases d'exemple
const TEXTS = {
  french: [
    "Le chat dort sur le canapé.",
    "JavaScript est un langage puissant.",
    "Paris est la capitale de la France.",
    "Les montagnes sont magnifiques en automne.",
    "La programmation est une compétence utile."
  ],
  english: [
    "The quick brown fox jumps over the lazy dog.",
    "TypeScript improves code quality.",
    "London is the capital of England.",
    "Programming is both an art and a science.",
    "Practice makes perfect when learning to type."
  ]
}

// État du jeu persistant
const { value: savedLanguage } = useLocalStorage<Language>('keytype-language', 'french')
const { value: savedHighScore } = useLocalStorage<number>('keytype-highscore', 0)

const language = ref<Language>(savedLanguage.value)
const highScore = ref<number>(savedHighScore.value)
const currentText = ref('')
const userInput = ref('')
const score = ref(0)
const startTime = ref<number | null>(null)
const wpm = ref(0)
const errors = ref(0)
const totalKeystrokes = ref(0)

// Sélectionne un texte aléatoire
const getRandomText = () => {
  const texts = TEXTS[language.value]
  return texts[Math.floor(Math.random() * texts.length)]
}

// Calcul de précision
const accuracy = computed(() => {
  if (totalKeystrokes.value === 0) return 100
  return Math.round(((totalKeystrokes.value - errors.value) / totalKeystrokes.value) * 100)
})

// Traductions actuelles selon la langue
const t = computed(() => translations[language.value])

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

// Réinitialisation du jeu
const resetGame = () => {
  score.value = 0
  wpm.value = 0
  errors.value = 0
  totalKeystrokes.value = 0
  initGame()
}

// Vérification de la saisie
const checkInput = () => {
  // Incrémente le nombre total de frappes
  totalKeystrokes.value++

  // Vérifie les erreurs de frappe
  for (let i = 0; i < userInput.value.length; i++) {
    if (userInput.value[i] !== currentText.value[i]) {
      errors.value++
      break
    }
  }

  // Vérifie si l'utilisateur a terminé correctement le texte
  if (userInput.value === currentText.value) {
    wpm.value = calculateWPM()
    score.value++

    // Mise à jour du meilleur score
    if (score.value > highScore.value) {
      highScore.value = score.value
    }

    initGame()
  }
}

// Changement de langue
const changeLanguage = (lang: Language) => {
  language.value = lang
  initGame()
}

// Partager le score
const shareScore = () => {
  const text = `${t.value.score}: ${score.value} | WPM: ${wpm.value} | ${t.value.accuracy}: ${accuracy.value}%`

  if (navigator.share) {
    navigator.share({
      title: 'KeyType - Score',
      text: text
    }).catch(error => {
      console.error('Erreur lors du partage:', error)
      fallbackShare(text)
    })
  } else {
    fallbackShare(text)
  }
}

// Méthode de partage alternative
const fallbackShare = (text: string) => {
  // Copie dans le presse-papier
  navigator.clipboard.writeText(text)
    .then(() => alert('Score copié dans le presse-papier!'))
    .catch(() => alert(text))
}

// Observateurs pour sauvegarder les préférences
watch(language, (newLang) => {
  savedLanguage.value = newLang
})

watch(highScore, (newScore) => {
  savedHighScore.value = newScore
})

onMounted(initGame)
</script>

<template>
  <div class="max-w-xl mx-auto bg-white rounded-xl shadow-md p-6 transition-all duration-300 dark:bg-gray-800 dark:text-white">
    <h1 class="text-2xl font-bold text-center mb-6">{{ t.title }}</h1>

    <div class="flex justify-center gap-4 mb-6">
      <button
        @click="changeLanguage('french')"
        :class="['px-4 py-2 rounded transition-colors', language === 'french' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700']"
      >
        Français
      </button>
      <button
        @click="changeLanguage('english')"
        :class="['px-4 py-2 rounded transition-colors', language === 'english' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700']"
      >
        English
      </button>
    </div>

    <div class="bg-gray-100 p-4 rounded-lg mb-4 min-h-20 dark:bg-gray-700 relative">
      <p class="text-lg font-mono">
        <span
          v-for="(char, index) in currentText"
          :key="index"
          :class="{
            'text-green-600 dark:text-green-400': index < userInput.length && userInput[index] === char,
            'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30': index < userInput.length && userInput[index] !== char,
            'text-black dark:text-white': index >= userInput.length
          }"
        >{{ char }}</span>
      </p>
      <div
        v-if="startTime"
        class="absolute top-2 right-2 text-sm bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded-full font-mono text-blue-800 dark:text-blue-300"
      >
        {{ wpm > 0 ? wpm + ' WPM' : 'Typing...' }}
      </div>
    </div>

    <input
      v-model="userInput"
      @input="checkInput"
      class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
      :placeholder="t.startTyping"
      autofocus
    />

    <div class="grid grid-cols-2 gap-4 mb-4">
      <div class="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg text-center">
        <div class="text-sm text-gray-600 dark:text-gray-300">{{ t.score }}</div>
        <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ score }}</div>
      </div>
      <div class="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg text-center">
        <div class="text-sm text-gray-600 dark:text-gray-300">{{ t.accuracy }}</div>
        <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ accuracy }}%</div>
      </div>
    </div>

    <div class="flex justify-between items-center">
      <div class="text-sm">
        {{ t.highScore }}: <span class="font-semibold text-purple-600 dark:text-purple-400">{{ highScore }}</span>
      </div>

      <div class="flex gap-2">
        <button
          @click="resetGame"
          class="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
        >
          {{ t.reset }}
        </button>
        <button
          @click="shareScore"
          class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
        >
          {{ t.share }}
        </button>
      </div>
    </div>
  </div>
</template>
