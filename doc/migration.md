# 기존 DB → 새 스키마 이관

기존 운영 DB(MariaDB `jesusvillech`, 교회 홈페이지와 같은 DB의 `lib_*` 테이블)를 새 Supabase 스키마로 옮긴다.
**규칙의 실제 구현은 [`scripts/legacy-import.mjs`](../scripts/legacy-import.mjs)**, 이 문서는 그 근거와 결정 사항이다. 규칙을 바꾸면 둘 다 고친다.
이 문서와 스크립트는 **시험하며 여러 번 다시 넣고, 새 덤프를 받으면 분석 없이 바로 진행하기 위한 것**이다. **실제 이관을 마치면 둘 다 지운다**(사용자 결정).
분석 기준 덤프: 2026-11-07. **2026-11-07 Supabase에 이관 완료**(회원 181 / 도서 8,889 / 대출 기록 3,702, 대출 중 49).

## 새 덤프를 받았을 때: Claude 작업 순서

사용자가 "덤프 떴어"라고 하면 **분석을 다시 하지 않고** 아래 순서대로 바로 진행한다. 규칙은 모두 스크립트에 들어 있다.

1. **덤프 확인:** `ls -la doc/db/` → `lib_books_*`, `lib_members_*`, `lib_rent_history_*`, `lib_rent_book_*` 4개가 새 시각(파일명 끝 12자리)으로 있는지. 없으면 아래 "DBeaver로 내보내기" 설정을 안내한다
2. **Supabase 연결 확인:** `npx supabase@latest projects list`에 `lent`(ref `gxmgjdfnncaihqbxowgq`)가 보여야 한다. 안 보이거나 403이면 사용자에게 `npx supabase@latest login`(lent 소유 계정)을 부탁한다. CLI는 **v3**(`supabase@latest`)만 쓴다(v2는 `config.toml`을 못 읽음)
3. **변환:** `npm run legacy:import` → 건수와 `doc/db/out/report.md` 확인
   - 스크립트가 멈추면(컬럼 구성 변경, 같은 책 동시 대출 2건 등) 넣지 말고 원인을 사용자에게 알린다
4. **보고서 판단:** 아래 "기준선"에 있는 종류의 항목이면 그대로 진행한다. **기준선에 없는 새 종류**(처음 보는 상태값, 새 형식의 등록번호, 회원 대출 한도 0 증가 등)가 있으면 넣기 전에 사용자에게 목록을 보여 주고 처리 방법을 묻는다
5. **넣기:** `for f in doc/db/out/parts/*.sql; do npx supabase@latest db query --remote --yes -f "$f" || break; done`
   - 로그인 계정·`staff`만 남기고 회원·도서·대출·게시글을 비운 뒤 넣는다(시험 데이터는 지워져도 됨, 사용자 결정)
   - 413(요청이 너무 큼)이 나면 스크립트의 나누는 크기(400,000)를 줄인다
6. **확인:** 아래 쿼리 결과가 report.md 건수와 같은지
   ```sql
   select (select count(*) from members) members, (select count(*) from books) books,
          (select count(*) from loans) loans, (select count(*) from loans where returned_at is null) open,
          (select count(*) from loans where book_id is null) deleted_book_loans,
          (select value from settings where key = 'barcode_last_issued_no') barcode_last
   ```
   `npx supabase@latest db query --remote --yes -o json "<위 쿼리>"` (`--read-only`는 함수 실행 권한이 없어 일부 조회가 실패하므로 쓰지 않는다)
7. **사용자에게 보고:** 건수(지난번과 차이), 기준선 대비 새로 생긴 확인 항목, 남은 정리 항목(아래 "기준선"의 사람 확인 항목)
8. **실제 전환이 끝났다고 하면:** `scripts/legacy-import.mjs`, 이 문서, `package.json`의 `legacy:import`를 지우고 CLAUDE.md의 이관 관련 줄을 정리한다(사용자 결정)

### 기준선 (2026-11-07 덤프, 이미 알고 처리 방법이 정해진 항목)

새 덤프에서 아래와 같은 종류는 정상이다. 건수만 조금 달라질 수 있다.

