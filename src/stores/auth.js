import { reactive } from 'vue'
import { auth } from '@/api'

export const session = reactive({ user: auth.getSession()?.user ?? null })

export async function login(email, password) {
  const s = await auth.signIn(email, password)
  session.user = s.user
}

export async function logout() {
  await auth.signOut()
  session.user = null
}
