import { createRouter, createWebHashHistory } from 'vue-router'

import EmptyRoomsView from '@/views/EmptyRoomsView.vue'
import HomeView from '@/views/HomeView.vue'
import RoomView from '@/views/RoomView.vue'

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/room', name: 'room', component: RoomView },
    { path: '/empty', name: 'empty', component: EmptyRoomsView },
  ],
})
