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

// Fonction pour empêcher le copier-coller
const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  // Feedback visuel pour indiquer que le collage est bloqué
  const input = event.target as HTMLInputElement
  input.classList.add('shake-animation')
  setTimeout(() => {
    input.classList.remove('shake-animation')
  }, 500)
}

const handleCopy = (event: ClipboardEvent) => {
  event.preventDefault()
}

const handleCut = (event: ClipboardEvent) => {
  event.preventDefault()
}

// Fonction pour empêcher le glisser-déposer de texte
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  // Feedback visuel
  const input = event.target as HTMLInputElement
  input.classList.add('shake-animation')
  setTimeout(() => {
    input.classList.remove('shake-animation')
  }, 500)
}

// Protection contre le clic droit (menu contextuel)
const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
}

// Protection contre les raccourcis clavier (Ctrl+C, Ctrl+V, etc.)
const handleKeyDown = (event: KeyboardEvent) => {
  const ctrlKey = event.ctrlKey || event.metaKey // Pour Mac (Cmd)

  // Bloquer Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A (sélection totale)
  if (ctrlKey && ['c', 'v', 'x', 'a'].includes(event.key)) {
    event.preventDefault()

    // Feedback visuel pour Ctrl+V
    if (event.key === 'v') {
      const input = event.target as HTMLInputElement
      input.classList.add('shake-animation')
      setTimeout(() => {
        input.classList.remove('shake-animation')
      }, 500)
    }
  }

  // Bloquer le menu contextuel avec Shift+F10 ou Menu key
  if (event.key === 'F10' && event.shiftKey || event.key === 'ContextMenu') {
    event.preventDefault()
  }
}

// Réinitialiser le champ si tentative de triche détectée
watch(userInput, (newValue) => {
  // Détecter si l'utilisateur essaie de coller un long texte
  if (newValue.length > currentText.value.length) {
    userInput.value = newValue.slice(0, currentText.value.length)

    // Feedback visuel
    const input = document.querySelector('input') as HTMLInputElement
    if (input) {
      input.classList.add('shake-animation')
      setTimeout(() => {
        input.classList.remove('shake-animation')
      }, 500)
    }
  }
})

</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Cartes de statistiques -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
        <div class="flex items-center gap-2 mb-2">
          <i class="fas fa-trophy text-blue-500"></i>
          <div class="text-sm text-gray-500">{{ t.score }}</div>
        </div>
        <div class="text-2xl font-bold text-blue-600">{{ score }}</div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
        <div class="flex items-center gap-2 mb-2">
          <i class="fas fa-bullseye text-green-500"></i>
          <div class="text-sm text-gray-500">{{ t.accuracy }}</div>
        </div>
        <div class="text-2xl font-bold text-green-600">{{ accuracy }}%</div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
        <div class="flex items-center gap-2 mb-2">
          <i class="fas fa-clock text-purple-500"></i>
          <div class="text-sm text-gray-500">{{ t.time }}</div>
        </div>
        <div class="text-2xl font-bold text-purple-600">{{ elapsedTime }}s</div>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
        <div class="flex items-center gap-2 mb-2">
          <i class="fas fa-star text-amber-500"></i>
          <div class="text-sm text-gray-500">{{ challengeMode ? t.bestTime : t.highScore }}</div>
        </div>
        <div class="text-2xl font-bold text-amber-600">{{ challengeMode ? bestTime : highScore }}</div>
      </div>
    </div>

    <!-- Zone de texte -->
    <div class="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 mb-6 relative overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
      <p class="text-lg font-mono leading-relaxed text-gray-800 mb-4 min-h-20">
        <span
          v-for="(char, index) in currentText"
          :key="index"
          :class="{
            'text-green-500': index < userInput.length && userInput[index] === char,
            'text-red-500 bg-red-50': index < userInput.length && userInput[index] !== char,
            'text-gray-400': index >= userInput.length,
            'animate-gentle-pulse bg-blue-50': index === userInput.length
          }"
          class="transition-all duration-100"
        >{{ char }}</span>
      </p>

      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-500">
          Tapez le texte ci-dessus
        </div>
        <div class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
          {{ wpm > 0 ? wpm + ' MPM' : 'En attente...' }}
        </div>
      </div>
    </div>

    <!-- Champ de saisie -->
    <div class="relative mb-8">
    <input
      v-model="userInput"
      @input="checkInput"
      @paste="handlePaste"
      @copy="handleCopy"
      @cut="handleCut"
      @dragover="handleDragOver"
      @drop="handleDrop"
      @contextmenu="handleContextMenu"
      @keydown="handleKeyDown"
      class="w-full p-4 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-gray-400 no-copy-paste"
      :placeholder="t.startTyping"
      :disabled="challengeMode && challengeTimeLeft <= 0"
      autofocus
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      maxlength="1000"
    />
    <div class="absolute inset-y-0 right-0 flex items-center pr-4">
      <div class="w-3 h-3 rounded-full" :class="{
        'bg-green-400': userInput.length > 0 && userInput === currentText.slice(0, userInput.length),
        'bg-red-400': userInput.length > 0 && userInput !== currentText.slice(0, userInput.length),
        'bg-gray-300': userInput.length === 0
      }"></div>
    </div>
  </div>

    <!-- Boutons d'action -->
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <button
        @click="resetGame"
        class="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:shadow-md transition-all font-medium"
      >
        <i class="fas fa-redo-alt"></i>
        {{ t.reset }}
      </button>

      <button
        v-if="!challengeMode"
        @click="startChallenge"
        class="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-medium"
      >
        <i class="fas fa-stopwatch"></i>
        {{ t.startChallenge }}
      </button>

      <button
        @click="shareScore"
        class="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-medium"
      >
        <i class="fas fa-share-alt"></i>
        {{ t.share }}
      </button>
    </div>

    <!-- Barre de progression en mode défi -->
    <div v-if="challengeMode" class="mt-8 bg-white rounded-xl p-5 shadow-lg border border-gray-100">
      <div class="flex justify-between items-center mb-3">
        <div class="flex items-center gap-2">
          <i class="fas fa-fire text-orange-500"></i>
          <h3 class="font-semibold text-gray-800">{{ t.challenge }}</h3>
        </div>
        <span class="text-2xl font-bold text-amber-600">{{ challengeTimeLeft }}s</span>
      </div>
      <div class="w-full bg-gray-200 rounded-full h-2">
        <div
          class="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full transition-all duration-1000 ease-out"
          :style="{ width: `${(challengeTimeLeft / 60) * 100}%` }"
        ></div>
      </div>
      <p class="text-sm text-gray-600 mt-2 flex items-center gap-1">
        <i class="fas fa-info-circle text-blue-400"></i>
        {{ t.challengeDescription }}
      </p>
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

/* Animation shake pour le feedback visuel */
.shake-animation {
  animation: shake 0.5s ease-in-out;
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* Désactiver la sélection de texte dans le champ */
.no-copy-paste {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Style pour indiquer que le champ est protégé */
.no-copy-paste::selection {
  background: transparent;
}

.no-copy-paste::-moz-selection {
  background: transparent;
}
</style>
