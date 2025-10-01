<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
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
  wpm: number
  accuracy: number
  date: string
  mode: 'normal' | 'challenge'
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
    challengeDescription: 'Tapez le plus de mots en 60 secondes!',
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
    challengeDescription: 'Type as many words as you can in 60 seconds!',
  },
}

// Phrases de fallback au cas où l'API échoue
const FALLBACK_TEXTS = {
  french: [
    'Le chat dort sur le canapé.',
    'JavaScript est un langage puissant.',
    'Paris est la capitale de la France.',
    'La pratique rend parfait.',
    'Vue.js est un framework progressif.',
  ],
  english: [
    'The quick brown fox jumps over the lazy dog.',
    'TypeScript improves code quality.',
    'Practice makes perfect.',
    'London is the capital of England.',
    'Programming is an art and a science.',
  ],
}

// État du jeu persistant
const { value: savedLanguage } = useLocalStorage<Language>('keytype-language', 'french')
const { value: savedHighScore } = useLocalStorage<number>('keytype-highscore', 0)
const { value: savedBestTime } = useLocalStorage<number>('keytype-besttime', 0)
const { value: scores } = useLocalStorage<Score[]>('typing-scores', [])

// États réactifs
const language = ref<Language>(savedLanguage.value)
const highScore = ref<number>(savedHighScore.value)
const bestTime = ref<number>(savedBestTime.value)
const currentText = ref('Chargement...')
const userInput = ref('')
const score = ref(0)
const startTime = ref<number | null>(null)
const wpm = ref(0)
const errors = ref(0)
const totalKeystrokes = ref(0)
const challengeMode = ref(false)
const challengeTimeLeft = ref(0)
const challengeTimer = ref<number | null>(null)
const isLoading = ref(false)
const lastTypedIndex = ref(-1)
const isTyping = ref(false)
const showSuccessAnimation = ref(false)

// États du clavier
const activeKey = ref('')
const shiftActive = ref(false)
const spaceActive = ref(false)
const enterActive = ref(false)
const backspaceActive = ref(false)

// Mapping des touches spéciales
const specialKeys = {
  ' ': 'space',
  Enter: 'enter',
  Backspace: 'backspace',
  Shift: 'shift',
}

// Computed properties
const accuracy = computed(() => {
  if (totalKeystrokes.value === 0) return 100
  return Math.round(((totalKeystrokes.value - errors.value) / totalKeystrokes.value) * 100)
})

const elapsedTime = computed(() => {
  if (!startTime.value) return 0
  return Math.floor((Date.now() - startTime.value) / 1000)
})

const t = computed(() => translations[language.value])

// Fonctions
const fetchRandomText = async (): Promise<string> => {
  isLoading.value = true

  try {
    const langCode = language.value === 'french' ? 'fr' : 'en'

    if (langCode === 'en') {
      const response = await fetch('https://api.quotable.io/random?maxLength=120')
      const data = await response.json()
      return data.content
    }

    const response = await fetch(
      'https://jsonplaceholder.typicode.com/posts/' + Math.floor(Math.random() * 100),
    )
    const data = await response.json()
    return (
      data.body?.split('\n')[0]?.substring(0, 120) ||
      FALLBACK_TEXTS.french[Math.floor(Math.random() * FALLBACK_TEXTS.french.length)]
    )
  } catch (error) {
    console.warn('API unavailable, using fallback texts:', error)
    const texts = language.value === 'french' ? FALLBACK_TEXTS.french : FALLBACK_TEXTS.english
    return texts[Math.floor(Math.random() * texts.length)]
  } finally {
    isLoading.value = false
  }
}

const initGame = async () => {
  currentText.value = await fetchRandomText()
  userInput.value = ''
  startTime.value = Date.now()
  errors.value = 0
  totalKeystrokes.value = 0
  wpm.value = 0

  // Réinitialise le compte à rebours à chaque nouvelle phrase
  resetCountdown()
}

const calculateWPM = () => {
  if (!startTime.value) return 0
  const timeElapsed = (Date.now() - startTime.value) / 60000
  const words = userInput.value.trim().split(/\s+/).length
  return Math.round(words / timeElapsed)
}

