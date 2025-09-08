import { ref, watch } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  // Récupérer la valeur stockée ou utiliser la valeur par défaut
  const getStoredValue = (): T => {
    try {
      const storedValue = localStorage.getItem(key)
      if (storedValue === null) {
        return defaultValue
      }

      const parsed = JSON.parse(storedValue)

      // Validation basique du type (optionnel)
      if (typeof parsed !== typeof defaultValue && Array.isArray(parsed) !== Array.isArray(defaultValue)) {
        console.warn(`Type mismatch for ${key} in localStorage, using default value`)
        return defaultValue
      }

      return parsed as T
    } catch (error) {
      console.error(`Erreur lors de la lecture de ${key} depuis localStorage:`, error)
      return defaultValue
    }
  }

  const value = ref<T>(getStoredValue())

  // Écouter les changements de valeur pour mettre à jour localStorage
  watch(
    value,
    (newValue) => {
      try {
        localStorage.setItem(key, JSON.stringify(newValue))
      } catch (error) {
        console.error(`Erreur lors de l'écriture de ${key} dans localStorage:`, error)

        // Gestion des quotas exceeded (optionnel)
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          console.warn('Espace localStorage insuffisant')
          // Ici vous pourriez implémenter une stratégie de nettoyage
        }
      }
    },
    { deep: true }
  )

  return { value }
}
