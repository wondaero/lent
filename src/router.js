import { createRouter, createWebHistory } from 'vue-router'
import { session } from '@/stores/auth'
import { LIBRARY_NAME } from '@/lib/constants'
import AdminLayout from '@/layouts/AdminLayout.vue'

// 페이지는 모두 지연 로딩 → 초기 번들 최소화
const routes = [
  { path: '/login', name: 'login', component: () => import('@/pages/LoginPage.vue'), meta: { public: true } },
  {
    path: '/',
    component: AdminLayout,
    children: [
      { path: '', name: 'dashboard', component: () => import('@/pages/DashboardPage.vue'), meta: { title: '대시보드' } },
      { path: 'circulation', name: 'circulation', component: () => import('@/pages/CirculationPage.vue'), meta: { title: '대출 / 반납' } },
      { path: 'books', name: 'books', component: () => import('@/pages/books/BookListPage.vue'), meta: { title: '도서 목록' } },
      { path: 'books/new', name: 'bookNew', component: () => import('@/pages/books/BookFormPage.vue'), meta: { title: '도서 등록' } },
      { path: 'books/:id', name: 'bookEdit', component: () => import('@/pages/books/BookFormPage.vue'), props: true, meta: { title: '도서 정보' } },
      { path: 'members', name: 'members', component: () => import('@/pages/members/MemberListPage.vue'), meta: { title: '회원 목록' } },
      { path: 'members/new', name: 'memberNew', component: () => import('@/pages/members/MemberFormPage.vue'), meta: { title: '회원 등록' } },
      { path: 'members/:id', name: 'memberEdit', component: () => import('@/pages/members/MemberFormPage.vue'), props: true, meta: { title: '회원 정보' } },
      { path: 'loans', name: 'loans', component: () => import('@/pages/LoanListPage.vue'), meta: { title: '대출 기록' } },
      { path: 'print', name: 'print', component: () => import('@/pages/PrintPage.vue'), meta: { title: '라벨 출력' } },
      { path: 'settings', name: 'settings', component: () => import('@/pages/SettingsPage.vue'), meta: { title: '설정' } },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to) => {
  if (!to.meta.public && !session.user) return { name: 'login', query: { next: to.fullPath } }
  if (to.name === 'login' && session.user) return { name: 'dashboard' }
})

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · ${LIBRARY_NAME}` : LIBRARY_NAME
})

export default router
