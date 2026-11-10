// Supabase Edge Function: ISBN 서지 조회 프록시 (KOLIS-NET)
//   GET  /functions/v1/isbn-lookup?isbn=9788936434120
//   응답 { total, rows: Candidate[] }   (rows 형식 = 앱의 books.lookupIsbn 후보 배열)
//
// 브라우저에서 KOLIS-NET을 직접 부르면 http(혼합 콘텐츠)·CORS 때문에 막혀서 서버에서 대신 호출한다.
// 배포: npx supabase functions deploy isbn-lookup
import { lookupIsbn } from '../_shared/kolis.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } })

// 직원 계정만 쓰게: 공개(anon) 키도 형식상 유효한 JWT라서 기본 검증(verify_jwt)만으로는 누구나 부를 수 있다.
// 요청에 붙은 사용자 토큰으로 DB의 is_staff()를 불러 확인한다(외부 의존성 없이 REST로)
async function isStaff(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization') ?? ''
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_ANON_KEY')
  if (!auth.startsWith('Bearer ') || !url || !key) return false
  const res = await fetch(`${url}/rest/v1/rpc/is_staff`, {
    method: 'POST',
    headers: { apikey: key, authorization: auth, 'content-type': 'application/json' },
    body: '{}',
  })
  return res.ok && (await res.json().catch(() => false)) === true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'GET') return json({ error: 'GET만 지원합니다.' }, 405)

  if (!(await isStaff(req))) return json({ error: '로그인이 필요합니다. 다시 로그인해주세요.' }, 401)

  const isbn = new URL(req.url).searchParams.get('isbn') ?? ''
  try {
    return json(await lookupIsbn(isbn))
  } catch (e) {
    const msg = e instanceof Error ? (e.name === 'AbortError' ? 'KOLIS-NET 응답이 늦어 중단했습니다.' : e.message) : String(e)
    return json({ error: msg }, msg.startsWith('ISBN은') ? 400 : 502)
  }
})
