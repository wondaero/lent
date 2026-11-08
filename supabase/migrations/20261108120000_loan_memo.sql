-- 대출/반납 메모(사용자 결정): 한 번 처리(대출/반납 화면의 [처리하기])에 메모 하나.
--   그때 대출한 책들 → loan_memo, 그때 반납한 책들 → return_memo 로 같은 메모가 들어간다.
--   반납할 때 대출 메모를 보여주기 위해 둘을 나눈다(예: 대출 때 "곤충 도감 반납 불필요", "표지 찢어진 채 대출").
alter table public.loans add column loan_memo text, add column return_memo text;
comment on column public.loans.loan_memo is '대출할 때 남긴 메모(그 회차에 함께 대출한 책들에 같은 메모). 반납할 때 화면에 보여준다';
comment on column public.loans.return_memo is '반납할 때 남긴 메모(그 회차에 함께 반납한 책들에 같은 메모)';

-- loan_list는 l.*를 쓰므로 컬럼이 늘면 다시 만들어야 한다(view의 컬럼 목록은 만들 때 고정됨)
drop view public.loan_list;
create view public.loan_list with (security_invoker = true) as
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
revoke all on public.loan_list from anon;
grant select on public.loan_list to authenticated;

-- 대출/반납 처리에 메모 추가(p_memo). 빈 메모는 저장하지 않는다(기존 메모를 지우지 않게)
drop function if exists public.loans_process(bigint, bigint[], bigint[], timestamptz, date);
create or replace function public.loans_process(
  p_member_id   bigint,
  p_return_ids  bigint[],
  p_book_ids    bigint[],
  p_due_at      timestamptz,
  p_return_date date,
  p_memo        text default null
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
  v_memo    text := nullif(btrim(coalesce(p_memo, '')), '');
begin
  if not public.is_staff() then raise exception '권한이 없습니다.'; end if;

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

  update loans set returned_at = greatest(v_ret_at, loaned_at),
                   return_memo = coalesce(v_memo, return_memo)
   where id = any(v_returns);
  update books b set status = 'available'
    from loans l where l.id = any(v_returns) and l.book_id = b.id and b.status = 'loaned';

  if v_n_books > 0 then
    insert into loans (book_id, book_reg_no, book_title, member_id, loaned_at, due_at, loan_memo)
      select b.id, b.reg_no, b.title, v_member.id, now(), p_due_at, v_memo from books b where b.id = any(p_book_ids);
    update books set status = 'loaned' where id = any(p_book_ids);
  end if;

  return jsonb_build_object('returned', cardinality(v_returns), 'loaned', v_n_books);
end $$;

revoke execute on function public.loans_process(bigint, bigint[], bigint[], timestamptz, date, text) from public, anon;
grant execute on function public.loans_process(bigint, bigint[], bigint[], timestamptz, date, text) to authenticated;
