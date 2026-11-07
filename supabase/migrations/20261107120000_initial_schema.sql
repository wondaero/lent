-- 그루터기작은도서관 관리자 — 초기 스키마
-- 구조는 src/api/mockDb.js 상단 주석과 같다(화면은 src/api/index.js만 호출).
-- 권한: 직원 명단(staff)에 있는 로그인 계정만 모든 데이터에 접근. anon(공개 키)은 아무것도 못 한다.
--       메인페이지 공개 게시판은 나중에 Edge Function으로 따로(CLAUDE.md §10).

-- ───────────── 공통 ─────────────
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ───────────── 직원 명단 ─────────────
-- Supabase Auth 계정 중 관리자 화면을 쓸 수 있는 사람. 회원가입이 실수로 열려 있어도 여기 없으면 데이터 접근 불가
create table public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
comment on table public.staff is '관리자 화면을 쓸 수 있는 직원 계정';
comment on column public.staff.user_id is 'Supabase Auth 사용자 id';
comment on column public.staff.name is '화면에 표시할 이름';

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff where user_id = auth.uid())
$$;

-- ───────────── 도서 ─────────────
create table public.books (
  id                  bigint generated always as identity primary key,
  reg_no              text not null unique,
  isbn                text,
  title               text not null,
  series_title        text,
  author              text not null default '',
  publisher           text,
  pub_year            text,
  class_no            text not null default '',
  author_mark         text,
  volume              text,
  copy_no             text,
  call_sort_key       text collate "C" not null default '',
  status              text not null default 'available'
                      check (status in ('available', 'loaned', 'readonly', 'hold', 'lost', 'discarded')),
  hold_reason         text,
  spine_label_printed boolean not null default false,
  memo                text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint books_hold_reason_required check (status <> 'hold' or coalesce(btrim(hold_reason), '') <> '')
);
comment on table public.books is '소장 도서';
comment on column public.books.reg_no is '등록번호. 새 책은 EM + 숫자 8자리(책에 붙인 바코드). 옛 데이터에는 형식이 다른 번호가 남아 있을 수 있음';
comment on column public.books.isbn is 'ISBN(10 또는 13자리)';
comment on column public.books.title is '서명';
comment on column public.books.series_title is '총서명(시리즈 이름). 저자기호는 총서명이 있으면 총서명 기준';
comment on column public.books.author is '저자 표기 원문(예: 나관중 지음;이문열 옮김)';
comment on column public.books.publisher is '출판사';
comment on column public.books.pub_year is '발행연도 4자리';
comment on column public.books.class_no is '분류기호(KDC, 예: 813.6)';
comment on column public.books.author_mark is '저자기호(리재철 제5표, 예: 마83ㄷ)';
comment on column public.books.volume is '권차(청구기호의 v.)';
comment on column public.books.copy_no is '복본 번호(청구기호의 c.)';
comment on column public.books.call_sort_key is '서가 배열 순서 정렬 키. 앱의 callSortKey()와 같은 규칙으로 저장';
comment on column public.books.status is 'available 대출가능 / loaned 대출중 / readonly 관내열람 / hold 대출보류 / lost 분실 / discarded 폐기';
comment on column public.books.hold_reason is '대출보류 사유(파손, 수리 중 등). status = hold일 때 필수';
comment on column public.books.spine_label_printed is '청구기호 라벨(책등)을 출력했는지. 등록하면 false → 라벨 출력 화면의 미출력 목록에 쌓임';
comment on column public.books.memo is '메모';
comment on column public.books.created_at is '등록일시';
comment on column public.books.updated_at is '마지막 수정일시';
create index books_call_sort_key_idx on public.books (call_sort_key);
create index books_status_idx on public.books (status);
create index books_isbn_idx on public.books (isbn);
create index books_unprinted_idx on public.books (id) where not spine_label_printed;
create trigger books_updated_at before update on public.books for each row execute function public.set_updated_at();

