import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import KeyTypeGame from '@/components/KeyTypeGame.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: KeyTypeGame,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
