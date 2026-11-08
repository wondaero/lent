# 그루터기작은도서관 관리자

Vue 3 + Vite. 현재는 목업 데이터로 동작하며, 추후 Supabase로 교체 예정. (ISBN 서지 조회는 Supabase Edge Function으로 실제 연동 가능)

```bash
npm install
npm run dev       # http://localhost:5173  (.env.local 있으면 Supabase 로그인)
npm run dev:mock  # Supabase 없이 목업 데이터로 (데모 계정 admin / admin1234)
npm run build
```

## 구조

```
src/
  api/index.js      데이터 접근 레이어 입구 — 화면은 여기만 호출. 로그인 + 아래 둘 중 하나를 골라 연결
  api/remote.js     Supabase 구현(.env.local 있을 때)
  api/mock.js       목업 구현(.env.local 없을 때, npm run dev:mock) + api/mockDb.js 예시 데이터
  lib/              포맷 함수, 상수(KDC, 상태값), usePagedList(목록 공통 로직)
  stores/           로그인 세션, 토스트
  layouts/          사이드바 레이아웃
  components/       Pagination, SearchBox, ChartCanvas, ToastHost
  pages/            로그인, 대시보드, 대출/반납, 도서, 회원, 대출기록, 라벨출력, 설정
supabase/functions/
  isbn-lookup/      Edge Function: ISBN 서지 조회(KOLIS-NET 프록시)
  _shared/kolis.ts  KOLIS-NET 호출·응답 해석(순수 코드, Node에서도 테스트 가능)
supabase/migrations/ DB 스키마(테이블·RLS·RPC·Storage)
scripts/legacy-import.mjs  옛 DB CSV 덤프 → 새 스키마 SQL (doc/migration.md)
```

## DB 스키마 적용 · 옛 데이터 이관

```bash
# CLI는 v3 사용(config.toml이 v3 형식이라 v2는 읽지 못함). 운영 DB에 쓰는 명령은 --yes가 있어야 실행됨
npx supabase@latest login                                              # lent 프로젝트 소유 계정으로 (컴퓨터마다 1회)
npx supabase@latest link --project-ref gxmgjdfnncaihqbxowgq
npx supabase@latest db query --remote --yes -f supabase/migrations/<파일>.sql   # 스키마 적용
npx supabase@latest migration repair <버전> --status applied --remote --yes   # 적용 기록 남기기
npm run legacy:import                                                  # doc/db/*.csv → doc/db/out/parts/*.sql + report.md
for f in doc/db/out/parts/*.sql; do npx supabase@latest db query --remote --yes -f "$f" || break; done   # 데이터 넣기(순서대로)
```

- 2026-11-07: 초기 스키마 `20261107120000` 적용, 옛 데이터 이관 완료(회원 181 / 도서 8,897 / 대출 기록 3,702).

- 직원 계정: 대시보드 Authentication에서 사용자 추가 → `insert into staff (user_id, name) select id, '이름' from auth.users where email = '...';`
- **Authentication 설정에서 "Allow new users to sign up"을 끈다.** (켜져 있어도 staff가 아니면 데이터는 안 보이지만, 계정이 생기는 것 자체를 막는다)

## ISBN 서지 조회 연동 (Supabase Edge Function)

브라우저에서 KOLIS-NET(http)을 직접 부르면 혼합 콘텐츠·CORS로 막혀서 Edge Function이 대신 호출한다.
`.env.local`이 없으면 목업으로 동작한다(개발용 예시 ISBN 버튼은 항상 목업).

Supabase 프로젝트: **lent** (ref `gxmgjdfnncaihqbxowgq`, 서울 리전) — 함수 `isbn-lookup` 배포 완료(2026-11-03).

```bash
npx supabase login                                                   # 브라우저로 로그인 (컴퓨터마다 1회)
npx supabase functions deploy isbn-lookup --remote=gxmgjdfnncaihqbxowgq   # 함수 수정 후 재배포 (CLI v3)
cp .env.example .env.local                                           # URL·anon key 채우기 → npm run dev 재시작
```

- `.env.local`은 git에 없으므로 **새 컴퓨터에서는 다시 만들어야 한다.** anon 키는 대시보드(Project Settings → API Keys → Legacy anon) 또는 `npx supabase projects api-keys --remote=gxmgjdfnncaihqbxowgq`에서 확인. **service_role / secret 키는 절대 앱에 넣지 않는다.**
- 함수는 JWT 검사가 켜져 있어 키 없이 호출하면 401. 앱은 Legacy anon 키(`eyJ…`)를 쓴다(새 `sb_publishable_` 키는 JWT가 아니라 그대로는 통과하지 않을 수 있음).

- 호출: `GET /functions/v1/isbn-lookup?isbn=9788936434120` → `{ total, rows }`
- KOLIS-NET은 인증키 불필요. 목록은 한 번에 10건까지(`total`로 전체 건수 표시), 각 건의 분류기호(KDC)·총서명·ISBN은 상세 조회로 채움
- 응답 정리: KDC만 추출(듀이 제외), 저자 역할어 제거("한강 지음" → "한강"), 권차 인식(`(3)`, `.,제3권`), 총서명 괄호 제거
- KOLIS-NET 데이터에는 엉뚱한 기록이 섞여 올 때가 있음 → 선택 창에서 ISBN이 다르면 빨간색 표시

## 성능 관련 원칙
- 모든 페이지는 라우트 단위 지연 로딩. Chart.js는 대시보드 청크에만 포함
- 목록은 서버 페이지네이션(`{ rows, total }`) + 검색 디바운스 + 늦게 온 응답 폐기
- 목록 페이지는 keep-alive로 캐시(상세 → 목록 복귀 시 검색조건 유지)
- UI 라이브러리 없이 CSS 변수 기반 스타일(라이트/다크)

## 청구기호 검색 (`src/lib/callNumber.js`)
- 검색어를 띄어쓰기가 아닌 패턴으로 분해: `813.6마83ㄷ`, `마83다 813.6`, `800 마83ㄷ v.2` 모두 인식
- 분류기호는 계층 검색(`800` → 8xx 전체, `813` → 813.x), 저자기호는 앞부분 일치, 나머지는 일반 키워드
- 정렬은 `call_sort_key`(서가 배열 순서) 기준. 저자기호 숫자는 소수식 비교(마8 < 마83 < 마9)

## Supabase 전환 시 메모
- `books.call_sort_key`는 `callSortKey()`와 같은 규칙으로 저장하고 `COLLATE "C"` 인덱스로 정렬
- `loans.checkout / checkin`은 여러 테이블을 갱신하므로 Postgres 함수(RPC)로 구현
- `books.lookupIsbn`은 KOLIS-NET 프록시 Edge Function으로 (구현 완료: `supabase/functions/isbn-lookup`)
- `stats.*`는 집계 view 또는 RPC로
- 인증은 Supabase Auth로 교체(`api/index.js`의 `auth`)
