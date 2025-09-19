import { createRouter, createWebHistory } from 'vue-router'
import KeyTypeGame from '@/components/KeyTypeGame.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: KeyTypeGame,
    },
  ],
})

export default router