| 구분 | 건수 | 처리 |
|---|---|---|
| 회원번호 없음(옛 웹 가입 승인 대기) | 11 | 최대 번호 다음부터 새 번호 |
| 회원 이름 없음 | 6 | `(이름 없음)`으로 넣음(유지 결정) |
| 회원 대출 한도·기간 0 | 1 (회원 213) | 그대로 넣고 보고 |
| 도서 등록번호 자동 보정(`뜨` 등) | 8 | 자동 |
| 번호 안의 `EM+8자리` 살림 | 3 | 자동 |
| 같은 책 중복 등록 제외 | 8 (`뜨` 7 + 앞 공백 1) | 자동 |
| 시험 입력 제외(`2` / `ㅏ`) | 1 | 자동 |
| 등록번호 칸에 ISBN | 6 | **사람 확인**: 서가에서 실제 바코드 보고 도서 수정 |
| 저자기호 형식 이상(`글undefinedundefinedㅍ` 등) | 4 | **사람 확인**: 사용자가 따로 정리(목록에는 빨간 "저자기호 확인"으로 표시) |
| 대출보류 `hold` | 189 | 사유 "기존 보류" → 화면에서 정리 |
| 삭제된 도서의 대출 기록 | 79 | 책은 되살리지 않고 기록만(`book_id` null) |

이관한 결과(2026-11-08 Supabase): 회원 181 / 도서 8,889 / 대출 기록 3,702 / 대출 중 49 / 바코드 마지막 EM00011196.

## 전환하는 날 (옛 시스템 → 새 시스템)

이관은 전환하는 날 한 번 하는 작업이다. **로그인 계정(Auth)과 직원 명단(`staff`)만 남기고 앱 데이터를 모두 비운 뒤 덤프를 넣는다**(사용자 결정).
그 전까지 Supabase의 데이터는 시험용이라 대출/반납·등록·게시글을 마음껏 해 봐도 된다. 덤프가 바뀌어도 다시 분석할 필요 없이 아래 순서로 끝난다.

0. **게시판 시험 글을 게시판 화면에서 지운다.** DB를 비워도 Storage의 사진 파일은 남기 때문(화면에서 지우면 파일도 지워짐)
1. **옛 시스템 사용을 멈춘다.** 덤프 뒤에 옛 시스템에서 처리한 대출/반납은 옮겨지지 않는다
2. **DBeaver로 4개 테이블을 CSV로 내보낸다** → `doc/db/` (git 제외. 회원 개인정보가 들어 있으므로 다른 곳에 두지 않는다)
   - 테이블: `lib_books`, `lib_members`, `lib_rent_history`, `lib_rent_book`
   - Format: 구분자 `,` · Header `top` · **Escape formulas 끔** · Value display format **Database native** · Binaries Encoding **Base64**
   - Output: 파일명 `${table}_${timestamp}` 기본값 그대로, 인코딩 UTF-8, BOM 끔
   - 같은 테이블 CSV가 여러 개면 파일명이 가장 최근인 것을 쓴다(옛 파일은 지워도 됨)
3. **변환:** `npm run legacy:import`
   - `doc/db/out/parts/*.sql`(넣을 데이터, 약 400KB씩), `doc/db/out/report.md`(건수와 사람이 확인할 목록) 생성
   - **멈추는 경우:** 옛 DB 컬럼 구성이 바뀜, 같은 책이 동시에 두 번 대출 중 → 원인을 확인하고 규칙(스크립트)을 고친다
   - 처음 보는 상태값·형식 등은 멈추지 않고 report.md에 적힌다
4. **report.md 확인** 후 Supabase에 넣는다(요청 크기 제한 때문에 나눈 파일을 순서대로):
   `for f in doc/db/out/parts/*.sql; do npx supabase@latest db query --remote --yes -f "$f" || break; done`
   - 첫 파일이 **회원·도서·대출 기록·게시글을 비우고** 시작한다. 중간에 실패해도 처음부터 다시 실행하면 같은 결과
   - 남는 것: 로그인 계정, 직원 명단, Storage 파일(0번에서 정리)
   - 바코드 라벨 마지막 번호 = 이관한 책의 가장 큰 EM 번호로 다시 맞춘다(시험으로 출력한 번호는 버림)
