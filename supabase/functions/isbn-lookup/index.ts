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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'GET') return json({ error: 'GET만 지원합니다.' }, 405)

  const isbn = new URL(req.url).searchParams.get('isbn') ?? ''
  try {
    return json(await lookupIsbn(isbn))
  } catch (e) {
    const msg = e instanceof Error ? (e.name === 'AbortError' ? 'KOLIS-NET 응답이 늦어 중단했습니다.' : e.message) : String(e)
    return json({ error: msg }, msg.startsWith('ISBN은') ? 400 : 502)
  }
})
