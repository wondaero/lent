-- 코드 점검(2026-11-10)에서 찾은 문제 수정

-- 1) 게시판 사진 삭제가 실제로 지워지게: Storage의 remove()는 select 권한도 있어야 동작한다.
--    select 정책이 없으면 오류 없이 아무것도 지우지 않아, 공개 버킷의 사진이 예전 URL로 계속 보였다.
--    (공개 버킷의 사진 보기는 공개 URL로 하므로 이 정책과 무관. 목록 조회만 직원에게 허용)
create policy "직원 사진 조회" on storage.objects for select to authenticated
  using (bucket_id = 'post-images' and public.is_staff());

-- 2) 삭제된 회원도 대출 기록에 member로 나와서 링크가 걸리고, 누르면 "회원을 찾을 수 없습니다"가 떴다.
--    책과 같은 방식으로 deleted 표시를 넣는다(화면은 deleted면 링크 없이 글자만). 컬럼 구성은 그대로
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
  case when m.id is null then null
  when m.deleted_at is not null then
    jsonb_build_object('id', m.id, 'deleted', true, 'name', m.name || ' (삭제된 회원)', 'phone', m.phone, 'member_no', m.member_no, 'loan_days', m.loan_days)
  else
    jsonb_build_object('id', m.id, 'name', m.name, 'phone', m.phone, 'member_no', m.member_no, 'loan_days', m.loan_days)
  end as member
from public.loans l
left join public.books b on b.id = l.book_id
left join public.members m on m.id = l.member_id;

-- 3) 두 PC가 같은 책을 거의 동시에 반납하면 둘 다 처리되던 문제:
--    반납 대상을 고르면서 바로 잠근다(뒤에 온 쪽은 앞쪽이 끝난 뒤 returned_at을 다시 확인 → 빠짐).
--    UPDATE에도 returned_at is null을 넣어 이중으로 막는다. 나머지는 20261108120000과 같음
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
  v_n_ret   int;
begin
  if not public.is_staff() then raise exception '권한이 없습니다.'; end if;

  select coalesce(array_agg(id), '{}') into v_returns
    from (select id from loans
           where id = any(coalesce(p_return_ids, '{}')) and returned_at is null
           order by id
           for update) s;

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
   where id = any(v_returns) and returned_at is null;
  get diagnostics v_n_ret = row_count;
  update books b set status = 'available'
    from loans l where l.id = any(v_returns) and l.book_id = b.id and b.status = 'loaned';

  if v_n_books > 0 then
    insert into loans (book_id, book_reg_no, book_title, member_id, loaned_at, due_at, loan_memo)
      select b.id, b.reg_no, b.title, v_member.id, now(), p_due_at, v_memo from books b where b.id = any(p_book_ids);
    update books set status = 'loaned' where id = any(p_book_ids);
  end if;

  return jsonb_build_object('returned', v_n_ret, 'loaned', v_n_books);
end $$;

-- 4) 도서 수정 화면이 열려 있던 시점의 status로 덮어써서 대출 상태가 틀어지던 문제:
--    '대출중'은 대출/반납 처리(loans_process)만 바꾼다. 직접 수정으로 대출중 ↔ 다른 상태를 오가지 못하게 막는다.
--    (앱도 같은 규칙으로 status를 빼고 보내지만, 다른 경로로도 깨지지 않게 DB에서 한 번 더)
create or replace function public.books_guard_loaned() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status is distinct from old.status
     and (new.status = 'loaned' or old.status = 'loaned') then
    -- 실제 대출 기록과 맞는 변경만 허용(대출 기록이 있으면 loaned, 없으면 loaned가 아니어야 함).
    -- loans_process는 대출 기록을 먼저 바꾼 뒤 책 상태를 바꾸므로 그대로 통과한다
    if (new.status = 'loaned') <> exists (select 1 from loans where book_id = new.id and returned_at is null) then
      new.status := old.status;
      new.hold_reason := old.hold_reason;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists books_guard_loaned on public.books;
create trigger books_guard_loaned before update of status on public.books
  for each row execute function public.books_guard_loaned();