5. 새 시스템으로 운영 시작. **운영을 시작한 뒤에는 이관을 다시 실행하지 않는다**(실제 대출/반납 기록이 지워진다)

## 대상 테이블

| 옛 테이블 | 2026-11-07 건수 | 새 테이블 | 비고 |
|---|---|---|---|
| `lib_books` | 8,898 | `books` | 8,889 (중복 등록 8건·시험 입력 1건 제외) |
| `lib_members` | 181 | `members` | 181 |
| `lib_rent_history` | 3,702 | `loans` | 전체 대출 기록(2021~). 반납 예정일 없음 |
| `lib_rent_book` | 53 | `loans`에 합침 | 현재 대출 + 반납 예정일(`return_dt`). 빈 행 4건 버림 |
| `lib_notice`, `lib_activities` 등 게시판 | - | 미정 | 아직 받지 않음 |

제외: `documents*`, `xe_*`(교회 홈페이지), 날짜가 붙은 백업 테이블, `lib_test_table`, `lib_member_grade`(0건), `lib_seq_creator`(바코드 번호는 최대 등록번호로 계산).

## 도서 `lib_books` → `books`

| 옛 컬럼 | 새 컬럼 | 규칙 |
|---|---|---|
| `book_cde` | `reg_no` | 아래 "등록번호 정리 규칙" |
| `author_cde` | `author_mark` | 앱과 같은 `normalizeAuthorMark`(끝 글자 `다` → `ㄷ`, 2026-11-10 추가: 안 하면 `마83다`로 검색해도 못 찾음). 바뀐 건수는 보고서 숫자로 |
| `author_cde_chk` | `spine_label_printed` | `y` → true |
| `isbn` | `isbn` | 공백·탭·하이픈 제거. 비면 `isbn2`의 `:` 앞부분 |
| `series_title`, `title` | 그대로 | 앞뒤 공백, 끝의 `.` 제거 |
| `claim_no` | `volume` | 라벨의 권차(`2A-13`). 없으면 `series_no` |
| `copy_no`, `class_no` | 그대로 | |
| `pub_info` | `publisher` | `지명 : 출판사`면 출판사만 |
| `author_info` | `author` | 원문 유지(`나관중 지음;이문열 옮김`) |
| `pub_year_info` | `pub_year` | 4자리 연도 추출(`c2015` → 2015), 없으면 빈칸 |
| `book_sts` | `status` | `rent`·빈 값 → available, `readOnly` → readonly(관내열람), `hold` → hold(대출보류, 옛 데이터에 사유가 없어 `hold_reason` = "기존 보류" → 나중에 화면에서 정리). 처음 보는 값은 available + 보고서. **대출중 여부는 실제로 넣는 대출 기록 기준으로 마지막에 맞춘다**(2026-11-10): 미반납 기록이 있으면 loaned, 없으면 loaned가 아님(회원이 없어 뺀 미반납 기록 등은 보고서 "도서 상태"에) |
| `memo`, `reg_dt` | `memo`, `created_at` | `0000-00-00`이면 이관 시각 |
| (계산) | `call_sort_key` | 앱의 `callSortKey()`로 계산 |
| 버림 | | `with_things`(딸림자료, 사용자 결정), `storage_cde`, `book_opt`, `reservation`, `rent_yn`, `isbn2`, `series_no`, `monthly_rent_cnt`, `total_rent_cnt` |

