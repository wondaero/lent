-- "등록중" 상태(2026-11-14 사용자 결정): 도서 등록은 했지만 청구기호 라벨을 아직 출력하지 않은 책은 대출할 수 없다.
--   status 값을 새로 만들지 않고 spine_label_printed = false 인 'available' 책을 "등록중"으로 본다
--   → 라벨 출력 화면에서 [잘 나왔어요]를 누르면 저절로 대출가능이 된다(직원이 상태를 따로 바꿀 일 없음).
--   화면 표시는 앱(bookStatusKey)이 하고, 여기서는 대출 처리를 막고 메인 공개 상태에 반영한다.

comment on column public.books.spine_label_printed is
  '청구기호 라벨(책등)을 출력했는지. 등록하면 false → 라벨 출력 화면의 미출력 목록에 쌓임. false인 대출가능 책은 "등록중"으로 보이고 대출할 수 없다';

-- 1) 대출 처리: 라벨 미출력(등록중) 책은 거부. 나머지는 20261110120000_review_fixes.sql과 같다
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
     where b.id is null or (b.status <> 'available' and l.id is null) or not b.spine_label_printed
     limit 1;
    if found then raise exception '"%"은(는) 대출할 수 없는 상태입니다(등록중이면 청구기호 라벨을 먼저 출력하세요).', v_bad; end if;
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

-- 2) 메인 공개 도서 정보: 등록중이면 status = 'registering'
create or replace function public.public_book_json(b public.books) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', b.id, 'reg_no', b.reg_no, 'title', b.title, 'series_title', b.series_title,
    'author', b.author, 'publisher', b.publisher, 'pub_year', b.pub_year,
    'class_no', b.class_no, 'author_mark', b.author_mark, 'volume', b.volume, 'copy_no', b.copy_no,
    'status', case when b.status = 'available' and not b.spine_label_printed then 'registering' else b.status end,
    'created_at', b.created_at,
    'due_on', case when b.status = 'loaned' then (
      select (coalesce(l.extended_due_at, l.due_at) at time zone 'Asia/Seoul')::date
      from loans l where l.book_id = b.id and l.returned_at is null
      order by l.loaned_at desc limit 1) end
  )
$$;
revoke execute on function public.public_book_json(public.books) from public, anon, authenticated;
