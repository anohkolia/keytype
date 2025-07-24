import { ref, watch } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  // Récupérer la valeur stockée ou utiliser la valeur par défaut
  const getStoredValue = (): T => {
    const storedValue = localStorage.getItem(key)
    if (storedValue) {
      try {
        return JSON.parse(storedValue) as T
      } catch {
        console.error(`Erreur lors de la lecture de ${key} depuis localStorage`)
      }
    }
    return defaultValue
  }

  const value = ref<T>(getStoredValue())

  // Écouter les changements de valeur pour mettre à jour localStorage
  watch(
    value,
    (newValue) => {
      try {
        localStorage.setItem(key, JSON.stringify(newValue))
      } catch (error) {
        console.error(`Erreur lors de l'écriture dans localStorage:`, error)
      }
    },
    { deep: true }
  )

  return { value }
}
