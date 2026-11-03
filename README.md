# 그루터기작은도서관 관리자

Vue 3 + Vite. 현재는 목업 데이터로 동작하며, 추후 Supabase로 교체 예정.

```bash
npm install
npm run dev      # http://localhost:5173  (데모 계정 admin@lib.local / admin1234)
npm run build
```

## 구조

```
src/
  api/index.js      데이터 접근 레이어 — 화면은 여기만 호출. Supabase 연동 시 이 파일만 교체
  api/mockDb.js     목업 데이터(도서 1,200 / 회원 260 / 대여 1년치). 스키마 = 예정 Supabase 스키마
  lib/              포맷 함수, 상수(KDC, 상태값), usePagedList(목록 공통 로직)
  stores/           로그인 세션, 토스트
  layouts/          사이드바 레이아웃
  components/       Pagination, SearchBox, ChartCanvas, ToastHost
  pages/            로그인, 대시보드, 대여/반납, 도서, 회원, 대여기록, 라벨출력, 설정
```

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
- `books.lookupIsbn`은 KOLIS-NET 프록시 Edge Function으로
- `stats.*`는 집계 view 또는 RPC로
- 인증은 Supabase Auth로 교체(`api/index.js`의 `auth`)