const startChallenge = () => {
  challengeMode.value = true
  score.value = 0
  challengeTimeLeft.value = 30
  startAutoCountdown() // Démarre le compte à rebours
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

const endChallenge = () => {
  if (challengeTimer.value) {
    clearInterval(challengeTimer.value)
    challengeTimer.value = null
  }
  challengeMode.value = false
  if (score.value > bestTime.value) {
    bestTime.value = score.value
  }
  stopCountdown() // Arrête le compte à rebours
}

const resetGame = () => {
  if (challengeMode.value) {
    endChallenge()
  }

  // Réinitialise le compte à rebours réactive la saisie
  resetCountdown()

  score.value = 0
  wpm.value = 0
  errors.value = 0
  totalKeystrokes.value = 0
  isInputDisabled.value = false // Assurance supplémentaire
  initGame()
}

const saveScore = (newScore: Omit<Score, 'date'>) => {
  scores.value = [...scores.value, { ...newScore, date: new Date().toISOString() }]
    .sort((a, b) => b.wpm - a.wpm)
    .slice(0, 10)
}

const changeLanguage = async (lang: Language) => {
  language.value = lang
  await initGame()
}

const shareScore = () => {
  const text = challengeMode.value
    ? `${t.value.challenge}: ${score.value} ${t.value.score} | ${t.value.accuracy}: ${accuracy.value}%`
    : `${t.value.score}: ${score.value} | WPM: ${wpm.value} | ${t.value.accuracy}: ${accuracy.value}%`

  if (navigator.share) {
    navigator
      .share({
        title: 'KeyType - Score',
        text: text,
      })
      .catch((error) => {
        console.error('Erreur lors du partage:', error)
        fallbackShare(text)
      })
  } else {
    fallbackShare(text)
  }
}

const fallbackShare = (text: string) => {
  navigator.clipboard
    .writeText(text)
    .then(() => alert('Score copié dans le presse-papier!'))
    .catch(() => alert(text))
}

// Fonctions de protection contre la triche
const handlePaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const input = event.target as HTMLInputElement
  input.classList.add('shake-animation')
  setTimeout(() => input.classList.remove('shake-animation'), 500)
}

const handleCopy = (event: ClipboardEvent) => {
  event.preventDefault()
}

const handleCut = (event: ClipboardEvent) => {
  event.preventDefault()
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  const input = event.target as HTMLInputElement
  input.classList.add('shake-animation')
  setTimeout(() => input.classList.remove('shake-animation'), 500)
}

const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
}

// Fonction UNIQUE handleKeyDown qui gère tout
const handleKeyDown = (event: KeyboardEvent) => {
  const key = event.key
  const keyLower = key.toLowerCase()

  // Gestion de la protection anti-triche
  const ctrlKey = event.ctrlKey || event.metaKey
  if (ctrlKey && ['c', 'v', 'x', 'a'].includes(keyLower)) {
    event.preventDefault()
    if (keyLower === 'v') {
      const input = event.target as HTMLInputElement
      input.classList.add('shake-animation')
      setTimeout(() => input.classList.remove('shake-animation'), 500)
    }
    return
  }

  if ((key === 'F10' && event.shiftKey) || key === 'ContextMenu') {
    event.preventDefault()
    return
  }

  // Gestion du clavier visuel
  if (event.ctrlKey || event.altKey || event.metaKey) return

  // Gestion des touches spéciales
  if (specialKeys[key as keyof typeof specialKeys]) {
    switch (key) {
      case ' ':
        spaceActive.value = true
        break
      case 'Enter':
        enterActive.value = true
        break
      case 'Backspace':
        backspaceActive.value = true
        break
      case 'Shift':
        shiftActive.value = true
        break
    }
    return
  }

  // Touches alphabétiques et caractères spéciaux
  if (key.length === 1) {
    activeKey.value = keyLower
    setTimeout(() => {
      activeKey.value = ''
    }, 200)
  }
}

