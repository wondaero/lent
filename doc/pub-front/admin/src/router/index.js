import { createRouter, createWebHistory } from 'vue-router'

// 라우트 대상 컴포넌트 import
import BookList from '@/pages/book/BookList.vue'
import Book from '@/pages/book/Book.vue'
import MemberList from '@/pages/member/MemberList.vue'
import Member from '@/pages/member/Member.vue'
import BoardList from '@/pages/board/BoardList.vue'
import Board from '@/pages/board/Board.vue'
import LoanList from '@/pages/circulation/LoanList.vue'
import LoanReturn from '@/pages/circulation/LoanReturn.vue'

const routes = [
  { path: '/', redirect: '/book-list' },  // 기본 접속 시 book-list로 이동
  { path: '/book-list', name: 'bookList', component: BookList },
  { path: '/book', name: 'book', component: Book },
  { path: '/member-list', name: 'memberList', component: MemberList },


  // { path: '/member', name: 'member', component: Member },

  { path: '/member', name: 'memberNew', component: Member },
  { path: '/member/:id', name: 'memberDetail', component: Member, props: true },

  { path: '/board-list', name: 'BoardList', component: BoardList },
  { path: '/board', name: 'Board', component: Board },
  { path: '/loan-list', name: 'LoanList', component: LoanList },
  { path: '/loan-return', name: 'LoanReturn', component: LoanReturn },
]

const router = createRouter({
  history: createWebHistory('/admin/'), // Admin 전용 prefix
  routes,
})

export default router
