// Supabase 연결. .env.local(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)이 없으면 목업 모드.
// 라이브러리는 실제로 쓸 때만 불러온다(목업 모드 번들에 포함되지 않게)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
export const hasSupabase = !!(SUPABASE_URL && SUPABASE_KEY)

let client = null

// 로그인은 Supabase Auth(JWT). 접근 토큰(기본 1시간)은 만료 전에 자동 갱신되고, 모든 요청에 붙어 DB(RLS)가 검증한다.
// 세션은 이 브라우저에 저장(새로고침해도 유지). 동시 로그인 허용·자동 로그아웃 없음(운영 결정)
export async function getClient() {
  if (!hasSupabase) return null
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lent.auth' },
    })
  }
  return client
}

// 로그인 상태면 사용자 JWT, 아니면 공개 키(Edge Function 호출용)
export async function bearer() {
  const sb = await getClient()
  const { data } = (await sb?.auth.getSession()) ?? {}
  return data?.session?.access_token ?? SUPABASE_KEY
}