const handleKeyUp = (event: KeyboardEvent) => {
  const key = event.key
  const keyLower = key.toLowerCase()

  switch (key) {
    case ' ':
      spaceActive.value = false
      break
    case 'Enter':
      enterActive.value = false
      break
    case 'Backspace':
      backspaceActive.value = false
      break
    case 'Shift':
      shiftActive.value = false
      break
  }
}

const checkInput = () => {
  if (isInputDisabled.value) return // Ne rien faire si désactivé

  isTyping.value = true
  totalKeystrokes.value++

  if (userInput.value.length > 0) {
    lastTypedIndex.value = userInput.value.length - 1
  }

  for (let i = 0; i < userInput.value.length; i++) {
    if (userInput.value[i] !== currentText.value[i]) {
      errors.value++
      if (navigator.vibrate) {
        navigator.vibrate(50)
      }
      break
    }
  }

  if (userInput.value === currentText.value) {
    wpm.value = calculateWPM()
    score.value++

    showSuccessAnimation.value = true
    setTimeout(() => {
      showSuccessAnimation.value = false
    }, 1000)

    if (score.value > highScore.value) {
      highScore.value = score.value
    }

    saveScore({
      wpm: wpm.value,
      accuracy: accuracy.value,
      mode: challengeMode.value ? 'challenge' : 'normal',
    })

    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }

    initGame()
  }

  setTimeout(() => {
    isTyping.value = false
  }, 100)
}

// Fonction pour déterminer la classe de chaque caractère (modifiée)
const getCharacterClass = (index: number): string[] => {
  const classes: string[] = []

  if (index < userInput.value.length) {
    // Caractère déjà tapé
    if (userInput.value[index] === currentText.value[index]) {
      classes.push('text-green-600') // Correct - vert
    } else {
      classes.push('text-red-600 bg-red-50') // Incorrect - rouge
    }
  } else {
    // Caractères à venir
    classes.push('text-gray-800') // Gris pour le texte non tapé
  }

  return classes
}

// Observateurs
watch(language, (newLang) => {
  savedLanguage.value = newLang
})

watch(highScore, (newScore) => {
  savedHighScore.value = newScore
})

watch(bestTime, (newTime) => {
  savedBestTime.value = newTime
})

watch(userInput, (newValue, oldValue) => {
  // Lance le compte à rebours au premier caractère tapé
  if (newValue.length === 1 && oldValue.length === 0) {
    startAutoCountdown()
  }

  // Réinitialise le compte à rebours quand le texte est complété
  if (newValue === currentText.value) {
    resetCountdown()
  }

  if (newValue.length > currentText.value.length) {
    userInput.value = newValue.slice(0, currentText.value.length)
    const input = document.querySelector('input')
    if (input) {
      input.classList.add('shake-animation')
      setTimeout(() => input.classList.remove('shake-animation'), 500)
    }
  }
})

// ==================== COMPTE À REBOURS AUTOMATIQUE ====================
const countdown = ref(30) // 30 secondes par défaut
const isCountdownRunning = ref(false)
let countdownInterval: number | null = null

// Démarrer le compte à rebours automatiquement
const startAutoCountdown = () => {
  if (!isCountdownRunning.value && countdown.value > 0) {
    isCountdownRunning.value = true

    if (countdownInterval) {
      clearInterval(countdownInterval)
    }

    countdownInterval = setInterval(() => {
      countdown.value--

      if (countdown.value <= 0) {
        stopCountdown()
        handleCountdownEnd()
      }
    }, 1000) as unknown as number
  }
}

// Arrêter le compte à rebours
const stopCountdown = () => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  isCountdownRunning.value = false
}

// Réinitialiser le compte à rebours
const resetCountdown = () => {
  stopCountdown()
  countdown.value = 30
  isInputDisabled.value = false // Réactive la saisie
}

// Actions à la fin du compte à rebours
const handleCountdownEnd = () => {
  console.log('Temps écoulé !')

  isInputDisabled.value = true // Désactive la saisie

  // juste pour voir l'effet : vibration ou feedback
  if (navigator.vibrate) {
    navigator.vibrate(200)
  }
}

