# 기존 DB → 새 스키마 이관

기존 운영 DB(MariaDB `jesusvillech`, 교회 홈페이지와 같은 DB의 `lib_*` 테이블)를 새 Supabase 스키마로 옮긴다.
**규칙의 실제 구현은 [`scripts/legacy-import.mjs`](../scripts/legacy-import.mjs)**, 이 문서는 그 근거와 결정 사항이다. 규칙을 바꾸면 둘 다 고친다.
분석 기준 덤프: 2026-11-07. **2026-11-07 Supabase에 이관 완료**(회원 181 / 도서 8,897 / 대출 기록 3,702, 대출 중 49).

## 다시 이관하는 법 (새 덤프를 받았을 때)

덤프가 바뀌어도 다시 분석할 필요 없이 아래 순서로 끝난다.

1. **DBeaver로 4개 테이블을 CSV로 내보낸다** → `doc/db/` (git 제외. 회원 개인정보가 들어 있으므로 다른 곳에 두지 않는다)
   - 테이블: `lib_books`, `lib_members`, `lib_rent_history`, `lib_rent_book`
   - Format: 구분자 `,` · Header `top` · **Escape formulas 끔** · Value display format **Database native** · Binaries Encoding **Base64**
   - Output: 파일명 `${table}_${timestamp}` 기본값 그대로, 인코딩 UTF-8, BOM 끔
   - 같은 테이블 CSV가 여러 개면 파일명이 가장 최근인 것을 쓴다(옛 파일은 지워도 됨)
2. **변환:** `npm run legacy:import`
   - `doc/db/out/import.sql`(넣을 데이터), `doc/db/out/report.md`(건수와 사람이 확인할 목록) 생성
   - **멈추는 경우:** 옛 DB 컬럼 구성이 바뀜, 같은 책이 동시에 두 번 대출 중 → 원인을 확인하고 규칙(스크립트)을 고친다
   - 처음 보는 상태값·형식 등은 멈추지 않고 report.md에 적힌다
3. **report.md 확인** 후 Supabase에 넣는다(요청 크기 제한 때문에 약 400KB씩 나눈 파일을 순서대로):
   `for f in doc/db/out/parts/*.sql; do npx supabase@latest db query --remote --yes -f "$f" || break; done`
   - 중간에 실패해도 처음부터 다시 실행하면 된다(첫 파일이 비우고 시작, "이관 완료" 표시는 마지막 파일에서)
   - 회원·도서·대출 기록을 **비우고 전부 다시 넣는다**(몇 번을 해도 같은 결과)
   - 단, 이관 뒤 새 시스템에서 대출/반납을 한 번이라도 처리했으면 거부된다(운영 데이터 보호, `settings.legacy_imported_at` 기준)
   - 게시판·설정·직원 계정은 건드리지 않는다. 바코드 마지막 번호는 기존 최대 등록번호보다 작을 때만 올린다

## 대상 테이블

| 옛 테이블 | 2026-11-07 건수 | 새 테이블 | 비고 |
|---|---|---|---|
| `lib_books` | 8,898 | `books` | 8,897 (중복 등록 1건 제외) |
| `lib_members` | 181 | `members` | 181 |
| `lib_rent_history` | 3,702 | `loans` | 전체 대출 기록(2021~). 반납 예정일 없음 |
| `lib_rent_book` | 53 | `loans`에 합침 | 현재 대출 + 반납 예정일(`return_dt`). 빈 행 4건 버림 |
| `lib_notice`, `lib_activities` 등 게시판 | - | 미정 | 아직 받지 않음 |

제외: `documents*`, `xe_*`(교회 홈페이지), 날짜가 붙은 백업 테이블, `lib_test_table`, `lib_member_grade`(0건), `lib_seq_creator`(바코드 번호는 최대 등록번호로 계산).

## 도서 `lib_books` → `books`

| 옛 컬럼 | 새 컬럼 | 규칙 |
|---|---|---|
| `book_cde` | `reg_no` | 앞뒤 공백 제거 + `normalizeRegNo`(`src/lib/regNo.js`, 앱과 같은 함수): 한글 자판으로 들어간 글자를 영문 키로 되돌림(`뜨00004055` → `EM00004055`). 되돌리면 다른 책과 겹치는 경우는 원문 유지 + 보고서 |
| `author_cde` | `author_mark` | |
| `author_cde_chk` | `spine_label_printed` | `y` → true |
| `isbn` | `isbn` | 공백·탭·하이픈 제거. 비면 `isbn2`의 `:` 앞부분 |
| `series_title`, `title` | 그대로 | 앞뒤 공백, 끝의 `.` 제거 |
| `claim_no` | `volume` | 라벨의 권차(`2A-13`). 없으면 `series_no` |
| `copy_no`, `class_no` | 그대로 | |
| `pub_info` | `publisher` | `지명 : 출판사`면 출판사만 |
| `author_info` | `author` | 원문 유지(`나관중 지음;이문열 옮김`) |
| `pub_year_info` | `pub_year` | 4자리 연도 추출(`c2015` → 2015), 없으면 빈칸 |
| `book_sts` | `status` | `rent`·빈 값 → available, `readOnly` → readonly(관내열람), `hold` → hold(대출보류, 옛 데이터에 사유가 없어 `hold_reason` = "기존 보류" → 나중에 화면에서 정리). 지금 대출 중이면 loaned. 처음 보는 값은 available + 보고서 |
| `memo`, `reg_dt` | `memo`, `created_at` | `0000-00-00`이면 이관 시각 |
| (계산) | `call_sort_key` | 앱의 `callSortKey()`로 계산 |
| 버림 | | `with_things`(딸림자료, 사용자 결정), `storage_cde`, `book_opt`, `reservation`, `rent_yn`, `isbn2`, `series_no`, `monthly_rent_cnt`, `total_rent_cnt` |

**같은 등록번호가 두 번이면** 원문이 정확한 쪽을 남기고 나머지는 제외 + 보고서. 예: `" EM00005724"`(2022, 앞에 공백)와 `"EM00005724"`(2024)는 같은 책을 두 번 등록한 것이고 대출 기록은 2024년 쪽을 가리킨다.

**사람이 확인할 도서(자동 처리 안 함, 원문 그대로 들어감):**
- `뜨` 보정 후 기존 `EM` 번호와 겹치는 7권
- 등록번호 칸에 ISBN이 들어간 6권
- `EM00002838EM00002838`, `EM000030459788990566171`, `ㄷM00002622ㄷ`, `2`(제목 `ㅏ`, 시험 입력)

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
