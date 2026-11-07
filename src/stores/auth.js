import { reactive } from 'vue'
import { auth } from '@/api'

export const session = reactive({ user: null })

// 앱 시작 전에 한 번(main.js): 저장된 로그인 복원 → 라우터 가드가 올바른 상태로 시작
export async function initSession(onExpired) {
  session.user = (await auth.restore())?.user ?? null
  auth.onSignedOut(() => {
    if (!session.user) return
    session.user = null
    onExpired?.()
  })
}

export async function login(email, password) {
  const s = await auth.signIn(email, password)
  session.user = s.user
}

export async function logout() {
  session.user = null
  await auth.signOut()
}