// Formatage du temps (mm:ss)
const formattedCountdown = computed(() => {
  const minutes = Math.floor(countdown.value / 60)
  const seconds = countdown.value % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

const isInputDisabled = ref(false)

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  initGame()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  if (challengeTimer.value) {
    clearInterval(challengeTimer.value)
  }
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Cartes de statistiques -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div
        class="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center gap-2 mb-2">
          <i class="fas fa-trophy text-blue-500"></i>
          <div class="text-sm text-gray-500">{{ t.score }}</div>
        </div>
        <div class="text-2xl font-bold text-blue-600">{{ score }}</div>
      </div>

      <div
        class="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center gap-2 mb-2">
          <i class="fas fa-bullseye text-green-500"></i>
          <div class="text-sm text-gray-500">{{ t.accuracy }}</div>
        </div>
        <div class="text-2xl font-bold text-green-600">{{ accuracy }}%</div>
      </div>

      <!-- Carte compte à rebours automatique -->
      <div
        class="bg-purple-50 p-3 shadow-lg hover:shadow-xl transition-shadow rounded-lg text-center transition-all duration-300 border border-purple-200"
        :class="{
          'bg-red-100 border-red-200': countdown <= 10,
          'animate-pulse': countdown <= 5,
          'bg-green-100 border-green-200': !isCountdownRunning && countdown === 60,
        }"
      >
        <div class="flex items-center gap-2 justify-center mb-1">
          <i
            class="fas fa-stopwatch"
            :class="{
              'text-purple-500': countdown > 10,
              'text-red-500': countdown <= 10,
              'text-green-500': !isCountdownRunning && countdown === 60,
            }"
          ></i>
          <div
            class="text-sm font-medium"
            :class="{
              'text-purple-600': countdown > 10,
              'text-red-600': countdown <= 10,
              'text-green-600': !isCountdownRunning && countdown === 60,
            }"
          >
            {{ countdown > 0 ? 'Temps restant' : 'Terminé!' }}
          </div>
        </div>
        <div
          class="text-2xl font-bold"
          :class="{
            'text-purple-600': countdown > 10,
            'text-red-600': countdown <= 10,
            'text-green-600': !isCountdownRunning && countdown === 60,
          }"
        >
          {{ formattedCountdown }}
        </div>
        <div class="text-xs text-gray-500 mt-1">
          {{ isCountdownRunning ? 'En cours...' : 'Commencez à taper' }}
        </div>
      </div>

      <div
        class="bg-white rounded-xl p-4 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
      >
        <div class="flex items-center gap-2 mb-2">
          <i class="fas fa-star text-amber-500"></i>
          <div class="text-sm text-gray-500">{{ challengeMode ? t.bestTime : t.highScore }}</div>
        </div>
        <div class="text-2xl font-bold text-amber-600">
          {{ challengeMode ? bestTime : highScore }}
        </div>
      </div>
    </div>

    <!-- Zone de texte avec textarea -->
    <div class="relative mb-8">
      <!-- Bulle flottante -->
      <div
        v-if="userInput.length === 0"
        class="absolute inset-x-0 top-13 flex items-center justify-center pointer-events-none z-10"
      >
        <div
          class="bg-green-200 border border-gray-200 rounded-lg px-4 py-2 shadow-lg flex items-center gap-2 animate-pulse floating-bubble"
        >
          <i class="fas fa-keyboard text-blue-500"></i>
          <span class="text-gray-700 font-medium">{{ t.startTyping }}</span>
        </div>
      </div>

      <!-- Container relatif -->
      <div
        class="relative bg-white border-2 border-gray-300 rounded-xl focus-within:border-blue-400 transition-colors"
      >
        <!-- Texte d'arrière-plan -->
        <div
          class="absolute inset-0 p-4 text-lg font-mono text-gray-300 pointer-events-none select-none z-0 leading-relaxed whitespace-pre-wrap"
        >
          <span
            v-for="(char, index) in currentText"
            :key="index"
            :class="getCharacterClass(index)"
            class="character"
          >
            {{ char }}
          </span>
        </div>

        <!-- Textarea transparent -->
        <textarea
          v-model="userInput"
          @input="checkInput"
          @paste="handlePaste"
          @copy="handleCopy"
          @cut="handleCut"
          @dragover="handleDragOver"
          @drop="handleDrop"
          @contextmenu="handleContextMenu"
          @keydown="handleKeyDown"
          class="w-full h-15 p-4 text-lg font-mono bg-transparent outline-none resize-none relative z-10 caret-blue-500 text-transparent"
          :class="{
            'opacity-50 cursor-not-allowed': isInputDisabled,
          }"
          :placeholder="t.startTyping"
          :disabled="isInputDisabled || (challengeMode && challengeTimeLeft <= 0)"
          autocapitalize="off"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          ref="textInput"
        ></textarea>
      </div>

      <!-- Indicateur de progression -->
      <div class="mt-2 flex justify-between items-center text-sm text-gray-500">
        <span>{{ userInput.length }}/{{ currentText.length }} caractères</span>
        <span v-if="wpm > 0">{{ wpm }} MPM</span>
        <span v-else>Prêt</span>
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

  <!-- Animation de réussite -->
  <transition name="success">
    <div
      v-if="showSuccessAnimation"
      class="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
    >
      <div class="text-6xl text-green-500 animate-bounce">
        <i class="fas fa-check-circle"></i>
      </div>
    </div>
  </transition>

  <!-- Clavier AZERTY avec classes Tailwind directes -->
  <div class="keyboard-container mt-8 bg-gray-100 rounded-2xl p-4 shadow-lg border border-gray-200">
    <!-- Ligne 1 -->
    <div class="keyboard-row flex justify-center gap-1 mb-2">
      <div
        class="key key-grey h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-gray-300 text-gray-700"
      >
        ²
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
      >
        &
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
      >
        é
      </div>
      <div
        class="key key-green h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-green-100 text-green-800 border border-green-200"
      >
        "
      </div>
      <div
        class="key key-pink h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-pink-100 text-pink-800 border border-pink-200"
      >
        '
      </div>
      <div
        class="key key-mint h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-teal-100 text-teal-800 border border-teal-200"
      >
        (
      </div>
      <div
        class="key key-mint h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-teal-100 text-teal-800 border border-teal-200"
      >
        -
      </div>
      <div
        class="key key-yellow h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-amber-100 text-amber-800 border border-amber-200"
      >
        è
      </div>
      <div
        class="key key-pink h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-pink-100 text-pink-800 border border-pink-200"
      >
        _
      </div>
      <div
        class="key key-green h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-green-100 text-green-800 border border-green-200"
      >
        ç
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
      >
        à
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
      >
        )
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
      >
        =
      </div>
      <div
        class="key key-grey key-special h-12 w-[60px] flex items-center justify-center rounded-lg font-medium text-sm bg-gray-300 text-gray-700 pr-2 justify-end text-xs uppercase"
        :class="{ 'key-active': backspaceActive }"
      >
        ←
        <span
          v-if="backspaceActive"
          class="finger-indicator absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center"
          >←</span
        >
      </div>
    </div>

    <!-- Ligne 2 -->
    <div class="keyboard-row flex justify-center gap-1 mb-2">
      <div
        class="key key-grey key-special h-12 w-[60px] flex items-center justify-center rounded-lg font-medium text-sm bg-gray-300 text-gray-700 pl-2 justify-start text-xs uppercase"
      >
        Tab
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
        :class="{ 'key-active': activeKey === 'a' }"
      >
        a
      </div>
      <div
        class="key key-green h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-green-100 text-green-800 border border-green-200"
        :class="{ 'key-active': activeKey === 'z' }"
      >
        z
      </div>
      <div
        class="key key-pink h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-pink-100 text-pink-800 border border-pink-200"
        :class="{ 'key-active': activeKey === 'e' }"
      >
        e
      </div>
      <div
        class="key key-mint h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-teal-100 text-teal-800 border border-teal-200"
        :class="{ 'key-active': activeKey === 'r' }"
      >
        r
      </div>
      <div
        class="key key-mint h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-teal-100 text-teal-800 border border-teal-200"
        :class="{ 'key-active': activeKey === 't' }"
      >
        t
      </div>
      <div
        class="key key-yellow h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-amber-100 text-amber-800 border border-amber-200"
        :class="{ 'key-active': activeKey === 'y' }"
      >
        y
      </div>
      <div
        class="key key-yellow h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-amber-100 text-amber-800 border border-amber-200"
        :class="{ 'key-active': activeKey === 'u' }"
      >
        u
      </div>
      <div
        class="key key-pink h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-pink-100 text-pink-800 border border-pink-200"
        :class="{ 'key-active': activeKey === 'i' }"
      >
        i
      </div>
      <div
        class="key key-green h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-green-100 text-green-800 border border-green-200"
        :class="{ 'key-active': activeKey === 'o' }"
      >
        o
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
        :class="{ 'key-active': activeKey === 'p' }"
      >
        p
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
      >
        ^
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
      >
        $
      </div>
      <div
        class="key key-grey h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-gray-300 text-gray-700"
      >
        *
      </div>
    </div>

    <!-- Ligne 3 -->
    <div class="keyboard-row flex justify-center gap-1 mb-2">
      <div
        class="key key-grey key-special h-12 w-[74px] flex items-center justify-center rounded-lg font-medium text-sm bg-gray-300 text-gray-700 px-3 pl-2 justify-start text-xs uppercase"
      >
        Verr Maj
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
        :class="{ 'key-active': activeKey === 'q' }"
      >
        q
      </div>
      <div
        class="key key-green h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-green-100 text-green-800 border border-green-200"
        :class="{ 'key-active': activeKey === 's' }"
      >
        s
      </div>
      <div
        class="key key-pink h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-pink-100 text-pink-800 border border-pink-200"
        :class="{ 'key-active': activeKey === 'd' }"
      >
        d
      </div>
      <div
        class="key key-mint h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-teal-100 text-teal-800 border border-teal-200"
        :class="{ 'key-active': activeKey === 'f' }"
      >
        f
      </div>
      <div
        class="key key-mint h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-teal-100 text-teal-800 border border-teal-200"
        :class="{ 'key-active': activeKey === 'g' }"
      >
        g
      </div>
      <div
        class="key key-yellow h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-amber-100 text-amber-800 border border-amber-200"
        :class="{ 'key-active': activeKey === 'h' }"
      >
        h
      </div>
      <div
        class="key key-yellow h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-amber-100 text-amber-800 border border-amber-200"
        :class="{ 'key-active': activeKey === 'j' }"
      >
        j
      </div>
      <div
        class="key key-pink h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-pink-100 text-pink-800 border border-pink-200"
        :class="{ 'key-active': activeKey === 'k' }"
      >
        k
      </div>
      <div
        class="key key-green h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-green-100 text-green-800 border border-green-200"
        :class="{ 'key-active': activeKey === 'l' }"
      >
        l
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
        :class="{ 'key-active': activeKey === 'm' }"
      >
        m
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
      >
        ù
      </div>
      <div
        class="key key-enter key-special h-12 w-[74px] flex items-center justify-center rounded-lg font-medium text-sm bg-blue-100 text-blue-800 border border-blue-200 pr-2 justify-end text-xs uppercase"
        :class="{ 'key-active': enterActive }"
      >
        Entrée
        <span
          v-if="enterActive"
          class="finger-indicator absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center"
          >↵</span
        >
      </div>
    </div>

    <!-- Ligne 4 -->
    <div class="keyboard-row flex justify-center gap-1 mb-2">
      <div
        class="key key-grey key-special h-12 w-[95px] flex items-center justify-center rounded-lg font-medium text-sm bg-gray-300 text-gray-700 px-2 justify-start text-xs uppercase"
        :class="{ 'key-active': shiftActive }"
      >
        Maj
        <span
          v-if="shiftActive"
          class="finger-indicator absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center"
          >⇧</span
        >
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
        :class="{ 'key-active': activeKey === 'w' }"
      >
        w
      </div>
      <div
        class="key key-green h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-green-100 text-green-800 border border-green-200"
        :class="{ 'key-active': activeKey === 'x' }"
      >
        x
      </div>
      <div
        class="key key-pink h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-pink-100 text-pink-800 border border-pink-200"
        :class="{ 'key-active': activeKey === 'c' }"
      >
        c
      </div>
      <div
        class="key key-mint h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-teal-100 text-teal-800 border border-teal-200"
        :class="{ 'key-active': activeKey === 'v' }"
      >
        v
      </div>
      <div
        class="key key-mint h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-teal-100 text-teal-800 border border-teal-200"
        :class="{ 'key-active': activeKey === 'b' }"
      >
        b
      </div>
      <div
        class="key key-yellow h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-amber-100 text-amber-800 border border-amber-200"
        :class="{ 'key-active': activeKey === 'n' }"
      >
        n
      </div>
      <div
        class="key key-yellow h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-amber-100 text-amber-800 border border-amber-200"
      >
        ,
      </div>
      <div
        class="key key-pink h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-pink-100 text-pink-800 border border-pink-200"
      >
        ;
      </div>
      <div
        class="key key-green h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-green-100 text-green-800 border border-green-200"
      >
        :
      </div>
      <div
        class="key key-indigo h-12 w-12 flex items-center justify-center rounded-lg font-medium text-sm bg-indigo-100 text-indigo-800 border border-indigo-200"
      >
        !
      </div>
      <div
        class="key key-grey key-special h-12 w-[95px] flex items-center justify-center rounded-lg font-medium text-sm bg-gray-300 text-gray-700 px-2 justify-start text-xs uppercase"
        :class="{ 'key-active': shiftActive }"
      >
        Maj
        <span
          v-if="shiftActive"
          class="finger-indicator absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center"
          >⇧</span
        >
      </div>
    </div>

    <!-- Ligne 5 - Barre d'espace -->
    <div class="keyboard-row flex justify-center gap-1">
      <div
        class="key key-grey key-special h-12 w-[220px] flex items-center justify-center rounded-lg font-medium text-sm bg-gray-300 text-gray-700 pl-2 pr-4 justify-start text-xs uppercase"
        :class="{ 'key-active': spaceActive }"
      >
        Espace
        <span
          v-if="spaceActive"
          class="finger-indicator absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full text-white text-xs flex items-center justify-center"
          >␣</span
        >
      </div>
    </div>
  </div>
