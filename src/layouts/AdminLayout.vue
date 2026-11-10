<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { session, logout } from '@/stores/auth'
import { LIBRARY_NAME } from '@/lib/constants'
import { ICONS } from '@/lib/icons'

const route = useRoute()
const router = useRouter()
const navOpen = ref(false)
watch(() => route.fullPath, () => (navOpen.value = false))

const nav = [
  // 업무 흐름 순서(사용자 결정): 카운터 업무(대출/반납 → 대출 기록) → 책 정리(도서 → 라벨 출력) → 회원 → 게시판 → 설정
  { to: '/', label: '대시보드', icon: ICONS.dashboard },
  { to: '/circulation', label: '대출 / 반납', icon: ICONS.circulation },
  { to: '/loans', label: '대출 기록', icon: ICONS.history },
  { to: '/books', label: '도서', icon: ICONS.book },
  { to: '/print', label: '라벨 출력', icon: ICONS.print },
  { to: '/members', label: '회원', icon: ICONS.member },
  { to: '/posts', label: '게시판', icon: ICONS.board },
  { to: '/settings', label: '설정', icon: ICONS.settings },
]

function isActive(to) {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}

async function onLogout() {
  await logout()
  router.replace('/login')
}
</script>

<template>
  <div class="shell" :class="{ 'nav-open': navOpen }">
    <aside class="side">
      <router-link to="/" class="brand">
        <img src="/logo.svg" alt="" width="42" height="28" class="logo" />
        <span>{{ LIBRARY_NAME }}</span>
      </router-link>
      <nav>
        <router-link v-for="n in nav" :key="n.to" :to="n.to" :class="{ active: isActive(n.to) }">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path :d="n.icon" fill="currentColor" /></svg>
          {{ n.label }}
        </router-link>
      </nav>
      <div class="side-foot">
        <div class="user">{{ session.user?.name }}<small>{{ session.user?.loginId }}</small></div>
        <button class="btn ghost sm" @click="onLogout">로그아웃</button>
      </div>
    </aside>
    <div class="scrim" @click="navOpen = false" />
    <div class="main">
      <header class="topbar">
        <button class="btn ghost icon menu" aria-label="메뉴" @click="navOpen = !navOpen">
          <svg viewBox="0 0 24 24" width="20" height="20"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" fill="currentColor" /></svg>
        </button>
        <h1>{{ route.meta.title }}</h1>
      </header>
      <main class="content">
        <!-- 목록 페이지는 캐시해서 상세 → 목록 복귀 시 검색조건/페이지 유지 -->
        <router-view v-slot="{ Component }">
          <!-- 대출/반납도 캐시: 스캔해 둔 처리 목록을 둔 채 회원 화면을 보고 돌아와도 남게 -->
          <keep-alive :include="['CirculationPage', 'BookListPage', 'MemberListPage', 'LoanListPage', 'PostListPage']">
            <component :is="Component" :key="route.path" />
          </keep-alive>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell { display: grid; grid-template-columns: 236px 1fr; min-height: 100vh; }
.side { position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; background: var(--surface); border-right: 1px solid var(--line); padding: 16px 12px; }
.brand { display: flex; align-items: center; gap: 8px; padding: 4px 4px 18px; font-weight: 700; font-size: 16px; letter-spacing: -.02em; color: var(--text); text-decoration: none; white-space: nowrap; }
nav { display: grid; gap: 2px; }
nav a { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 8px; color: var(--text-2); text-decoration: none; font-size: 14.5px; }
nav a:hover { background: var(--hover); color: var(--text); }
nav a.active { background: var(--brand-soft); color: var(--brand-ink); font-weight: 600; }
.side-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px 8px 0; border-top: 1px solid var(--line); }
.user { font-size: 14px; font-weight: 600; display: grid; min-width: 0; }
.user small { font-weight: 400; color: var(--text-3); font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
.main { min-width: 0; display: flex; flex-direction: column; }
.topbar { position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 24px; background: var(--bg); border-bottom: 1px solid var(--line); }
.topbar h1 { font-size: 18px; margin: 0; }
.menu { display: none; }
.content { padding: 24px; max-width: 1400px; width: 100%; }
.scrim { display: none; }

@media (max-width: 900px) {
  .shell { grid-template-columns: 1fr; }
  .side { position: fixed; z-index: 20; left: 0; width: 240px; transform: translateX(-100%); transition: transform .2s; }
  .nav-open .side { transform: none; }
  .nav-open .scrim { display: block; position: fixed; inset: 0; z-index: 15; background: rgb(0 0 0 / .3); }
  .menu { display: inline-flex; }
  .topbar, .content { padding-left: 16px; padding-right: 16px; }
}
@media print {
  .shell { display: block; }
  .side, .topbar { display: none; }
  .content { padding: 0; max-width: none; }
}
</style>
