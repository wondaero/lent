// 데이터 접근 레이어. 화면은 이 모듈만 호출한다.
//   .env.local(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)이 있으면 remote.js(Supabase), 없으면 mock.js(목업 데이터).
//   두 구현은 함수 이름·인자·반환 형태({ rows, total } 등)가 같아야 한다. 화면은 어느 쪽인지 모른다.
//   쓰지 않는 쪽은 불러오지 않는다(Supabase 모드 번들에 목업 데이터 생성 코드가 들어가지 않음).
import { LOGIN_DOMAIN } from '@/lib/constants'
import { hangulToKeys } from '@/lib/regNo'
import { hasSupabase, getClient } from './supabase'

const impl = hasSupabase ? import('./remote.js') : import('./mock.js')
// books.list 같은 함수를 호출 시점에 실제 구현으로 넘긴다(함수 참조를 넘겨도 동작: usePagedList(members.list))
const facade = (ns) => new Proxy({}, { get: (_, fn) => async (...args) => (await impl)[ns][fn](...args) })

export const books = facade('books')
export const members = facade('members')
export const loans = facade('loans')
export const stats = facade('stats')
export const posts = facade('posts')

const nowIso = () => new Date().toISOString()
const wait = (v) => new Promise((r) => setTimeout(() => r(v), 80))
const fail = (message) => new Promise((_, rej) => setTimeout(() => rej(new Error(message)), 80))

/* ───────────── 인증 ───────────── */
const SESSION_KEY = 'lent.session'

// Supabase 모드: 관리자 = Supabase Auth 계정 중 직원 명단(staff)에 있는 계정. 도서관 회원(members)은 로그인하지 않는다.
//   직원 명단에 없으면 로그인해도 데이터가 안 보이므로(RLS) 로그인 단계에서 막는다.
// 목업 모드: 데모 계정 admin / admin1234
// 아이디 → 로그인 이메일. 한글 자판 상태로 친 아이디(ㅁ앙ㅑㅜ)도 영문(admin)으로 되돌린다
const loginEmail = (id) => { const v = hangulToKeys(id.trim()).toLowerCase(); return v.includes('@') ? v : `${v}@${LOGIN_DOMAIN}` }
const loginId = (email = '') => email.replace(`@${LOGIN_DOMAIN}`, '')

async function staffUser(sb, user) {
  const { data, error } = await sb.from('staff').select('name').eq('user_id', user.id).maybeSingle()
  if (error) throw new Error('직원 정보를 확인하지 못했습니다. 네트워크를 확인해주세요.')
  return data ? { id: user.id, loginId: loginId(user.email), name: data.name } : null
}

export const auth = {
  // 앱 시작 시 저장된 로그인 복원. 반환 { user } | null
  async restore() {
    const sb = await getClient()
    if (!sb) { try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null } }
    const { data } = await sb.auth.getSession()
    if (!data.session) return null
    try {
      const user = await staffUser(sb, data.session.user)
      if (!user) { await sb.auth.signOut(); return null }
      return { user }
    } catch {
      // 오프라인 등으로 확인 못 하면 일단 로그인 상태 유지(데이터 접근은 어차피 DB가 토큰으로 검증)
      return { user: { id: data.session.user.id, loginId: loginId(data.session.user.email), name: '관리자' } }
    }
  },
  async signIn(id, password) {
    const sb = await getClient()
    if (!sb) {
      if (hangulToKeys(id.trim()).toLowerCase() !== 'admin' || password !== 'admin1234') return fail('아이디 또는 비밀번호가 올바르지 않습니다.')
      const session = { user: { loginId: 'admin', name: '관리자' }, at: nowIso() }
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)) } catch {}
      return wait(session)
    }
    const { data, error } = await sb.auth.signInWithPassword({ email: loginEmail(id), password })
    if (error) throw new Error(error.status === 400 ? '아이디 또는 비밀번호가 올바르지 않습니다.' : `로그인하지 못했습니다. (${error.message})`)
    const user = await staffUser(sb, data.user)
    if (!user) { await sb.auth.signOut(); throw new Error('관리자로 등록되지 않은 계정입니다.') }
    return { user }
  },
  async signOut() {
    const sb = await getClient()
    if (sb) await sb.auth.signOut()
    else try { localStorage.removeItem(SESSION_KEY) } catch {}
  },
  // 토큰 갱신 실패·다른 탭에서 로그아웃 등으로 세션이 끝나면 알림
  async onSignedOut(cb) {
    const sb = await getClient()
    sb?.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') cb() })
  },
  isDemo: !hasSupabase,
}