</template>

<style>
.animate-pulse {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
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
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
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

/* Animation de frappe pour les caractères */
.character {
  transition: all 0.1s ease;
  position: relative;
}

.character.correct {
  color: #10b981;
  transform: scale(1.05);
}

.character.incorrect {
  color: #ef4444;
  background-color: #fef2f2;
  animation: incorrect-typing 0.3s ease;
}

.character.current {
  background-color: #dbeafe;
  animation: current-char-pulse 1.5s infinite;
  border-left: 2px solid #3b82f6;
}

.character.upcoming {
  color: #9ca3af;
}

/* Animation pour le caractère actuel */
@keyframes current-char-pulse {
  0%,
  100% {
    background-color: #dbeafe;
  }
  50% {
    background-color: #bfdbfe;
  }
}

/* Animation pour les erreurs */
@keyframes incorrect-typing {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-3px);
  }
  50% {
    transform: translateX(3px);
  }
  75% {
    transform: translateX(-3px);
  }
  100% {
    transform: translateX(0);
  }
}

/* Effet de "tap" sur les caractères */
@keyframes tap-effect {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

.character.typed {
  animation: tap-effect 0.1s ease;
}

/* Curseur clignotant */
.cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background-color: #3b82f6;
  animation: blink 1s infinite;
  vertical-align: middle;
  margin-left: 2px;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* Container avec effet de focus */
.text-container {
  position: relative;
  line-height: 1.8;
  letter-spacing: 0.5px;
}

/* Indicateur de progression */
.progress-indicator {
  position: absolute;
  bottom: -5px;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s ease;
  border-radius: 2px;
}

/* Styles du clavier - SUPPRIMEZ les @apply et utilisez ces classes */
.key {
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  transition: all 0.1s;
  position: relative;
  overflow: hidden;
  cursor: default;
  user-select: none;
}

/* Couleurs des touches */
.key-grey {
  background-color: #d1d5db;
  color: #374151;
  border: 1px solid #9ca3af;
}

.key-indigo {
  background-color: #e0e7ff;
  color: #3730a3;
  border: 1px solid #c7d2fe;
}

.key-green {
  background-color: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.key-pink {
  background-color: #fce7f3;
  color: #9d174d;
  border: 1px solid #fbcfe8;
}

.key-mint {
  background-color: #ccfbf1;
  color: #0f766e;
  border: 1px solid #99f6e4;
}

.key-yellow {
  background-color: #fef3c7;
  color: #92400e;
  border: 1px solid #fde68a;
}

.key-enter {
  background-color: #dbeafe;
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

/* Touches spéciales */
.key-special {
  background-color: #9ca3af;
  color: white;
  font-weight: 600;
  font-size: 0.75rem;
}

/* Animation de frappe */

.key-active {
  animation: key-press-pop 0.18s cubic-bezier(0.4, 0.8, 0.2, 1);
  background-color: #3b82f6 !important; /* Bleu vif */
  color: #fff !important;
  box-shadow:
    0 0 16px 4px rgba(59, 130, 246, 0.35),
    0 2px 8px rgba(0, 0, 0, 0.12);
  transform: scale(1.08);
  z-index: 2;
  border: 2px solid #2563eb;
  transition:
    background 0.1s,
    color 0.1s,
    box-shadow 0.1s,
    transform 0.1s;
}

@keyframes key-press-pop {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(59, 130, 246, 0);
    background-color: #3b82f6;
  }
  40% {
    transform: scale(1.12);
    box-shadow: 0 0 24px 8px rgba(59, 130, 246, 0.45);
    background-color: #2563eb;
  }
  80% {
    transform: scale(0.98);
    box-shadow: 0 0 8px 2px rgba(59, 130, 246, 0.25);
    background-color: #3b82f6;
  }
  100% {
    transform: scale(1.08);
    box-shadow: 0 0 16px 4px rgba(59, 130, 246, 0.35);
    background-color: #3b82f6;
  }
}

@keyframes key-press {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

/* Indicateur de doigt */
.finger-indicator {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  width: 1rem;
  height: 1rem;
  background-color: #3b82f6;
  border-radius: 9999px;
  color: white;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Layout responsive */
@media (max-width: 768px) {
  .key {
    height: 2.5rem;
    font-size: 0.75rem;
    min-width: 2rem;
  }

  .key-special {
    font-size: 0.65rem;
  }
}

/* Effet de lueur pour les touches actives */
.key-glow {
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}

/* Animation shake */
.shake-animation {
  animation: shake 0.5s ease-in-out;
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-5px);
  }
  75% {
    transform: translateX(5px);
  }
}

/* Curseur personnalisé */
.cursor {
  animation: blink 1s infinite;
  transition: transform 0.1s ease;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* Champ de saisie transparent */
input[type='text'] {
  color: transparent !important;
  caret-color: #3b82f6; /* Couleur du curseur bleu */
}

/* Surlignement de la sélection */
input[type='text']::selection {
  background: rgba(59, 130, 246, 0.3);
}

/* Bulle flottante */
.floating-bubble {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-5px);
  }
}

/* Adaptation responsive */
@media (max-width: 768px) {
  .character {
    font-size: 16px; /* Taille de police fixe pour mobile */
  }

  input[type='text'] {
    font-size: 16px; /* Évite le zoom sur iOS */
  }
}

/* Pour la version textarea */
textarea {
  color: transparent !important;
  caret-color: #3b82f6;
  line-height: 1.6;
}

textarea::selection {
  background: rgba(59, 130, 246, 0.3);
}

/* Empêcher le resize */
textarea {
  resize: none;
}

/* Scroll personnalisé */
textarea::-webkit-scrollbar {
  width: 6px;
}

textarea::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

textarea::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* Animation de pulsation pour les dernières secondes */
@keyframes critical-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 rgba(239, 68, 68, 0);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
  }
}

.animate-pulse {
  animation: critical-pulse 0.5s ease-in-out infinite;
}

/* Transition fluide pour les changements d'état */
.countdown-transition {
  transition: all 0.3s ease-in-out;
}
</style>
