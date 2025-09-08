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
  time: string
  bestTime: string
  challenge: string
  startChallenge: string
  challengeDescription: string
}

interface Score {
  wpm: number;
  accuracy: number;
  date: string;
  mode: 'normal' | 'challenge';
}

// Traductions UI
const translations: Record<Language, Translation> = {
  french: {
    title: 'KeyType - Entraînement de dactylographie',
    startTyping: 'Commencez à taper...',
    share: 'Partager',
    score: 'Score',
    accuracy: 'Précision',
    highScore: 'Meilleur score',
    reset: 'Réinitialiser',
    time: 'Temps',
    bestTime: 'Meilleur temps',
    challenge: 'Défi 60s',
    startChallenge: 'Commencer le défi',
    challengeDescription: 'Tapez le plus de mots en 60 secondes!'
  },
  english: {
    title: 'KeyType - Typing Training',
    startTyping: 'Start typing...',
    share: 'Share',
    score: 'Score',
    accuracy: 'Accuracy',
    highScore: 'High Score',
    reset: 'Reset',
    time: 'Time',
    bestTime: 'Best Time',
    challenge: '60s Challenge',
    startChallenge: 'Start Challenge',
    challengeDescription: 'Type as many words as you can in 60 seconds!'
  }
}

// Phrases d'exemple
const TEXTS = {
  french: [
    "Le chat dort sur le canapé.",
    "JavaScript est un langage puissant.",
    "Paris est la capitale de la France.",
    "Les montagnes sont magnifiques en automne.",
    "La programmation est une compétence utile.",
    "Le soleil brille intensément aujourd'hui.",
    "Les développeurs aiment résoudre des problèmes complexes.",
    "La pratique régulière améliore la vitesse de frappe.",
    "Vue.js est un framework JavaScript progressif.",
    "TypeScript offre un typage statique optionnel."
  ],
  english: [
    "The quick brown fox jumps over the lazy dog.",
    "TypeScript improves code quality.",
    "London is the capital of England.",
    "Programming is both an art and a science.",
    "Practice makes perfect when learning to type.",
    "The weather is beautiful this time of year.",
    "Developers enjoy solving complex problems.",
    "Regular practice improves typing speed significantly.",
    "Vue.js is a progressive JavaScript framework.",
    "TypeScript provides optional static typing."
  ]
}

// État du jeu persistant
const { value: savedLanguage } = useLocalStorage<Language>('keytype-language', 'french')
const { value: savedHighScore } = useLocalStorage<number>('keytype-highscore', 0)
const { value: savedBestTime } = useLocalStorage<number>('keytype-besttime', 0)
const { value: scores } = useLocalStorage<Score[]>('typing-scores', [])

const language = ref<Language>(savedLanguage.value)
const highScore = ref<number>(savedHighScore.value)
const bestTime = ref<number>(savedBestTime.value)
const currentText = ref('')
const userInput = ref('')
const score = ref(0)
const startTime = ref<number | null>(null)
const wpm = ref(0)
const errors = ref(0)
const totalKeystrokes = ref(0)
const challengeMode = ref(false)
const challengeTimeLeft = ref(0)
const challengeTimer = ref<number | null>(null)

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

// Calcul du temps écoulé
const elapsedTime = computed(() => {
  if (!startTime.value) return 0
  return Math.floor((Date.now() - startTime.value) / 1000)
})

// Traductions actuelles selon la langue
const t = computed(() => translations[language.value])

// Initialisation
const initGame = () => {
  currentText.value = getRandomText()
  userInput.value = ''
  startTime.value = Date.now()
  errors.value = 0
  totalKeystrokes.value = 0
  wpm.value = 0
}

// Démarrer le défi
const startChallenge = () => {
  challengeMode.value = true
  score.value = 0
  challengeTimeLeft.value = 60
  initGame()

  if (challengeTimer.value) {
    clearInterval(challengeTimer.value)
  }

  challengeTimer.value = setInterval(() => {
    challengeTimeLeft.value--

    if (challengeTimeLeft.value <= 0) {
      endChallenge()
    }
  }, 1000) as unknown as number
}