**등록번호 정리 규칙**(2026-11-08 실제 데이터 검토, 스크립트에 구현):
1. `normalizeRegNo`로 공백·한글 자판 되돌리기
2. 그래도 형식이 아니면 안에 든 `EM+8자리`를 살린다: `EM00002838EM00002838`(두 번 스캔), `EM000030459788990566171`(뒤에 ISBN), `ㄷM00002622ㄷ`
3. **같은 번호가 이미 있고 서명도 같으면 같은 책의 중복 등록 → 버리고 대출 기록은 남긴 쪽으로 연결.** 원문이 정확한 번호인 행을 먼저 처리해서 잘못 들어간 쪽이 밀려난다
   - `뜨` 7권: 옛 시스템이 2021-09 `뜨 → EM` 정리 때 EM 행을 새로 만들고 `뜨` 행을 안 지운 것(서명 같음, 대출 기록은 EM 쪽에만)
   - `" EM00005724"`(2022, 앞에 공백)와 `"EM00005724"`(2024): 같은 책 재등록
4. 서명이 비었거나 자모 한 글자뿐이고 대출 기록이 없으면 시험 입력으로 보고 버린다(등록번호 `2`, 서명 `ㅏ`)

**사람이 확인할 도서(원문 그대로 들어감):** 등록번호 칸에 ISBN이 들어간 6권. 책에 붙은 실제 바코드 번호를 서가에서 확인한 뒤 도서 수정에서 고친다.

## 회원 `lib_members` → `members`

| 옛 컬럼 | 새 컬럼 | 규칙 |
|---|---|---|
| `mbr_cde` | `member_no` | **숫자.** 기존 번호 그대로(대출 기록이 참조). 번호가 없는 회원(옛 웹 가입 승인 대기)은 기존 최대 번호 다음부터(2026-11-07: 219 → 220~230) |
| `mbr_nm` | `name` | 비면 `(이름 없음)` → 목록에서 찾아 정리 |
| `mbr_tel` | `phone` | 숫자만 뽑아 `010-0000-0000`으로. 자릿수가 이상하면 원문 + 보고서 |
| `mbr_gender` | `gender` | 남자 → M, 여자 → F |
| `mbr_birth` | `birth_date` | `0000-00-00`은 빈칸 |
| `mbr_address`, `memo` | `address`, `memo` | |
| `mbr_mx_cnt`, `mbr_mx_date` | `loan_limit`, `loan_days` | 0이면 보고서 |
| `sign_up_dt` | `created_at` | `0000-00-00`이면 첫 대출일, 그것도 없으면 이관 시각 |
| 버림 | | **`mbr_id`, `mbr_pw`(웹 회원 기능 없앰, 사용자 결정. 비밀번호는 MD5로 보이는 32자리 해시)**, `mbr_email`, `mbr_grade`, `approval_yn`, `mbr_opt`, `mbr_sts`, `del_yn`, `*_rent_cnt`, `overdue_cnt` |

회원은 **빈 행(이름·전화·대출 기록 없음)까지 모두 유지**하고 번호를 준다(사용자 결정). 상태는 모두 active.

## 대출 `lib_rent_history` (+ `lib_rent_book`) → `loans`

- `rent_dt` → `loaned_at`(그날 0시, 한국시간), `return_dt` → `returned_at`(그날 12시. 비면 대출 중)
- 대출 중: `due_at` = `lib_rent_book.return_dt`(같은 책·회원으로 매칭. 2026-11-07 기준 49건 모두 일치)
- 반납 완료: 예정일이 남아 있지 않으므로 `due_at` = 대출일 + 회원 대출기간. 그보다 늦게 반납했는데 `is_overdue`가 `y`가 아니면 연장으로 보고 `extended_due_at` = 반납일 → 옛 연체 표시(860건)와 거의 같다(855건, 예정일 당일 반납 판정 차이)
- 버림: `rent_sts`, `rent_sts2`(전부 빈 값), `is_overdue`(위 계산에만 사용)
- **삭제된 도서**를 가리키는 기록(2026-11-07: 59권 79건, 모두 반납 완료): `lib_books`에 그 등록번호의 행이 아예 없다(삭제 표시 컬럼 없음 → 행을 실제로 지운 것). **책은 되살리지 않고 대출 기록만 남긴다**(사용자 결정): `book_id` = null, `book_reg_no` = 옛 `book_cde`, `book_title` = null → 화면에는 "(삭제된 도서)"와 등록번호
- 모든 대출 기록에 `book_reg_no`, `book_title`(대출 당시 값)을 함께 넣는다
