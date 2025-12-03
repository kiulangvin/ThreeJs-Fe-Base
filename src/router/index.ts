import { createRouter, createWebHistory } from 'vue-router'
import Chat3DView from '../views/Chat3DView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Chat3DView,
    }
  ],
})

export default router