// Terminer le défi
const endChallenge = () => {
  if (challengeTimer.value) {
    clearInterval(challengeTimer.value)
    challengeTimer.value = null
  }

  challengeMode.value = false

  // Mise à jour du meilleur temps
  if (score.value > bestTime.value) {
    bestTime.value = score.value
  }
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
  if (challengeMode.value) {
    endChallenge()
  }

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

  // SAUVEGARDER LE SCORE (ajouter cette ligne)
  saveScore({
    wpm: wpm.value,
    accuracy: accuracy.value,
    mode: challengeMode.value ? 'challenge' : 'normal'
  })

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
  const text = challengeMode.value
    ? `${t.value.challenge}: ${score.value} ${t.value.score} | ${t.value.accuracy}: ${accuracy.value}%`
    : `${t.value.score}: ${score.value} | WPM: ${wpm.value} | ${t.value.accuracy}: ${accuracy.value}%`

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

const saveScore = (newScore: Omit<Score, 'date'>) => {
  scores.value = [
    ...scores.value,
    { ...newScore, date: new Date().toISOString() }
  ].sort((a, b) => b.wpm - a.wpm).slice(0, 10) // Garder les 10 meilleurs
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

watch(bestTime, (newTime) => {
  savedBestTime.value = newTime
})

onMounted(initGame)
</script>

<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-xl mx-auto bg-white rounded-xl shadow-md p-6">
      <h1 class="text-2xl font-bold text-gray-800 text-center mb-6">{{ t.title }}</h1>

      <div class="flex justify-center gap-4 mb-6">
        <button
          @click="changeLanguage('french')"
          :class="['px-4 py-2 rounded transition-colors', language === 'french' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700']"
        >
          Français
        </button>
        <button
          @click="changeLanguage('english')"
          :class="['px-4 py-2 rounded transition-colors', language === 'english' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700']"
        >
          English
        </button>
      </div>

      <!-- Mode défi -->
      <div v-if="challengeMode" class="mb-6 p-4 bg-yellow-100 rounded-lg">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="font-semibold text-yellow-800">{{ t.challenge }}</h3>
            <p class="text-sm text-yellow-700">{{ t.challengeDescription }}</p>
          </div>
          <div class="text-2xl font-bold text-yellow-800">{{ challengeTimeLeft }}s</div>
        </div>
      </div>

      <div class="bg-gray-100 p-4 rounded-lg mb-4 min-h-20 relative">
        <p class="text-lg font-mono leading-relaxed">
          <span
            v-for="(char, index) in currentText"
            :key="index"
            :class="{
              'text-green-600': index < userInput.length && userInput[index] === char,
              'text-red-600 bg-red-100': index < userInput.length && userInput[index] !== char,
              'text-black': index >= userInput.length,
              'animate-pulse': index === userInput.length
            }"
          >{{ char }}</span>
        </p>
        <div
          v-if="startTime"
          class="absolute top-2 right-2 text-sm bg-blue-100 px-2 py-1 rounded-full font-mono text-blue-800"
        >
          {{ wpm > 0 ? wpm + ' WPM' : '...' }}
        </div>
      </div>

      <input
        v-model="userInput"
        @input="checkInput"
        class="w-full p-3 border border-gray-300 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        :placeholder="t.startTyping"
        :disabled="challengeMode && challengeTimeLeft <= 0"
        autofocus
      />

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div class="bg-blue-50 p-3 rounded-lg text-center">
          <div class="text-sm text-gray-600">{{ t.score }}</div>
          <div class="text-2xl font-bold text-blue-600">{{ score }}</div>
        </div>
        <div class="bg-green-50 p-3 rounded-lg text-center">
          <div class="text-sm text-gray-600">{{ t.accuracy }}</div>
          <div class="text-2xl font-bold text-green-600">{{ accuracy }}%</div>
        </div>
        <div class="bg-purple-50 p-3 rounded-lg text-center">
          <div class="text-sm text-gray-600">{{ t.time }}</div>
          <div class="text-2xl font-bold text-purple-600">{{ elapsedTime }}s</div>
        </div>
        <div class="bg-amber-50 p-3 rounded-lg text-center">
          <div class="text-sm text-gray-600">{{ challengeMode ? t.bestTime : t.highScore }}</div>
          <div class="text-2xl font-bold text-amber-600">{{ challengeMode ? bestTime : highScore }}</div>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex gap-2">
          <button
            @click="resetGame"
            class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors text-sm"
          >
            {{ t.reset }}
          </button>
          <button
            v-if="!challengeMode"
            @click="startChallenge"
            class="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors text-sm"
          >
            {{ t.startChallenge }}
          </button>
        </div>

        <button
          @click="shareScore"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm flex items-center gap-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
          {{ t.share }}
        </button>
      </div>
    </div>
  </div>
</template>

<style>
.animate-pulse {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