-- ───────────── 회원 ─────────────
create table public.members (
  id          bigint generated always as identity primary key,
  member_no   integer not null unique,
  name        text not null,
  phone       text,
  birth_date  date,
  gender      text check (gender in ('M', 'F')),
  address     text,
  loan_limit  integer not null default 5 check (loan_limit >= 0),
  loan_days   integer not null default 14 check (loan_days >= 0),
  status      text not null default 'active' check (status in ('active', 'suspended', 'hold')),
  memo        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
comment on table public.members is '도서관 회원';
comment on column public.members.member_no is '회원번호(숫자, 회원카드에 쓰임). 옛 번호 유지, 새 회원은 지금까지의 최대 번호 + 1. 삭제된 회원 번호도 다시 쓰지 않음';
comment on column public.members.name is '이름';
comment on column public.members.phone is '전화번호(010-0000-0000)';
comment on column public.members.birth_date is '생년월일';
comment on column public.members.gender is 'M 남 / F 여';
comment on column public.members.address is '주소';
comment on column public.members.loan_limit is '최대 대출 권수';
comment on column public.members.loan_days is '대출 기간(일). 반납 예정일 기본값 = 대출일 + 이 값';
comment on column public.members.status is 'active 정상 / suspended 대출정지 / hold 보류';
comment on column public.members.memo is '메모';
comment on column public.members.created_at is '가입일시';
comment on column public.members.updated_at is '마지막 수정일시';
comment on column public.members.deleted_at is '삭제일시(삭제해도 행은 남김 → 대출 기록 유지)';
create index members_name_idx on public.members (name);
create index members_phone_idx on public.members (phone);
create trigger members_updated_at before update on public.members for each row execute function public.set_updated_at();

-- ───────────── 대출 ─────────────
create table public.loans (
  id              bigint generated always as identity primary key,
  book_id         bigint references public.books (id) on delete set null,
  book_reg_no     text not null,
  book_title      text,
  member_id       bigint not null references public.members (id) on delete restrict,
  loaned_at       timestamptz not null default now(),
  due_at          timestamptz not null,
  extended_due_at timestamptz,
  returned_at     timestamptz,
  check (returned_at is null or returned_at >= loaned_at)
);
comment on table public.loans is '대출 기록(대출 중 + 반납 완료). 책을 삭제해도 기록은 남는다';
comment on column public.loans.book_id is '도서. 책을 삭제하면 null';
comment on column public.loans.book_reg_no is '대출 당시 등록번호(책이 삭제돼도 표시용으로 남김)';
comment on column public.loans.book_title is '대출 당시 서명(책이 삭제돼도 표시용으로 남김. 옛 데이터의 삭제 도서는 null)';
comment on column public.loans.member_id is '대출한 회원';
comment on column public.loans.loaned_at is '대출일시';
comment on column public.loans.due_at is '처음 정한 반납 예정일(연장해도 바꾸지 않음)';
comment on column public.loans.extended_due_at is '연장한 반납 예정일(마지막 연장). 연체 계산은 이 값 우선';
comment on column public.loans.returned_at is '반납일시(주말 반납함은 실제 넣은 날로 소급). null이면 대출 중';
-- 같은 책이 동시에 두 번 대출 중일 수 없다
create unique index loans_one_active_per_book on public.loans (book_id) where returned_at is null and book_id is not null;
create index loans_member_idx on public.loans (member_id, loaned_at desc);
create index loans_book_idx on public.loans (book_id, loaned_at desc);
create index loans_loaned_at_idx on public.loans (loaned_at desc);
create index loans_returned_at_idx on public.loans (returned_at desc);
create index loans_active_idx on public.loans (member_id) where returned_at is null;

-- ───────────── 게시판 ─────────────
create table public.posts (
  id           bigint generated always as identity primary key,
  category     text not null check (category in ('notice', 'activity')),
  title        text not null,
  body         text not null default '',
  pinned       boolean not null default false,
  status       text not null default 'published' check (status in ('published', 'draft')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.posts is '게시판 글(공지사항, 활동). 메인페이지에는 게시(published)된 글만 나간다';
comment on column public.posts.category is 'notice 공지사항 / activity 활동(사진 첨부 가능)';
comment on column public.posts.title is '제목';
comment on column public.posts.body is '본문(일반 텍스트)';
comment on column public.posts.pinned is '목록 맨 위에 고정(공지사항)';
comment on column public.posts.status is 'published 게시 / draft 임시저장';
comment on column public.posts.published_at is '처음 게시한 일시(이후 수정해도 유지)';
create index posts_list_idx on public.posts (category, pinned desc, created_at desc);
create trigger posts_updated_at before update on public.posts for each row execute function public.set_updated_at();

create table public.post_images (
  id         bigint generated always as identity primary key,
  post_id    bigint not null references public.posts (id) on delete cascade,
  path       text not null,
  thumb_path text not null,
  width      integer not null,
  height     integer not null,
  sort       integer not null default 0
);
comment on table public.post_images is '게시글 사진. 파일은 Storage 공개 버킷 post-images';
comment on column public.post_images.path is '본문용 사진 경로(버킷 안, 긴 변 1280)';
comment on column public.post_images.thumb_path is '목록용 작은 사진 경로(긴 변 400)';
comment on column public.post_images.width is '본문용 사진 가로(px)';
comment on column public.post_images.height is '본문용 사진 세로(px)';
comment on column public.post_images.sort is '표시 순서(0 = 대표 사진)';
create index post_images_post_idx on public.post_images (post_id, sort);

-- ───────────── 설정 ─────────────
create table public.settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
comment on table public.settings is '도서관 설정값(키-값). 여러 PC가 같이 써야 하는 값만 둔다';
comment on column public.settings.key is '설정 이름';
comment on column public.settings.value is '설정 값(JSON)';
create trigger settings_updated_at before update on public.settings for each row execute function public.set_updated_at();
insert into public.settings (key, value) values
  ('barcode_last_issued_no', '0');  -- 마지막으로 출력한 바코드 라벨 번호(등록번호 숫자 부분). 이관 때 기존 최대 번호로 맞춤

-- ───────────── 권한(RLS) ─────────────
alter table public.staff enable row level security;
alter table public.books enable row level security;
alter table public.members enable row level security;
alter table public.loans enable row level security;
alter table public.posts enable row level security;
alter table public.post_images enable row level security;
alter table public.settings enable row level security;

create policy "직원은 직원 명단 조회" on public.staff for select to authenticated using (public.is_staff());
create policy "직원 전체 권한" on public.books for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "직원 전체 권한" on public.members for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "직원 전체 권한" on public.loans for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "직원 전체 권한" on public.posts for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "직원 전체 권한" on public.post_images for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "직원 전체 권한" on public.settings for all to authenticated using (public.is_staff()) with check (public.is_staff());

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.books, public.members, public.loans, public.posts, public.post_images, public.settings to authenticated;
grant select on public.staff to authenticated;

-- ───────────── 대출/반납 처리(트랜잭션) ─────────────
-- api/index.js의 loans.process와 같은 규칙. 검증을 모두 끝낸 뒤 반영하므로 일부만 처리되는 일이 없다.
--  - 반납은 회원 없이 가능. 반납을 먼저 반영해 비워진 한도를 대출에 사용(이번에 반납하는 본인 책 제외)
--  - p_return_date: 반납 처리일(주말 반납함 소급). null이거나 오늘이면 지금 시각, 과거면 그날 12시(한국시간). 대출일보다 앞서면 대출일
create or replace function public.loans_process(
  p_member_id   bigint,
  p_return_ids  bigint[],
  p_book_ids    bigint[],
  p_due_at      timestamptz,
  p_return_date date
) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  v_today   date := (now() at time zone 'Asia/Seoul')::date;
  v_ret_at  timestamptz := now();
  v_member  members;
  v_returns bigint[];
  v_freed   int := 0;
  v_active  int;
  v_bad     text;
  v_n_books int := coalesce(cardinality(p_book_ids), 0);
begin
  if not public.is_staff() then raise exception '권한이 없습니다.'; end if;

  -- 반납 대상: 아직 반납 안 된 것만(중복 처리 무시)
  select coalesce(array_agg(id), '{}') into v_returns
    from loans where id = any(coalesce(p_return_ids, '{}')) and returned_at is null;
  perform 1 from loans where id = any(v_returns) for update;

  if p_return_date is not null and p_return_date <> v_today then
    if p_return_date > v_today then raise exception '반납 처리일은 미래일 수 없습니다.'; end if;
    v_ret_at := (p_return_date + time '12:00') at time zone 'Asia/Seoul';
  end if;

  if v_n_books > 0 then
    select * into v_member from members where id = p_member_id and deleted_at is null for update;
    if not found then raise exception '대출할 회원을 선택해주세요.'; end if;
    if v_member.status <> 'active' then raise exception '대출이 정지된 회원입니다.'; end if;
    if p_due_at is null then raise exception '반납 예정일을 지정해주세요.'; end if;

    select count(*) into v_freed from loans where id = any(v_returns) and member_id = v_member.id;
    select count(*) into v_active from loans where member_id = v_member.id and returned_at is null;
    if v_active - v_freed + v_n_books > v_member.loan_limit then
      raise exception '대출 한도(%권)를 초과합니다.', v_member.loan_limit;
    end if;

    perform 1 from books where id = any(p_book_ids) for update;
    select coalesce(b.title, '알 수 없음') into v_bad
      from unnest(p_book_ids) as t(id)
      left join books b on b.id = t.id
      left join loans l on l.id = any(v_returns) and l.book_id = t.id
     where b.id is null or (b.status <> 'available' and l.id is null)
     limit 1;
    if found then raise exception '"%"은(는) 대출할 수 없는 상태입니다.', v_bad; end if;
  end if;

  update loans set returned_at = greatest(v_ret_at, loaned_at) where id = any(v_returns);
  update books b set status = 'available'
    from loans l where l.id = any(v_returns) and l.book_id = b.id and b.status = 'loaned';

  if v_n_books > 0 then
    insert into loans (book_id, book_reg_no, book_title, member_id, loaned_at, due_at)
      select b.id, b.reg_no, b.title, v_member.id, now(), p_due_at from books b where b.id = any(p_book_ids);
    update books set status = 'loaned' where id = any(p_book_ids);
  end if;

  return jsonb_build_object('returned', cardinality(v_returns), 'loaned', v_n_books);
end $$;

-- 연장: 횟수 제한 없음, 연체 중에도 가능(운영 결정). 처음 반납 예정일은 그대로, 연장일만 덮어씀
create or replace function public.loans_extend(p_loan_id bigint, p_due_at timestamptz) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_staff() then raise exception '권한이 없습니다.'; end if;
  if p_due_at is null or (p_due_at at time zone 'Asia/Seoul')::date < (now() at time zone 'Asia/Seoul')::date then
    raise exception '연장 반납일은 오늘 이후여야 합니다.';
  end if;
  update loans set extended_due_at = p_due_at where id = p_loan_id and returned_at is null;
  if not found then raise exception '연장할 수 없는 대출입니다.'; end if;
end $$;

-- ───────────── 바코드 라벨 번호 ─────────────
-- 마지막 출력 번호 = max(설정값, 등록된 책의 가장 큰 EM 번호). 여러 PC가 동시에 출력해도 번호가 겹치지 않게 행을 잠그고 "기대값일 때만" 갱신
create or replace function public.barcode_last_issued() returns integer
language sql stable security invoker set search_path = public as $$
  select greatest(
    (select (value #>> '{}')::int from settings where key = 'barcode_last_issued_no'),
    coalesce((select max(substring(reg_no from 3)::int) from books where reg_no ~ '^EM[0-9]{8}$'), 0)
  )
$$;

create or replace function public.barcode_issue(p_from integer, p_count integer) returns integer
language plpgsql security invoker set search_path = public as $$
declare v_last int;
begin
  if not public.is_staff() then raise exception '권한이 없습니다.'; end if;
  perform 1 from settings where key = 'barcode_last_issued_no' for update;
  v_last := public.barcode_last_issued();
  if p_from <> v_last + 1 then
    raise exception '그 사이 다른 곳에서 바코드를 출력했습니다. 화면을 새로고침한 뒤 다시 확인해주세요.';
  end if;
  update settings set value = to_jsonb(p_from + p_count - 1) where key = 'barcode_last_issued_no';
  return p_from + p_count - 1;
end $$;

-- 인쇄 취소 시 되돌리기. 그 뒤로 더 출력됐거나 그 번호로 등록된 책이 있으면 되돌리지 않는다(비는 건 괜찮고 겹치면 안 됨)
create or replace function public.barcode_release(p_from integer, p_count integer) returns integer
language plpgsql security invoker set search_path = public as $$
declare v_set int;
begin
  if not public.is_staff() then raise exception '권한이 없습니다.'; end if;
  select (value #>> '{}')::int into v_set from settings where key = 'barcode_last_issued_no' for update;
  if v_set <> p_from + p_count - 1
     or exists (select 1 from books where reg_no ~ '^EM[0-9]{8}$' and substring(reg_no from 3)::int >= p_from) then
    raise exception '이미 다음 번호가 사용되어 되돌리지 않았습니다.';
  end if;
  update settings set value = to_jsonb(p_from - 1) where key = 'barcode_last_issued_no';
  return p_from - 1;
end $$;

revoke execute on all functions in schema public from public, anon;
grant execute on function public.is_staff(), public.loans_process(bigint, bigint[], bigint[], timestamptz, date),
  public.loans_extend(bigint, timestamptz), public.barcode_last_issued(), public.barcode_issue(integer, integer),
  public.barcode_release(integer, integer) to authenticated;

-- ───────────── 게시판 사진 저장소 ─────────────
-- 공개 버킷: 메인페이지가 사진 URL을 그대로 쓴다. 올리기·지우기는 직원만
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 5242880, array['image/webp', 'image/jpeg'])
on conflict (id) do nothing;

create policy "직원 사진 올리기" on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and public.is_staff());
create policy "직원 사진 수정" on storage.objects for update to authenticated
  using (bucket_id = 'post-images' and public.is_staff());
create policy "직원 사진 삭제" on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and public.is_staff());
