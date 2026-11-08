-- 화면 목록용 view와 통계 함수. 화면이 기대하는 모양(src/api/mock.js와 같은 반환 형태)을 DB에서 한 번에 만든다.
-- view는 security_invoker → 기본 테이블의 RLS(직원만)가 그대로 적용된다.

-- 오늘 0시(한국시간). 연체 = 반납 예정일(연장일 우선)이 오늘 0시보다 앞
create or replace function public.kst_today() returns timestamptz
language sql stable set search_path = public as $$
  select date_trunc('day', now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul'
$$;

-- 도서 목록: 대출 중이면 loan = { due_at(연장일 우선), member_name }
create or replace view public.book_list with (security_invoker = true) as
select b.*,
  case when l.id is null then null
       else jsonb_build_object('due_at', coalesce(l.extended_due_at, l.due_at), 'member_name', m.name) end as loan
from public.books b
left join public.loans l on l.book_id = b.id and l.returned_at is null
left join public.members m on m.id = l.member_id;
comment on view public.book_list is '도서 + 현재 대출 정보(도서 목록 화면)';

-- 회원 목록: 대출 중·연체 권수. phone_digits = 하이픈 없이 친 전화번호로도 찾기 위함
create or replace view public.member_list with (security_invoker = true) as
select m.*,
  coalesce(s.active, 0)::int as active_loans,
  coalesce(s.overdue, 0)::int as overdue_count,
  regexp_replace(coalesce(m.phone, ''), '\D', '', 'g') as phone_digits
from public.members m
left join (
  select member_id, count(*) as active,
         count(*) filter (where coalesce(extended_due_at, due_at) < public.kst_today()) as overdue
  from public.loans where returned_at is null group by member_id
) s on s.member_id = m.id;
comment on view public.member_list is '회원 + 대출 중·연체 권수(회원 목록·대출 화면)';

-- 대출 기록: book·member를 화면 모양 그대로 JSON으로. 책이 삭제됐으면 대출 당시 등록번호·서명으로 "(삭제된 도서)"
-- search_* · member_name은 검색 조건용(책 제목·등록번호·회원 이름으로 찾기)
create or replace view public.loan_list with (security_invoker = true) as
select l.*,
  (l.returned_at is null and coalesce(l.extended_due_at, l.due_at) < public.kst_today()) as overdue,
  coalesce(b.reg_no, l.book_reg_no) as search_reg_no,
  coalesce(b.title, l.book_title) as search_title,
  m.name as member_name,
  case when b.id is not null then
    jsonb_build_object('id', b.id, 'reg_no', b.reg_no, 'title', b.title, 'author', b.author, 'class_no', b.class_no, 'author_mark', b.author_mark)
  else
    jsonb_build_object('id', null, 'deleted', true, 'reg_no', l.book_reg_no,
      'title', case when l.book_title is null then '(삭제된 도서)' else l.book_title || ' (삭제된 도서)' end,
      'author', '', 'class_no', '', 'author_mark', '')
  end as book,
  case when m.id is null then null else
    jsonb_build_object('id', m.id, 'name', m.name, 'phone', m.phone, 'member_no', m.member_no, 'loan_days', m.loan_days)
  end as member
from public.loans l
left join public.books b on b.id = l.book_id
left join public.members m on m.id = l.member_id;
comment on view public.loan_list is '대출 기록 + 도서·회원(대출 기록·대출/반납·회원 대출이력 화면)';

-- 대시보드 숫자 카드 + 분류별 장서(KDC 주류 0~9)
create or replace function public.dashboard_stats() returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'totalBooks', (select count(*) from books),
    'loanedBooks', (select count(*) from books where status = 'loaned'),
    'overdueLoans', (select count(*) from loans where returned_at is null and coalesce(extended_due_at, due_at) < kst_today()),
    'unprintedLabels', (select count(*) from books where not spine_label_printed),
    'totalMembers', (select count(*) from members where deleted_at is null),
    'todayLoans', (select count(*) from loans where loaned_at >= kst_today()),
    'todayReturns', (select count(*) from loans where returned_at >= kst_today()),
    'category', (
      select jsonb_agg(coalesce(c.n, 0) order by d.k)
      from generate_series(0, 9) as d(k)
      left join (select left(class_no, 1) as k, count(*) as n from books where class_no ~ '^[0-9]' group by 1) c
        on c.k = d.k::text
    )
  )
$$;

-- 기간별 대출·반납 건수의 재료: p_from(한국 날짜)부터 날짜별 건수(활동 있는 날만). 일/주/월 묶음은 화면 쪽에서
create or replace function public.loan_daily_counts(p_from date)
returns table (day date, loans integer, returns integer)
language sql stable security invoker set search_path = public as $$
  select d, sum(a)::int, sum(r)::int from (
    select (loaned_at at time zone 'Asia/Seoul')::date as d, 1 as a, 0 as r from loans where loaned_at >= p_from - 1
    union all
    select (returned_at at time zone 'Asia/Seoul')::date, 0, 1 from loans where returned_at >= p_from - 1
  ) x
  where d >= p_from
  group by d
  order by d
$$;

revoke all on public.book_list, public.member_list, public.loan_list from anon;
grant select on public.book_list, public.member_list, public.loan_list to authenticated;
revoke execute on function public.kst_today(), public.dashboard_stats(), public.loan_daily_counts(date) from public, anon;
grant execute on function public.kst_today(), public.dashboard_stats(), public.loan_daily_counts(date) to authenticated;
